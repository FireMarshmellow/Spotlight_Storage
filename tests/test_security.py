"""Security hardening: auth token, CSRF, headers, uploads, SSRF, input validation."""
import io
import json
import threading
import time

import pytest

import app as app_module
import db
import security
from conftest import make_esp, make_item

# Captured before the autouse fixture swaps them for inline versions
REAL_SUBMIT_LOCATE = app_module.submit_locate
REAL_WAIT_OR_INTERRUPT = app_module.wait_or_interrupt

PNG = b'\x89PNG\r\n\x1a\n' + b'\x00' * 32


# --------------------------------------------------------------------- token

def test_api_is_open_when_no_token_configured(client):
    assert client.get('/api/items').status_code == 200


def test_token_required_when_configured(client, monkeypatch):
    monkeypatch.setenv('SPOTLIGHT_API_TOKEN', 's3cret')
    assert client.get('/api/items').status_code == 401
    assert client.get('/api/items', headers={'X-API-Key': 'wrong'}).status_code == 401
    assert client.get('/api/items', headers={'X-API-Key': 's3cret'}).status_code == 200
    assert client.get('/api/items', headers={'Authorization': 'Bearer s3cret'}).status_code == 200
    assert client.post('/led/off').status_code == 401
    assert client.post('/upload').status_code == 401
    assert client.get('/proxy-image?url=http://example.com/a.png').status_code == 401
    # The page itself and static files stay reachable (the page asks for the token)
    assert client.get('/').status_code == 200
    assert client.get('/static/api.js').status_code == 200


# ---------------------------------------------------------------------- CSRF

def test_cross_site_writes_are_blocked(client):
    evil = {'Origin': 'http://evil.example'}
    backup = {'format': 'spotlight-storage-backup', 'version': 1, 'items': []}
    assert client.post('/api/import?mode=replace&confirm=replace', json=backup, headers=evil).status_code == 403
    assert client.post('/api/items', json={'name': 'x'}, headers=evil).status_code == 403
    assert client.post('/api/items', json={'name': 'x'}, headers={'Origin': 'null'}).status_code == 403
    assert client.post('/led/party', headers={'Sec-Fetch-Site': 'cross-site'}).status_code == 403


def test_cross_site_state_changing_gets_are_blocked(client):
    make_item(name='Resistor')
    assert client.get('/api/find?q=resistor&locate=false', headers={'Sec-Fetch-Site': 'cross-site'}).status_code == 403
    assert client.get('/api/export', headers={'Sec-Fetch-Site': 'cross-site'}).status_code == 403
    # Read-only listing from another site is not blocked by this check (CORS hides the response)
    assert client.get('/api/items', headers={'Sec-Fetch-Site': 'cross-site'}).status_code == 200


def test_same_origin_and_non_browser_clients_are_allowed(client):
    payload = {'name': 'Diode', 'link': '', 'image': '', 'position': '[1]', 'quantity': 1, 'ip': '10.0.0.5', 'tags': '[]'}
    assert client.post('/api/items', json=payload, headers={'Origin': 'http://localhost'}).status_code == 200
    assert client.post('/api/items', json=payload, headers={'Sec-Fetch-Site': 'same-origin'}).status_code == 200
    assert client.post('/api/items', json=payload).status_code == 200   # Home Assistant / curl


def test_allowed_hosts(client, monkeypatch):
    monkeypatch.setenv('SPOTLIGHT_ALLOWED_HOSTS', 'spotlight.local')
    assert client.get('/api/items', headers={'Host': 'attacker.example'}).status_code == 400
    assert client.get('/api/items', headers={'Host': 'spotlight.local:5000'}).status_code == 200


# ------------------------------------------------------------------- headers

def test_security_headers(client):
    resp = client.get('/')
    csp = resp.headers['Content-Security-Policy']
    script_src = next(part for part in csp.split(';') if part.strip().startswith('script-src'))
    assert "'unsafe-inline'" not in script_src and "'unsafe-eval'" not in script_src
    assert "frame-ancestors 'none'" in csp and "object-src 'none'" in csp
    assert resp.headers['X-Content-Type-Options'] == 'nosniff'
    assert resp.headers['X-Frame-Options'] == 'DENY'


def test_page_has_no_inline_scripts_and_pinned_cdn_assets(client):
    html = client.get('/').get_data(as_text=True)
    assert '<script>' not in html and 'onclick=' not in html
    assert '@latest' not in html
    import re
    for tag in re.findall(r'<(?:script|link)[^>]+(?:src|href)="https://[^"]+"[^>]*>', html):
        assert 'integrity="sha384-' in tag, tag


