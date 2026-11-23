# Importing necessary modules and packages
import json
import re
from flask import Flask, render_template, jsonify, request, send_from_directory, redirect, url_for, flash, Response

from requests import Timeout
import db
import requests
import time
import os
import threading
from werkzeug.utils import secure_filename

# Creating a Flask application instance
app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False

# Default Values
app.brightness = 1
app.delSegments = ""
app.timeout = 5
app.standbyColor = "#00ff00"
app.locateColor = "#00ff00"
app.config['UPLOAD_FOLDER'] = './images'
app.previous_positions = []
app.request_amount = 0



@app.route('/proxy-image', methods=['GET'])
def proxy_image():
    image_url = request.args.get('url')
    response = requests.get(image_url, stream=True)
    return Response(response.content, content_type=response.headers['Content-Type'])


# Route to Favicon
@app.route('/favicon.ico')
def favicon():
    return send_from_directory(app.root_path, 'favicon.ico', mimetype='image/vnd.microsoft.icon')


# Route to the home page of the web application
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/images/<name>')
def download_image(name):
    return send_from_directory(app.config["UPLOAD_FOLDER"], name)


@app.route('/upload', methods=['POST'])
def upload_file():
    # check if the post request has the file part
    if 'file' not in request.files:
        flash('No file part')
        return
    file = request.files['file']
    # If the user does not select a file, the browser submits an
    # empty file without a filename.
    if file.filename == '':
        flash('No selected file')
        return
    if file:
        filename = secure_filename(file.filename)

        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        return url_for('download_image', name=filename)


@app.route('/api/tags', methods=['GET', 'POST'])
def tags():
    if request.method == 'GET':
        try:
            tag_data = db.get_all_tags()  # Fetch ESP data from the database
            return jsonify(tag_data), 200
        except Exception as e:
            print(f"Error fetching Tag data: {e}")  # Log the error for debugging
            return jsonify({"error": "An error occurred fetching Tag data"}), 500


def get_unique_ips_from_database():
    # Get all items from the database
    ips = db.read_esp()
    # Create a set to store unique IP addresses
    unique_ips = set()
    # Iterate through the items and extract unique IPs
    for ip in ips:
        ip = ip.get('esp_ip')
        if ip:
            unique_ips.add(ip)
    # Convert the set of unique IPs back to a list (if needed)
    unique_ips_list = list(unique_ips)

    return unique_ips_list


def is_valid_url_or_ip(input_str):
    ip_pattern = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")  # Simple IP address regex
    url_pattern = re.compile(r"([a-zA-Z0-9-]+)\.([a-zA-Z]{2,})")

    if ip_pattern.match(input_str):
        return True

    return bool(url_pattern.match(input_str))


def set_global_settings():
    settings = db.read_settings()

    if settings:
        app.brightness = settings['brightness'] / 100
        app.timeout = settings['timeout']

        colors = settings.get('colors')
        # Assign colors
        if isinstance(colors, list) and len(colors) >= 2:
            app.standbyColor = colors[0]
            app.locateColor = colors[1]


@app.route('/api/settings', methods=['GET', 'POST'])
def settings():
    if request.method == 'GET':
        # If the request method is GET, read data from the database and return as JSON
        return jsonify(db.read_settings())
    elif request.method == 'POST':
        db.update_settings(request.get_json())  # Update settings in the database
        return jsonify({'success': True})


@app.route('/api/export', methods=['GET'])
def export_backup():
    """Download a JSON backup. ?include=settings,esps,items (default: all)."""
    include = [s.strip() for s in request.args.get('include', 'settings,esps,items').split(',') if s.strip()]
    unknown = set(include) - {'settings', 'esps', 'items'}
    if unknown or not include:
        return jsonify({'error': f"Unknown section(s): {', '.join(sorted(unknown)) or 'none given'}"}), 400
    data = db.export_data(include)
    filename = f"spotlight-storage-backup-{time.strftime('%Y%m%d-%H%M%S')}.json"
    return Response(json.dumps(data, indent=2), mimetype='application/json',
                    headers={'Content-Disposition': f'attachment; filename="{filename}"'})


@app.route('/api/import', methods=['POST'])
def import_backup():
    """Import a backup. Accepts a JSON body or a multipart 'file'.
    ?mode=merge (default, nothing deleted) or ?mode=replace."""
    mode = request.args.get('mode') or request.form.get('mode') or 'merge'
    try:
        if 'file' in request.files:
            data = json.load(request.files['file'].stream)
        else:
            data = request.get_json(silent=False)
    except Exception:
        return jsonify({'error': 'File is not valid JSON'}), 400
    try:
        stats = db.import_data(data, mode)
    except db.BackupError as e:
        return jsonify({'error': str(e)}), 400
    return jsonify({'success': True, 'mode': mode, **stats}), 200


