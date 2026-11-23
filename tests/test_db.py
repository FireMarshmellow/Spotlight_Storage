"""Database behaviour: migrations, ESP swaps, new item/ESP fields."""
import sqlite3

import db
from conftest import make_esp, make_item


def _esp_payload(**overrides):
    payload = {'name': 'Box', 'esp_ip': '10.0.0.5', 'rows': 9, 'cols': 5, 'startTop': 'Top',
               'startLeft': 'Left', 'serpentineDirection': 'Horizontal'}
    payload.update(overrides)
    return payload


def test_changing_esp_ip_moves_its_items_along():
    esp_id = make_esp(ip='10.0.0.5')
    item_id = make_item(ip='10.0.0.5')
    other_id = make_item(ip='10.0.0.99')
    db.update_esp_settings(esp_id, _esp_payload(esp_ip='10.0.0.9'))
    assert db.get_item(item_id)['ip'] == '10.0.0.9'
    assert db.get_item(other_id)['ip'] == '10.0.0.99'


def test_renaming_esp_updates_items_that_reference_it_by_name():
    esp_id = make_esp(name='Old')
    item_id = make_item(ip='Old')
    db.update_esp_settings(esp_id, _esp_payload(name='New'))
    assert db.get_item(item_id)['ip'] == 'New'


def test_unchanged_esp_update_leaves_items_alone():
    esp_id = make_esp()
    item_id = make_item()
    db.update_esp_settings(esp_id, _esp_payload(rows=3))
    assert db.get_item(item_id)['ip'] == '10.0.0.5'


def test_migration_adds_new_columns_to_an_old_database(tmp_path, monkeypatch):
    path = tmp_path / 'old' / 'combined_data.db'
    path.parent.mkdir()
    conn = sqlite3.connect(path)
    conn.execute('CREATE TABLE items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, link TEXT, image TEXT, '
                 'position TEXT, quantity INTEGER, ip TEXT, tags TEXT)')
    conn.execute('CREATE TABLE esp (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, esp_ip TEXT, rows INTEGER, '
                 'cols INTEGER, start_top TEXT, start_left TEXT, serpentine_direction TEXT)')
    conn.execute("INSERT INTO items (name, position, quantity, ip, tags) VALUES ('Old item', '[1]', 1, 'x', '[]')")
    conn.commit()
    conn.close()

    monkeypatch.setattr(db, 'COMBINED_DATABASE', str(path))
    item = db.read_items()[0]
    assert item['name'] == 'Old item'
    assert item['article_number'] == '' and item['storage_location'] == ''
    esp_columns = [row[1] for row in sqlite3.connect(path).execute('PRAGMA table_info(esp)')]
    assert 'row_layout' in esp_columns and 'locate_colors' in esp_columns


def test_item_article_number_and_location_round_trip():
    item_id = make_item(article_number='4006381333931', storage_location='A02.014')
    item = db.get_item(item_id)
    assert item['article_number'] == '4006381333931'
    assert item['storage_location'] == 'A02.014'


def test_legacy_item_payload_without_new_fields_still_works():
    item_id = db.write_item({'name': 'x', 'link': '', 'image': '', 'position': '[1]', 'quantity': 1,
                             'ip': '10.0.0.5', 'tags': '[]'})
    db.update_item(item_id, {'name': 'y', 'link': '', 'image': '', 'position': '[1]', 'quantity': 1,
                             'ip': '10.0.0.5', 'tags': '[]'})
    assert db.get_item(item_id)['name'] == 'y'


def test_row_layout_is_normalised():
    assert db.normalize_row_layout(' 6, 6 ;3,,x,0,-2 ') == '6,6,3'
    assert db.normalize_row_layout('') == ''
    assert db.parse_row_layout('6,3') == [6, 3]
    assert db.parse_row_layout(None) == []


def test_locate_colours_are_validated():
    assert db.parse_colors(['#00ff00', 'red', '#12345', '#FF0000']) == ['#00ff00', '#FF0000']
    assert db.parse_colors('["#00ff00"]') == ['#00ff00']
    assert db.parse_colors('') == []
    assert db.parse_colors({'not': 'a list'}) == []


def test_esp_stores_layout_and_colours():
    make_esp(row_layout='6,6,6,6,6,3,3', locate_colors=['#00ff00', '#ff0000'])
    esp = db.get_esp_settings_by_ip('10.0.0.5')
    assert esp['row_layout'] == '6,6,6,6,6,3,3'
    assert db.parse_colors(esp['locate_colors']) == ['#00ff00', '#ff0000']


def test_search_ranking():
    make_item(name='Resistor 10k', article_number='R10K')
    make_item(name='Resistor 1k')
    make_item(name='Capacitor 100nF', storage_location='A02.014')
    make_item(name='M3 screws', tags='["hardware"]')

    assert db.search_items('R10K')[0]['name'] == 'Resistor 10k'          # exact article number
    assert db.search_items('resistor 1k')[0]['name'] == 'Resistor 1k'    # exact name
    assert db.search_items('A02.014')[0]['name'] == 'Capacitor 100nF'    # storage location
    assert db.search_items('hardware')[0]['name'] == 'M3 screws'         # tag
    assert db.search_items('capacitr')[0]['name'] == 'Capacitor 100nF'   # fuzzy / typo
    assert db.search_items('zzzzzz') == []
    assert db.search_items('   ') == []
