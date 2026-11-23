"""LED number -> WLED strip index mapping and lighting behaviour."""
import app as app_module
import db
from conftest import make_esp, make_item


def esp_dict(**overrides):
    esp = {'rows': 9, 'cols': 5, 'start_top': 'Top', 'start_left': 'Left',
           'serpentine_direction': 'Horizontal', 'row_layout': '', 'locate_colors': ''}
    esp.update(overrides)
    return esp


def test_led_number_maps_directly_to_strip_index():
    # The UI numbers cells in strip order, so LED n is strip index n-1
    assert app_module.position_optimization([1, 2, 3], esp_dict()) == [0, 1, 2]


def test_serpentine_bug_report_led6_sits_below_led5():
    # 9 rows x 5 LEDs, horizontal serpentine: LED 6 is strip index 5 (right under LED 5)
    assert app_module.position_optimization([5, 6], esp_dict()) == [4, 5]


def test_mapping_is_independent_of_start_corner_and_direction():
    for start_top in ('Top', 'Bottom'):
        for start_left in ('Left', 'Right'):
            for direction in ('Horizontal', 'Vertical'):
                esp = esp_dict(start_top=start_top, start_left=start_left, serpentine_direction=direction)
                assert app_module.position_optimization([1, 45], esp) == [0, 44]


def test_out_of_range_positions_are_dropped():
    assert app_module.position_optimization([0, 1, 45, 46, 100], esp_dict()) == [0, 44]


def test_custom_row_layout_bounds_use_drawer_total():
    esp = esp_dict(rows=7, cols=6, row_layout='6,6,6,6,6,3,3')  # 36 drawers, not 42
    assert app_module.position_optimization([36, 37, 42], esp) == [35]


def test_locate_lights_selected_leds_with_global_colour(client, wled):
    make_esp()
    item_id = make_item(position='[5, 6]')
    resp = client.post(f'/api/items/{item_id}', data={'action': 'locate'})
    assert resp.status_code == 200
    settings_colour = db.read_settings()['colors'][1]
    assert wled.lit() == [(4, settings_colour[1:]), (5, settings_colour[1:])]


def test_per_box_colours_cycle_over_leds(client, wled):
    make_esp(locate_colors=['#00ff00', '#ff0000'])
    item_id = make_item(position='[1, 2, 3]')
    client.post(f'/api/items/{item_id}', data={'action': 'locate'})
    assert wled.lit() == [(0, '00ff00'), (1, 'ff0000'), (2, '00ff00')]


def test_out_of_stock_item_is_shown_red(client, wled):
    make_esp(locate_colors=['#00ff00'])
    item_id = make_item(position='[2]', quantity=0)
    client.post(f'/api/items/{item_id}', data={'action': 'locate'})
    assert wled.lit() == [(1, 'FF0000')]


def test_locate_without_matching_esp_returns_404(client, wled):
    item_id = make_item(ip='10.9.9.9')
    resp = client.post(f'/api/items/{item_id}', data={'action': 'locate'})
    assert resp.status_code == 404
    assert wled.calls == []


def test_locate_resolves_items_that_reference_esp_by_name(client, wled):
    make_esp(name='Workshop', ip='10.0.0.7')
    item_id = make_item(ip='Workshop', position='[3]')
    assert client.post(f'/api/items/{item_id}', data={'action': 'locate'}).status_code == 200
    assert wled.calls[0][0] == '10.0.0.7'