@app.route('/api/esp/', methods=['GET', 'POST'])
def esps():
    if request.method == 'GET':
        try:
            esps_data = db.read_esp()  # Fetch ESP data from the database
            return jsonify(esps_data), 200
        except Exception as e:
            print(f"Error fetching ESP data: {e}")  # Log the error for debugging
            return jsonify({"error": "An error occurred fetching ESP data"}), 500

    elif request.method == 'POST':
        try:
            esp_data = request.get_json()
            if not esp_data:
                return jsonify({"error": "No data provided"}), 400

            id = db.write_esp_settings(esp_data)
            if id is None:
                raise ValueError("Failed to write ESP settings")

            esp_data['id'] = id
            return jsonify(esp_data), 201
        except Exception as e:
            print(f"Error on writing ESP data: {e}")  # Log the error
            return jsonify({"error": "An error occurred writing ESP data"}), 500

    else:
        return jsonify({"error": "Method not allowed"}), 405


@app.route('/api/esp/<id>', methods=['GET', 'PUT', 'DELETE'])
def handle_esp(id):
    if request.method == 'GET':
        esp_data = db.get_esp_settings_by_ip(id)
        if esp_data is not None:
            return jsonify(esp_data)
        else:
            return jsonify({'error': 'ESP not found'}), 404

    elif request.method == 'PUT':
        esp_data = request.get_json()
        db.update_esp_settings(id, esp_data)
        return jsonify({'success': True})

    elif request.method == 'DELETE':
        db.delete_esp_settings(id)
        return jsonify({'success': True})


# Route to handle GET and POST requests for items
@app.route('/api/items', methods=['GET', 'POST'])
def items():
    if request.method == 'GET':
        items = db.read_items()
        return jsonify(items)
    elif request.method == 'POST':
        item = request.get_json()
        id = db.write_item(item)
        item['id'] = id
        return jsonify(item)


# Route to handle GET, PUT, DELETE requests for a specific item
@app.route('/api/items/<id>', methods=['GET', 'PUT', 'DELETE', 'POST'])
def item(id):
    item = db.get_item(id)
    if request.method == 'GET':
        if item:
            return jsonify(item)
        else:
            return jsonify({'error': 'Item not found'}), 404

    elif request.method == 'PUT':
        if request.headers.get('Update-Quantity') == 'true':
            db.update_item_quantity(id, request.get_json())
        elif request.headers.get('Update-Image') == 'true':
            db.update_item_image(id, request.get_json())
        else:
            db.update_item(id, request.get_json())
        return jsonify(dict(item))

    elif request.method == 'DELETE':
        db.delete_item(id)
        return jsonify({'success': True})
    elif request.method == 'POST':

        if request.form.get('action') == 'locate':
            if item is None:
                return jsonify({'error': 'Item not found'}), 404
            error = locate_item(item)
            if error:
                return jsonify({'error': error}), 404
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Invalid action'}), 400


def resolve_esp(item):
    """Return (ip, esp_settings) for an item; esp_settings is None if not found."""
    ip = item['ip'] if is_valid_url_or_ip(item['ip'] or '') else db.get_ip_by_name(item['ip'])
    return ip, (db.get_esp_settings_by_ip(ip) if ip else None)


def locate_item(item, background=False):
    """Light up an item's LEDs. Returns an error message, or None on success.

    With background=True the (blocking) light/timeout cycle runs in a thread so
    API callers such as Home Assistant get an immediate response.
    """
    ip, esp = resolve_esp(item)
    if esp is None:
        return 'No ESP configured for this item. Edit the item and select an ESP.'
    if background:
        threading.Thread(target=light, args=(item['position'], ip, esp, item['quantity']), daemon=True).start()
    else:
        light(item['position'], ip, esp, item['quantity'])
    return None


def item_to_api(item):
    """Public JSON shape for the REST API (Home Assistant, scripts, ...)."""
    try:
        bins = json.loads(item['position']) if isinstance(item['position'], str) else item['position']
    except (TypeError, ValueError):
        bins = []
    _, esp = resolve_esp(item)
    return {
        'item_number': item['id'],
        'item_name': item['name'],
        'quantity': item['quantity'],
        'bin_number': bins,
        'article_number': item.get('article_number') or '',
        'storage_location': item.get('storage_location') or '',
        'box': esp['name'] if esp else None,
        'link': item.get('link') or '',
    }