# ------------------------------------------------------------------- uploads

def _upload(client, data, name='photo.png'):
    return client.post('/upload', data={'file': (io.BytesIO(data), name)}, content_type='multipart/form-data')


def test_upload_accepts_images_with_random_names(client, tmp_path, monkeypatch):
    monkeypatch.setitem(app_module.app.config, 'UPLOAD_FOLDER', str(tmp_path / 'images'))
    first = _upload(client, PNG, 'cat.png').get_data(as_text=True)
    second = _upload(client, PNG, 'cat.png').get_data(as_text=True)
    assert first.startswith('/images/') and first.endswith('.png')
    assert first != second                                   # never overwrites
    assert client.get(first).status_code == 200


def test_upload_type_comes_from_content_not_name(client, tmp_path, monkeypatch):
    monkeypatch.setitem(app_module.app.config, 'UPLOAD_FOLDER', str(tmp_path / 'images'))
    assert _upload(client, b'<html><script>alert(1)</script></html>', 'x.png').status_code == 400
    assert _upload(client, b'<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>', 'x.svg').status_code == 400
    assert _upload(client, PNG, 'evil.html').get_data(as_text=True).endswith('.png')
    assert client.post('/upload', data={}, content_type='multipart/form-data').status_code == 400


def test_upload_size_limit(client, monkeypatch):
    monkeypatch.setitem(app_module.app.config, 'MAX_CONTENT_LENGTH', 1024)
    resp = _upload(client, PNG + b'\x00' * 4096)
    assert resp.status_code == 413
    assert 'error' in resp.get_json()


# ---------------------------------------------------------------------- SSRF

class FakeResponse:
    def __init__(self, status=200, headers=None, body=b''):
        self.status_code = status
        self.headers = headers or {}
        self._body = body

    def iter_content(self, size):
        for i in range(0, len(self._body), size):
            yield self._body[i:i + size]

    def close(self):
        pass


@pytest.fixture
def fake_net(monkeypatch):
    """Fake DNS + HTTP for the image proxy."""
    dns = {'images.example': '93.184.216.34', 'evil.example': '192.168.1.1',
           '127.0.0.1': '127.0.0.1', '169.254.169.254': '169.254.169.254'}
    responses = {}

    monkeypatch.setattr(security, '_resolve', lambda host: {dns[host]} if host in dns else set())

    def fake_get(url, **kwargs):
        assert kwargs.get('timeout') and kwargs.get('allow_redirects') is False and kwargs.get('stream')
        return responses[url]

    monkeypatch.setattr(security.requests, 'get', fake_get)
    return responses


def test_proxy_serves_public_images(client, fake_net):
    fake_net['http://images.example/a.png'] = FakeResponse(headers={'Content-Type': 'image/png'}, body=PNG)
    resp = client.get('/proxy-image?url=http://images.example/a.png')
    assert resp.status_code == 200 and resp.data == PNG and resp.content_type == 'image/png'


@pytest.mark.parametrize('url,status', [
    ('http://evil.example/router', 403),            # private address
    ('http://127.0.0.1:5000/api/export', 403),       # loopback literal
    ('http://169.254.169.254/latest/meta-data', 403),  # link-local / cloud metadata
    ('http://unknown.example/x.png', 403),           # does not resolve
    ('file:///etc/passwd', 400),
    ('ftp://images.example/a.png', 400),
    ('http://user:pw@images.example/a.png', 400),
    ('', 400),
])
def test_proxy_blocks_dangerous_targets(client, fake_net, url, status):
    assert client.get('/proxy-image', query_string={'url': url}).status_code == status


def test_proxy_rechecks_redirect_targets(client, fake_net):
    fake_net['http://images.example/a.png'] = FakeResponse(302, {'Location': 'http://evil.example/admin'})
    assert client.get('/proxy-image?url=http://images.example/a.png').status_code == 403


def test_proxy_rejects_non_images_and_svg(client, fake_net):
    fake_net['http://images.example/page'] = FakeResponse(headers={'Content-Type': 'text/html'}, body=b'<script>')
    fake_net['http://images.example/x.svg'] = FakeResponse(headers={'Content-Type': 'image/svg+xml'}, body=b'<svg/>')
    assert client.get('/proxy-image?url=http://images.example/page').status_code == 415
    assert client.get('/proxy-image?url=http://images.example/x.svg').status_code == 415


