"""Settings / data export and import."""
import io
import json

import db
from conftest import make_esp, make_item


def _populate():
    db.update_settings({'brightness': 40, 'timeout': 12, 'lightMode': 'dark',
                        'colors': ['#111111', '#222222'], 'language': 'de'})
    make_esp(name='Box', ip='10.0.0.5', row_layout='6,3', locate_colors=['#00ff00', '#ff0000'])
    make_item(name='Resistor', position='[1, 2]', quantity=4, article_number='R1', storage_location='A1',
              tags='["passive"]')


def test_export_contains_all_sections(client):
    _populate()
    resp = client.get('/api/export')
    assert resp.status_code == 200
    assert 'attachment' in resp.headers['Content-Disposition']
    data = json.loads(resp.data)
    assert data['format'] == 'spotlight-storage-backup' and data['version'] == 1
    assert data['settings']['brightness'] == 40 and data['settings']['colors'] == ['#111111', '#222222']
    assert data['esps'][0]['row_layout'] == '6,3'
    assert data['esps'][0]['locate_colors'] == ['#00ff00', '#ff0000']
    assert data['items'][0]['article_number'] == 'R1'
    assert 'id' not in data['items'][0]


def test_export_selected_sections_only(client):
    _populate()
    data = json.loads(client.get('/api/export?include=settings').data)
    assert 'settings' in data and 'esps' not in data and 'items' not in data
    assert client.get('/api/export?include=passwords').status_code == 400


def test_round_trip_into_empty_database(client, tmp_path, monkeypatch):
    _populate()
    backup = json.loads(client.get('/api/export').data)

    monkeypatch.setattr(db, 'COMBINED_DATABASE', str(tmp_path / 'other' / 'combined_data.db'))
    resp = client.post('/api/import?mode=replace&confirm=replace', json=backup)
    assert resp.status_code == 200
    assert resp.get_json()['esps_added'] == 1 and resp.get_json()['items_added'] == 1

    settings = db.read_settings()
    assert settings['brightness'] == 40 and settings['language'] == 'de'
    assert settings['colors'] == ['#111111', '#222222']
    esp = db.read_esp()[0]
    assert esp['row_layout'] == '6,3' and db.parse_colors(esp['locate_colors']) == ['#00ff00', '#ff0000']
    item = db.read_items()[0]
    assert (item['name'], item['quantity'], item['article_number'], item['position']) == ('Resistor', 4, 'R1', '[1, 2]')


def test_merge_updates_instead_of_duplicating(client):
    _populate()
    backup = json.loads(client.get('/api/export').data)
    backup['items'][0]['quantity'] = 99
    backup['items'].append({'name': 'New part', 'position': [3], 'quantity': 1, 'ip': '10.0.0.5'})

    stats = client.post('/api/import', json=backup).get_json()
    assert stats['mode'] == 'merge'
    assert (stats['items_updated'], stats['items_added'], stats['esps_updated']) == (1, 1, 1)
    items = {i['name']: i for i in db.read_items()}
    assert items['Resistor']['quantity'] == 99
    assert items['New part']['position'] == '[3]'
    assert len(db.read_esp()) == 1


def test_replace_removes_existing_data(client):
    _populate()
    make_item(name='To be removed')
    backup = {'format': 'spotlight-storage-backup', 'version': 1,
              'items': [{'name': 'Only item', 'position': '[1]', 'quantity': 1, 'ip': '10.0.0.5'}]}
    client.post('/api/import?mode=replace&confirm=replace', json=backup)
    assert [i['name'] for i in db.read_items()] == ['Only item']
    assert len(db.read_esp()) == 1  # esps section absent -> untouched


def test_import_via_file_upload(client):
    _populate()
    backup = client.get('/api/export').data
    resp = client.post('/api/import?mode=merge', data={'file': (io.BytesIO(backup), 'backup.json')},
                       content_type='multipart/form-data')
    assert resp.status_code == 200


def test_invalid_imports_are_rejected_and_change_nothing(client):
    _populate()
    bad_inputs = [
        {'format': 'something-else', 'version': 1},
        {'format': 'spotlight-storage-backup', 'version': 99},
        {'format': 'spotlight-storage-backup', 'version': 1, 'items': 'nope'},
        {'format': 'spotlight-storage-backup', 'version': 1, 'esps': [{'name': 'no ip'}]},
        # Second item has a bad quantity: the whole import must roll back
        {'format': 'spotlight-storage-backup', 'version': 1,
         'items': [{'name': 'ok', 'quantity': 1}, {'name': 'bad', 'quantity': 'many'}]},
    ]
    for bad in bad_inputs:
        assert client.post('/api/import?mode=replace&confirm=replace', json=bad).status_code == 400, bad
    assert [i['name'] for i in db.read_items()] == ['Resistor']
    assert client.post('/api/import?mode=wipe', json={'format': 'spotlight-storage-backup', 'version': 1}).status_code == 400
    resp = client.post('/api/import', data={'file': (io.BytesIO(b'not json'), 'x.json')},
                       content_type='multipart/form-data')
    assert resp.status_code == 400