def _wants_locate():
    return str(request.args.get('locate', 'true')).lower() not in ('0', 'false', 'no', 'off')


# ---------------------------------------------------------------------------
# REST API for automations / voice assistants (e.g. Home Assistant)
# ---------------------------------------------------------------------------

@app.route('/api/find', methods=['GET'])
@app.route('/api/findItem', methods=['GET'])
def api_find_item():
    """Find the best match for ?q= (name, article number, location, tags; fuzzy)
    and light it up. Pass ?locate=false to only look it up."""
    query = request.args.get('q') or request.args.get('name') or request.args.get('article_number') or ''
    if not query.strip():
        return jsonify({'error': "Missing query parameter 'q'"}), 400
    matches = db.search_items(query)
    if not matches:
        return jsonify({'error': f"No item matching '{query}'"}), 404
    item = matches[0]
    result = item_to_api(item)
    if _wants_locate():
        error = locate_item(item, background=True)
        result['located'] = error is None
        if error:
            result['locate_error'] = error
    return jsonify(result), 200


@app.route('/api/search', methods=['GET'])
def api_search_items():
    """List all items matching ?q= (best first) without lighting anything."""
    query = request.args.get('q', '')
    limit = request.args.get('limit', default=10, type=int)
    return jsonify([item_to_api(i) for i in db.search_items(query)[:max(limit, 1)]]), 200


@app.route('/api/items/<int:item_id>/locate', methods=['POST', 'GET'])
def api_locate_item(item_id):
    item = db.get_item(item_id)
    if item is None:
        return jsonify({'error': 'Item not found'}), 404
    error = locate_item(item, background=True)
    if error:
        return jsonify({'error': error}), 404
    return jsonify(item_to_api(item)), 200


@app.route('/api/items/<int:item_id>/quantity', methods=['POST', 'PUT'])
def api_item_quantity(item_id):
    """Set ({"quantity": 5}) or adjust ({"delta": 3} / {"delta": -1}) stock."""
    item = db.get_item(item_id)
    if item is None:
        return jsonify({'error': 'Item not found'}), 404
    return _apply_quantity_change(item, request.get_json(silent=True) or {})


@app.route('/api/addItem', methods=['POST', 'PUT'])
@app.route('/api/quantity', methods=['POST', 'PUT'])
def api_quantity_by_reference():
    """Adjust stock by item_number or article_number, e.g. after buying parts:
    {"item_number": 12, "quantity": 3} adds 3; {"article_number": "4006381333931", "delta": -1}.
    Use {"set_quantity": n} to set an absolute value."""
    data = request.get_json(silent=True) or {}
    item = None
    if data.get('item_number') is not None:
        item = db.get_item(data['item_number'])
    elif data.get('article_number'):
        article = str(data['article_number']).strip().lower()
        item = next((i for i in db.read_items() if (i.get('article_number') or '').strip().lower() == article), None)
    if item is None:
        return jsonify({'error': 'Item not found (pass item_number or article_number)'}), 404
    if 'set_quantity' in data:
        change = {'quantity': data['set_quantity']}
    else:
        change = {'delta': data.get('delta', data.get('quantity', 1))}
    return _apply_quantity_change(item, change)


def _apply_quantity_change(item, data):
    try:
        if 'quantity' in data:
            new_quantity = int(data['quantity'])
        elif 'delta' in data:
            new_quantity = int(item['quantity']) + int(data['delta'])
        else:
            return jsonify({'error': "Provide 'quantity' or 'delta'"}), 400
    except (TypeError, ValueError):
        return jsonify({'error': 'Quantity must be an integer'}), 400
    new_quantity = max(new_quantity, 0)
    db.update_item_quantity(item['id'], {'quantity': new_quantity})
    item['quantity'] = new_quantity
    return jsonify(item_to_api(item)), 200


def send_request(target_ip, data, timeout=0.2):
    url = f"http://{target_ip}/json/state"

    try:
        response = requests.post(url, json=data, timeout=timeout)
        # Check for successful response, and handle accordingly

        if response.status_code == 200:
            # Success
            app.request_amount += 1
        else:
            # Handle other status codes (e.g., 404, 500, etc.) as needed
            print(f"Request failed with status code {response.status_code}")
    except ConnectionError as e:
        # Handle connection errors
        print(f"Connection error: {e}")
    except Timeout as e:
        # Handle timeout errors
        print(f"Timeout error: {e}")


def get_total_leds(ip):
    try:
        response = requests.get(f"http://{ip}/json/info")
        response.raise_for_status()
        info = response.json()
        return info['leds']['count']
    except requests.RequestException as e:
        print(f"Error fetching total LEDs: {e}")
        return 1000  # Default value if the request fails