def test_proxy_limits_size(client, fake_net, monkeypatch):
    monkeypatch.setattr(security, 'MAX_PROXY_IMAGE_BYTES', 100)
    fake_net['http://images.example/big.png'] = FakeResponse(headers={'Content-Type': 'image/png'}, body=PNG * 10)
    assert client.get('/proxy-image?url=http://images.example/big.png').status_code == 413


# ------------------------------------------------------- WLED / ESP addresses

@pytest.mark.parametrize('value,expected', [
    ('192.168.1.50', '192.168.1.50'),
    (' 10.0.0.5 ', '10.0.0.5'),
    ('WLED-Box.local', 'wled-box.local'),
    ('fe80::1', 'fe80::1'),
    ('1.2.3.4@evil.example', None),
    ('evil.example/path', None),
    ('10.0.0.5:8080', None),
    ('http://10.0.0.5', None),
    ('999.1.1.1', None),
    ('', None),
    (None, None),
])
def test_normalize_device_host(value, expected):
    assert security.normalize_device_host(value) == expected


def test_esp_api_rejects_crafted_addresses(client):
    payload = {'name': 'Box', 'rows': 2, 'cols': 2, 'startTop': 'Top', 'startLeft': 'Left',
               'serpentineDirection': 'Horizontal'}
    assert client.post('/api/esp/', json={**payload, 'esp_ip': '1.2.3.4@evil.example'}).status_code == 400
    assert client.post('/api/esp/', json={**payload, 'esp_ip': '10.0.0.5', 'rows': 0}).status_code == 400
    assert client.post('/api/esp/', json={**payload, 'esp_ip': 'wled.local'}).status_code == 201
    esp_id = db.read_esp()[0]['id']
    assert client.put(f'/api/esp/{esp_id}', json={**payload, 'esp_ip': 'a/b'}).status_code == 400


def test_items_only_contact_configured_esps(client, wled):
    item_id = make_item(ip='8.8.8.8')                    # not a configured ESP
    assert client.post(f'/api/items/{item_id}', data={'action': 'locate'}).status_code == 404
    assert wled.calls == []


def test_test_lights_only_targets_configured_esps(client, wled):
    make_esp(ip='10.0.0.5')
    assert client.post('/test_lights', json={'8.8.8.8': [1]}).status_code == 404
    assert client.post('/test_lights', json={'10.0.0.5': ['1']}).status_code == 400
    assert client.post('/test_lights', json={'10.0.0.5': [1, 2]}).status_code == 200
    assert [index for index, _ in wled.lit()] == [0, 1]
    assert wled.calls and all(ip == '10.0.0.5' for ip, _ in wled.calls)


def test_wled_calls_refuse_invalid_hosts_and_have_timeouts(monkeypatch):
    seen = []
    monkeypatch.setattr(app_module.requests, 'post', lambda url, **kw: seen.append((url, kw)))
    monkeypatch.setattr(app_module.requests, 'get', lambda url, **kw: seen.append((url, kw)) or (_ for _ in ()).throw(
        app_module.requests.RequestException('offline')))
    app_module.send_request('1.2.3.4@evil.example', {})
    assert seen == []
    assert app_module.get_total_leds('10.0.0.5') == 1000
    assert seen[-1][1].get('timeout')


# ------------------------------------------------------------ item validation

def _item(**overrides):
    item = {'name': 'Part', 'link': '', 'image': '', 'position': '[1]', 'quantity': 1, 'ip': '10.0.0.5', 'tags': '[]'}
    item.update(overrides)
    return item


@pytest.mark.parametrize('overrides', [
    {'link': 'javascript:alert(1)'},
    {'link': 'data:text/html,<script>alert(1)</script>'},
    {'image': 'javascript:alert(1)'},
    {'image': '//evil.example/x.png'},
    {'quantity': '<img src=x onerror=alert(1)>'},
    {'name': ''},
])
def test_item_api_rejects_unsafe_values(client, overrides):
    assert client.post('/api/items', json=_item(**overrides)).status_code == 400


def test_item_api_accepts_normal_values(client):
    resp = client.post('/api/items', json=_item(link='https://shop.example/p', image='/images/abc.png', quantity='3'))
    assert resp.status_code == 200
    item_id = resp.get_json()['id']
    assert db.get_item(item_id)['quantity'] == 3
    bad = client.put(f'/api/items/{item_id}', json={'quantity': 'lots'}, headers={'Update-Quantity': 'true'})
    assert bad.status_code == 400
    bad_image = client.put(f'/api/items/{item_id}', json={'image': 'javascript:x'}, headers={'Update-Image': 'true'})
    assert bad_image.status_code == 400


