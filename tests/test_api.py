"""REST API for automations / voice assistants (Home Assistant)."""
import db
from conftest import make_esp, make_item


def test_find_returns_item_and_lights_it(client, wled):
    make_esp()
    item_id = make_item(name='Resistor 10k', position='[7]', quantity=2,
                        article_number='R10K', storage_location='A02.014')
    resp = client.get('/api/find?q=resistor')
    assert resp.status_code == 200
    body = resp.get_json()
    assert body == {
        'item_number': item_id, 'item_name': 'Resistor 10k', 'quantity': 2, 'bin_number': [7],
        'article_number': 'R10K', 'storage_location': 'A02.014', 'box': 'Box', 'link': '',
        'located': True,
    }
    assert [index for index, _ in wled.lit()] == [6]


def test_find_item_alias_and_locate_false(client, wled):
    make_esp()
    make_item(name='Fuse 2A')
    resp = client.get('/api/findItem?q=fuse&locate=false')
    assert resp.status_code == 200
    assert 'located' not in resp.get_json()
    assert wled.calls == []


def test_find_by_barcode(client, wled):
    make_esp()
    make_item(name='Something', article_number='4006381333931')
    resp = client.get('/api/find?q=4006381333931')
    assert resp.get_json()['item_name'] == 'Something'


def test_find_errors(client, wled):
    assert client.get('/api/find').status_code == 400
    assert client.get('/api/find?q=nothing').status_code == 404


def test_find_reports_missing_esp_without_failing(client, wled):
    make_item(name='Orphan', ip='10.1.1.1')
    body = client.get('/api/find?q=orphan').get_json()
    assert body['located'] is False
    assert 'locate_error' in body


def test_search_lists_matches_without_lighting(client, wled):
    make_esp()
    make_item(name='Resistor 10k')
    make_item(name='Resistor 1k')
    make_item(name='LED red')
    resp = client.get('/api/search?q=resistor')
    assert sorted(i['item_name'] for i in resp.get_json()) == ['Resistor 10k', 'Resistor 1k']
    assert len(client.get('/api/search?q=resistor&limit=1').get_json()) == 1
    assert wled.calls == []


def test_locate_endpoint(client, wled):
    make_esp()
    item_id = make_item(position='[2]')
    assert client.post(f'/api/items/{item_id}/locate').status_code == 200
    assert [index for index, _ in wled.lit()] == [1]
    assert client.post('/api/items/999/locate').status_code == 404


def test_quantity_set_and_delta(client):
    item_id = make_item(quantity=5)
    assert client.post(f'/api/items/{item_id}/quantity', json={'delta': 3}).get_json()['quantity'] == 8
    assert client.put(f'/api/items/{item_id}/quantity', json={'quantity': 2}).get_json()['quantity'] == 2
    assert client.post(f'/api/items/{item_id}/quantity', json={'delta': -10}).get_json()['quantity'] == 0
    assert db.get_item(item_id)['quantity'] == 0


def test_quantity_validation(client):
    item_id = make_item()
    assert client.post(f'/api/items/{item_id}/quantity', json={}).status_code == 400
    assert client.post(f'/api/items/{item_id}/quantity', json={'delta': 'lots'}).status_code == 400
    assert client.post('/api/items/999/quantity', json={'delta': 1}).status_code == 404


def test_add_item_by_item_number_or_article_number(client):
    item_id = make_item(quantity=1, article_number='ABC-1')
    assert client.post('/api/addItem', json={'item_number': item_id, 'quantity': 3}).get_json()['quantity'] == 4
    assert client.post('/api/addItem', json={'article_number': 'abc-1', 'delta': -1}).get_json()['quantity'] == 3
    assert client.post('/api/quantity', json={'article_number': 'ABC-1', 'set_quantity': 10}).get_json()['quantity'] == 10
    assert client.post('/api/addItem', json={'article_number': 'nope'}).status_code == 404


def test_items_crud_keeps_new_fields(client):
    payload = {'name': 'Diode', 'link': '', 'image': '', 'position': '[1]', 'quantity': 1, 'ip': '10.0.0.5',
               'tags': '[]', 'article_number': '1N4148', 'storage_location': 'B1'}
    item_id = client.post('/api/items', json=payload).get_json()['id']
    payload['storage_location'] = 'B2'
    client.put(f'/api/items/{item_id}', json=payload)
    item = client.get(f'/api/items/{item_id}').get_json()
    assert item['article_number'] == '1N4148'
    assert item['storage_location'] == 'B2'


def test_esp_api_saves_layout_and_colours(client):
    resp = client.post('/api/esp/', json={
        'name': 'Box', 'esp_ip': '10.0.0.5', 'rows': 7, 'cols': 6, 'startTop': 'Top', 'startLeft': 'Left',
        'serpentineDirection': 'Horizontal', 'rowLayout': '6,6,6,6,6,3,3', 'locateColors': ['#00ff00', '#ff0000'],
    })
    assert resp.status_code == 201
    esp = client.get('/api/esp/').get_json()[0]
    assert esp['row_layout'] == '6,6,6,6,6,3,3'
    assert db.parse_colors(esp['locate_colors']) == ['#00ff00', '#ff0000']