def set_leds(led_indices, color, off_color, ip, testing=False):
    # Get the total number of LEDs from the WLED API
    total_leds = get_total_leds(ip)

    # Clear existing segments if they exist
    if app.delSegments:
        off_data = {"on": False, "bri": 0, "transition": 0, "mainseg": 0, "seg": []}
        send_request(ip, off_data)
        time.sleep(0.3)
    else:
        # Turn off all LEDs with the off_color
        payload = {
            "on": False,
            "seg": {"i": []}
        }
        send_request(ip, payload)
        time.sleep(0.3)

    # Initialize payload for turning off LEDs (if needed)
    off_payload = {
        "on": True,
        "seg": {"i": []}
    }

    # Convert the LED indices from a string to a list of integers if necessary
    if isinstance(led_indices, str):
        led_indices_new = list(map(int, led_indices.split(',')))
    else:
        led_indices_new = list(map(int, led_indices))

    # Check if the new positions are different from the previous ones
    if app.previous_positions != led_indices_new:
        # Initialize payload for turning on LEDs with the desired color
        on_payload = {
            "on": True,
            "seg": {"i": []}
        }

        # Light up the current LEDs with the desired color. `color` may be a
        # list (per-box mark colours): LEDs are coloured in strip order,
        # cycling through the list, e.g. front of drawer green, back red.
        colors = color if isinstance(color, (list, tuple)) and color else [color]
        for n, i in enumerate(led_indices_new):
            on_payload["seg"]["i"].extend([i, colors[n % len(colors)][1:]])

        # Send the API request to set the colors of the LEDs
        send_request(ip, on_payload)

        # Update the previous positions to the current ones
        app.previous_positions = led_indices_new
    else:
        # If the positions are the same, turn off all LEDs
        for i in range(total_leds):
            off_payload["seg"]["i"].extend([i, off_color[1:]])
        send_request(ip, off_payload)
        app.previous_positions = []  # Reset previous positions
        app.timeout = 0  # Reset timeout

    # Handle timeout and turn off LEDs after delay if needed
    if app.timeout > 0 and not testing:
        time.sleep(app.timeout)
        for i in range(total_leds):
            off_payload["seg"]["i"].extend([i, off_color[1:]])
        send_request(ip, off_payload)
        app.previous_positions = []  # Reset previous positions
    elif testing:
        time.sleep(app.timeout + 3)  # Ensure a minimum delay during testing

    # Update global delSegments to include the off_payload segment
    app.delSegments = off_payload


def light(positions, ip, esp, quantity=1, testing=False):
    # Set global settings
    set_global_settings()
    positions_list = position_optimization(sorted(json.loads(positions)), esp)
    # Per-box mark colours override the global locate colour
    locate_colors = db.parse_colors(esp.get('locate_colors')) if esp else []
    locate_color = locate_colors or app.locateColor
    if testing:
        set_leds(positions_list, locate_color, app.standbyColor, ip, testing)
    elif int(quantity) <= 0:
        set_leds(positions_list, "#FF0000", app.standbyColor, ip, testing)
    else:
        set_leds(positions_list, locate_color, app.standbyColor, ip, testing)


def position_optimization(positions, esp):
    total = None
    if esp:
        layout = db.parse_row_layout(esp.get('row_layout'))
        total = sum(layout) if layout else int(esp['rows']) * int(esp['cols'])
    segments = []
    for pos in positions:
        index = int(pos) - 1
        if index < 0 or (total is not None and index >= total):
            continue
        segments.append(index)
    return segments


@app.route('/test_lights', methods=['POST'])
def test_lights():
    set_global_settings()
    lights_list = request.get_json()
    for ip, positions in lights_list.items():
        # Validate positions list
        if not positions or not all(isinstance(pos, int) for pos in positions):
            return {'error': 'Invalid positions list'}, 400
        positions_json = json.dumps(positions)
        esp = db.get_esp_settings_by_ip(ip)
        light(positions_json, ip, esp, 1, True)
    return {'status': 'Lights controlled'}


def hex_to_rgb(hex_color):
    if hex_color:
        # Remove '#' if present in the hexadecimal color code
        if hex_color.startswith('#'):
            hex_color = hex_color[1:]

        # Check if the input is a valid hexadecimal color value
        if len(hex_color) != 6 or not all(c in '0123456789abcdefABCDEF' for c in hex_color):
            # If not valid, return default colors (red, green, blue)
            return [0, 255, 0]

        # Convert hexadecimal color code to RGB
        r = int(hex_color[0:2], 16)
        g = int(hex_color[2:4], 16)
        b = int(hex_color[4:6], 16)

        return [r, g, b]
    else:
        return [0, 255, 0]