def test_settings_are_validated(client):
    good = {'brightness': 150, 'timeout': 5, 'lightMode': 'dark', 'colors': ['#000000', '#ffffff'], 'language': 'en'}
    assert client.post('/api/settings', json=good).status_code == 200
    assert db.read_settings()['brightness'] == 100                       # clamped
    assert client.post('/api/settings', json={**good, 'colors': ['red']}).status_code == 400
    assert client.post('/api/settings', json={**good, 'timeout': 'x'}).status_code == 400


# -------------------------------------------------------------------- import

def test_import_replace_requires_confirmation(client):
    make_item(name='Keep me')
    backup = {'format': 'spotlight-storage-backup', 'version': 1, 'items': []}
    assert client.post('/api/import?mode=replace', json=backup).status_code == 400
    assert [i['name'] for i in db.read_items()] == ['Keep me']


def test_import_sanitises_links_and_rejects_bad_addresses(client):
    backup = {'format': 'spotlight-storage-backup', 'version': 1, 'items': [
        {'name': 'Evil', 'link': 'javascript:alert(1)', 'image': 'javascript:alert(2)', 'quantity': 1}]}
    assert client.post('/api/import', json=backup).status_code == 200
    item = db.read_items()[0]
    assert item['link'] == '' and item['image'] == ''
    bad_esp = {'format': 'spotlight-storage-backup', 'version': 1, 'esps': [{'name': 'x', 'esp_ip': '1.2.3.4@evil'}]}
    assert client.post('/api/import', json=bad_esp).status_code == 400


# --------------------------------------------------------- state-changing GETs

def test_led_routes_are_post_only(client, wled):
    make_esp()
    for state in ('on', 'off', 'party'):
        assert client.get(f'/led/{state}').status_code == 405
        assert client.post(f'/led/{state}').status_code == 200
    assert client.get('/api/items/1/locate').status_code == 405


def test_find_also_accepts_post(client, wled):
    make_esp()
    make_item(name='Fuse', position='[4]')
    resp = client.post('/api/find', json={'q': 'fuse'})
    assert resp.status_code == 200 and resp.get_json()['item_name'] == 'Fuse'
    assert [index for index, _ in wled.lit()] == [3]


def test_search_limit_is_capped(client):
    for n in range(120):
        make_item(name=f'Resistor {n}')
    assert len(client.get('/api/search?q=resistor&limit=100000').get_json()) == 100


# ------------------------------------------------------------- LED worker / DoS

def test_full_locate_queue_returns_429(client, monkeypatch):
    make_esp()
    item_id = make_item()
    monkeypatch.setattr(app_module, 'submit_locate', lambda func, *args: False)
    assert client.post(f'/api/items/{item_id}/locate').status_code == 429
    assert client.post(f'/api/items/{item_id}', data={'action': 'locate'}).status_code == 429


def test_real_worker_runs_jobs_one_at_a_time_and_bounds_the_queue():
    release = threading.Event()
    started = threading.Event()
    done = []

    def blocking_job():
        started.set()
        release.wait(5)
        done.append('blocking')

    assert REAL_SUBMIT_LOCATE(blocking_job)
    assert started.wait(5)
    # Worker is busy: the queue accepts LOCATE_QUEUE_SIZE more jobs, then refuses
    accepted = [REAL_SUBMIT_LOCATE(done.append, n) for n in range(app_module.LOCATE_QUEUE_SIZE)]
    assert all(accepted)
    assert REAL_SUBMIT_LOCATE(done.append, 'overflow') is False
    release.set()
    app_module._locate_queue.join()
    assert done == ['blocking'] + list(range(app_module.LOCATE_QUEUE_SIZE))


def test_new_job_interrupts_the_stay_lit_timeout():
    finished = []
    app_module._new_job.clear()
    waiter = threading.Thread(target=lambda: (REAL_WAIT_OR_INTERRUPT(10), finished.append(time.monotonic())))
    start = time.monotonic()
    waiter.start()
    time.sleep(0.1)
    assert REAL_SUBMIT_LOCATE(lambda: None)
    waiter.join(5)
    app_module._locate_queue.join()
    assert finished and finished[0] - start < 5