@app.route('/led/on', methods=['GET'])
def turn_led_on():
    set_global_settings()
    app.previous_positions = []  # Reset previous positions
    if request.method == 'GET':
        ips = get_unique_ips_from_database()
        for ip in ips:
            total_leds = get_total_leds(ip)
            on_data = {
                "on": True,
                "bri": app.brightness,
                "transition": 5,
                "mainseg": 0,
                "seg": [
                    {
                        "id": 0,
                        "start": 0,
                        "stop": total_leds,
                        "grp": 1,
                        "spc": 0,
                        "of": 0,
                        "on": True,
                        "frz": False,
                        "cct": 127,
                        "set": 0,
                        "col": [hex_to_rgb(app.standbyColor)],
                        "fx": 0,
                        "sx": 128,
                        "ix": 128,
                        "pal": 0,
                        "c1": 128,
                        "c2": 128,
                        "c3": 16,
                        "sel": True,
                        "rev": False,
                        "mi": False,
                        "o1": False,
                        "o2": False,
                        "o3": False,
                        "si": 0,
                        "m12": 1
                    },
                    {"stop": 0},
                    {"stop": 0},
                    {"stop": 0},
                    {"stop": 0},
                    {"stop": 0},
                    {"stop": 0},
                    {"stop": 0},
                    {"stop": 0},
                    {"stop": 0},
                    {"stop": 0},
                    {"stop": 0},
                    {"stop": 0},
                    {"stop": 0},
                    {"stop": 0},
                    {"stop": 0}
                ]
            }
            send_request(ip, on_data)
        return jsonify({'success': True})


# Route to turn the LED off
@app.route('/led/off', methods=['GET'])
def turn_led_off():
    ips = get_unique_ips_from_database()
    app.previous_positions = []  # Reset previous positions
    for ip in ips:
        total_leds = get_total_leds(ip)
        on_data = {
            "on": False,
            "transition": 5,
            "seg": [
                {
                    "id": 0,
                    "start": 0,
                    "stop": total_leds,
                },
                {"stop": 0},
                {"stop": 0},
                {"stop": 0},
                {"stop": 0},
                {"stop": 0},
                {"stop": 0},
                {"stop": 0},
                {"stop": 0},
                {"stop": 0},
                {"stop": 0},
                {"stop": 0},
                {"stop": 0},
                {"stop": 0},
                {"stop": 0},
                {"stop": 0}
            ]
        }
        send_request(ip, on_data)
    return jsonify({'success': True})


# Route to turn the LED to Party
@app.route('/led/party', methods=['GET'])
def turn_led_party():
    app.previous_positions = []  # Reset previous positions
    set_global_settings()
    if request.method == 'GET':
        ips = get_unique_ips_from_database()
        for ip in ips:
            party_data = {"on": True, "bri": round(255 * app.brightness), "transition": 5, "mainseg": 0, "seg": [
                {"id": 0, "grp": 1, "spc": 0, "of": 0, "on": True, "frz": False, "bri": 255, "cct": 127, "set": 0,
                 "col": [[255, 255, 255], [0, 0, 0], [0, 0, 0]], "fx": 9, "sx": 128, "ix": 128, "pal": 0, "c1": 128,
                 "c2": 128, "c3": 16},
                {"stop": 0},
                {"stop": 0},
                {"stop": 0},
                {"stop": 0},
                {"stop": 0},
                {"stop": 0},
                {"stop": 0},
                {"stop": 0},
                {"stop": 0},
                {"stop": 0},
                {"stop": 0},
                {"stop": 0},
                {"stop": 0},
                {"stop": 0},
                {"stop": 0}]}
            send_request(ip, party_data)
        return jsonify()


@app.route('/api/translations', methods=['GET'])
def get_languages():
    # Define the directory containing the translation files, relative to the location of app.py
    translations_dir = os.getenv('TRANSLATIONS_DIR', os.path.join(os.path.dirname(__file__), 'static', 'translations'))

    try:
        # List all .json files in the translations directory
        languages = [f.split('.')[0] for f in os.listdir(translations_dir) if f.endswith('.json')]
        return jsonify(languages), 200
    except Exception as e:
        print(f"Error fetching languages: {e}")
        return jsonify({"error": "An error occurred fetching available languages"}), 500







if __name__ == '__main__':
    app.run(host="0.0.0.0", debug=False)
