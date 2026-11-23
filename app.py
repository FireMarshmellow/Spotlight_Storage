# Importing necessary modules and packages
import json
import queue
import uuid
from flask import Flask, render_template, jsonify, request, send_from_directory, url_for, Response

from requests import Timeout
import db
import requests
import security
import time
import os
import threading

# Creating a Flask application instance
app = Flask(__name__)
app.json.sort_keys = False
app.config['MAX_CONTENT_LENGTH'] = security.MAX_UPLOAD_BYTES

# Default Values
app.brightness = 1
app.delSegments = ""
app.timeout = 5
app.standbyColor = "#00ff00"
app.locateColor = "#00ff00"
app.config['UPLOAD_FOLDER'] = './images'
app.previous_positions = []
app.request_amount = 0

WLED_TIMEOUT = 2  # seconds for any request to a WLED controller


# ---------------------------------------------------------------------------
# Request / response security
# ---------------------------------------------------------------------------

@app.before_request
def enforce_security():
    error = security.check_host(request)
    if error:
        return jsonify({'error': error}), 400
    # Block requests a malicious website makes through a visitor's browser (CSRF)
    if security.needs_csrf_check(request) and security.is_cross_site(request):
        return jsonify({'error': 'Cross-site request blocked'}), 403
    # Optional API token (SPOTLIGHT_API_TOKEN)
    if not security.check_token(request):
        return jsonify({'error': 'Missing or invalid API token'}), 401


@app.after_request
def add_security_headers(response):
    for header, value in security.SECURITY_HEADERS.items():
        response.headers.setdefault(header, value)
    return response


@app.errorhandler(413)
def too_large(_error):
    return jsonify({'error': f'Upload too large (max {security.MAX_UPLOAD_BYTES // (1024 * 1024)} MB)'}), 413


@app.route('/proxy-image', methods=['GET'])
def proxy_image():
    """Fetch an external image for the cropper. Only public http(s) image URLs."""
    try:
        body, content_type = security.fetch_public_image(request.args.get('url', ''))
    except security.ProxyError as e:
        return jsonify({'error': e.message}), e.status
    return Response(body, content_type=content_type, headers={'Cache-Control': 'private, max-age=300'})


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
    """Store an uploaded image under a random name.

    The type is taken from the file content (PNG, JPEG, GIF, WebP only), never
    from the client's file name, so HTML/SVG cannot be uploaded and existing
    files cannot be overwritten. Size is capped by MAX_CONTENT_LENGTH.
    """
    file = request.files.get('file')
    if file is None or file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    head = file.stream.read(16)
    file.stream.seek(0)
    extension = security.detect_image_type(head)
    if extension is None:
        return jsonify({'error': 'Only PNG, JPEG, GIF and WebP images can be uploaded'}), 400
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    filename = f'{uuid.uuid4().hex}.{extension}'
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
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({'error': 'Invalid settings'}), 400
        try:
            data['brightness'] = min(max(int(data.get('brightness', 100)), 0), 100)
            data['timeout'] = min(max(int(data.get('timeout', 5)), 0), 3600)
        except (TypeError, ValueError):
            return jsonify({'error': 'brightness and timeout must be numbers'}), 400
        if not isinstance(data.get('colors'), list) or not all(db.parse_colors([c]) for c in data['colors']):
            return jsonify({'error': 'colors must be a list of #rrggbb values'}), 400
        data.setdefault('lightMode', 'light')
        data.setdefault('language', 'en')
        db.update_settings(data)  # Update settings in the database
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
    confirm = request.args.get('confirm') or request.form.get('confirm')
    if mode == 'replace' and confirm != 'replace':
        return jsonify({'error': "Replace mode deletes existing data; repeat the request with confirm=replace"}), 400
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
            esp_data = request.get_json(silent=True)
            if not esp_data:
                return jsonify({"error": "No data provided"}), 400
            error = validate_esp_payload(esp_data)
            if error:
                return jsonify({"error": error}), 400

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
        esp_data = request.get_json(silent=True) or {}
        error = validate_esp_payload(esp_data)
        if error:
            return jsonify({"error": error}), 400
        db.update_esp_settings(id, esp_data)
        return jsonify({'success': True})

    elif request.method == 'DELETE':
        db.delete_esp_settings(id)
        return jsonify({'success': True})


def validate_esp_payload(esp_data):
    """Return an error message for an invalid ESP payload, normalising the address in place."""
    host = security.normalize_device_host(esp_data.get('esp_ip'))
    if host is None:
        return 'esp_ip must be a plain IP address or host name (e.g. 192.168.1.50 or wled-box.local)'
    esp_data['esp_ip'] = host
    if not str(esp_data.get('name') or '').strip():
        return 'name is required'
    try:
        if int(esp_data.get('rows')) < 1 or int(esp_data.get('cols')) < 1:
            raise ValueError
    except (TypeError, ValueError):
        return 'rows and cols must be positive numbers'
    return None


def validate_item_payload(item):
    """Return an error message for an invalid item payload."""
    if not isinstance(item, dict) or not str(item.get('name') or '').strip():
        return 'name is required'
    if not security.is_safe_link(item.get('link')):
        return 'link must be an http(s) URL'
    if not security.is_safe_image_ref(item.get('image')):
        return 'image must be an http(s) URL or an uploaded image path'
    return _validate_quantity(item)


def _validate_quantity(data):
    try:
        data['quantity'] = max(int(data.get('quantity')), 0)
    except (TypeError, ValueError):
        return 'quantity must be a whole number'
    return None


# Route to handle GET and POST requests for items
@app.route('/api/items', methods=['GET', 'POST'])
def items():
    if request.method == 'GET':
        items = db.read_items()
        return jsonify(items)
    elif request.method == 'POST':
        item = request.get_json(silent=True)
        error = validate_item_payload(item)
        if error:
            return jsonify({'error': error}), 400
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
        if item is None:
            return jsonify({'error': 'Item not found'}), 404
        data = request.get_json(silent=True) or {}
        if request.headers.get('Update-Quantity') == 'true':
            error = _validate_quantity(data)
            if error:
                return jsonify({'error': error}), 400
            db.update_item_quantity(id, data)
        elif request.headers.get('Update-Image') == 'true':
            if not security.is_safe_image_ref(data.get('image')):
                return jsonify({'error': 'image must be an http(s) URL or an uploaded image path'}), 400
            db.update_item_image(id, data)
        else:
            error = validate_item_payload(data)
            if error:
                return jsonify({'error': error}), 400
            db.update_item(id, data)
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
                return jsonify({'error': error}), 429 if error == LOCATE_BUSY else 404
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Invalid action'}), 400


def resolve_esp(item):
    """Return (ip, esp_settings) for an item; esp_settings is None if not found.

    Items reference their ESP by IP or by name, and only configured ESPs are
    ever contacted, so a crafted item cannot make the server call arbitrary hosts.
    """
    reference = item.get('ip') or ''
    esp = db.get_esp_settings_by_ip(reference)
    if esp is None:
        ip = db.get_ip_by_name(reference)
        esp = db.get_esp_settings_by_ip(ip) if ip else None
    if esp is None or security.normalize_device_host(esp['esp_ip']) is None:
        return None, None
    return esp['esp_ip'], esp


# All LED animations run on one worker thread, one at a time. A bounded queue
# stops floods of locate requests from piling up threads; a new job interrupts
# the running job's "stay lit" timeout so the latest request shows right away.
LOCATE_QUEUE_SIZE = 8
LOCATE_BUSY = 'Too many locate requests queued, try again shortly'
_locate_queue = queue.Queue(maxsize=LOCATE_QUEUE_SIZE)
_new_job = threading.Event()
_worker_lock = threading.Lock()
_worker = None


def _locate_worker():
    while True:
        func, args = _locate_queue.get()
        _new_job.clear()
        try:
            func(*args)
        except Exception as e:  # keep the worker alive whatever happens
            print(f"LED job failed: {e}")
        finally:
            _locate_queue.task_done()


def submit_locate(func, *args):
    """Queue an LED job. Returns False when the queue is full."""
    global _worker
    with _worker_lock:
        if _worker is None or not _worker.is_alive():
            _worker = threading.Thread(target=_locate_worker, name='led-worker', daemon=True)
            _worker.start()
    try:
        _locate_queue.put_nowait((func, args))
    except queue.Full:
        return False
    _new_job.set()
    return True


def wait_or_interrupt(seconds):
    """Sleep for the LED timeout, but wake early when a newer job is queued."""
    _new_job.wait(seconds)


def locate_item(item, background=True):
    """Light up an item's LEDs. Returns an error message, or None on success.

    Jobs run on the LED worker so callers (UI, Home Assistant) get an immediate
    response. background=False runs inline (used by tools/tests).
    """
    ip, esp = resolve_esp(item)
    if esp is None:
        return 'No ESP configured for this item. Edit the item and select an ESP.'
    if not background:
        light(item['position'], ip, esp, item['quantity'])
        return None
    if not submit_locate(light, item['position'], ip, esp, item['quantity']):
        return LOCATE_BUSY
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
    value = request.args.get('locate', (request.get_json(silent=True) or {}).get('locate', 'true'))
    return str(value).lower() not in ('0', 'false', 'no', 'off')


# ---------------------------------------------------------------------------
# REST API for automations / voice assistants (e.g. Home Assistant)
# ---------------------------------------------------------------------------

@app.route('/api/find', methods=['GET', 'POST'])
@app.route('/api/findItem', methods=['GET', 'POST'])
def api_find_item():
    """Find the best match for ?q= (name, article number, location, tags; fuzzy)
    and light it up. Pass ?locate=false to only look it up. POST accepts the same
    fields as a JSON body."""
    body = request.get_json(silent=True) if request.method == 'POST' else None
    params = body if isinstance(body, dict) else request.args
    query = str(params.get('q') or params.get('name') or params.get('article_number') or '')
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
    limit = min(max(limit or 10, 1), 100)
    return jsonify([item_to_api(i) for i in db.search_items(query)[:limit]]), 200


@app.route('/api/items/<int:item_id>/locate', methods=['POST'])
def api_locate_item(item_id):
    item = db.get_item(item_id)
    if item is None:
        return jsonify({'error': 'Item not found'}), 404
    error = locate_item(item, background=True)
    if error:
        return jsonify({'error': error}), 429 if error == LOCATE_BUSY else 404
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
    host = security.normalize_device_host(target_ip)
    if host is None:
        print(f"Refusing to contact invalid WLED address: {target_ip!r}")
        return
    url = f"http://{host}/json/state"

    try:
        response = requests.post(url, json=data, timeout=timeout)
        # Check for successful response, and handle accordingly

        if response.status_code == 200:
            # Success
            app.request_amount += 1
        else:
            # Handle other status codes (e.g., 404, 500, etc.) as needed
            print(f"Request failed with status code {response.status_code}")
    except Timeout as e:
        # Handle timeout errors
        print(f"Timeout error: {e}")
    except requests.RequestException as e:
        # Connection refused, DNS failure, ...
        print(f"Connection error: {e}")


def get_total_leds(ip):
    host = security.normalize_device_host(ip)
    if host is None:
        return 0
    try:
        response = requests.get(f"http://{host}/json/info", timeout=WLED_TIMEOUT)
        response.raise_for_status()
        info = response.json()
        return info['leds']['count']
    except (requests.RequestException, ValueError, KeyError, TypeError) as e:
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
        wait_or_interrupt(app.timeout)
        for i in range(total_leds):
            off_payload["seg"]["i"].extend([i, off_color[1:]])
        send_request(ip, off_payload)
        app.previous_positions = []  # Reset previous positions
    elif testing:
        wait_or_interrupt(app.timeout + 3)  # Ensure a minimum delay during testing

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
    lights_list = request.get_json(silent=True)
    if not isinstance(lights_list, dict) or not lights_list:
        return {'error': 'Expected {"<esp ip>": [led numbers]}'}, 400
    jobs = []
    for ip, positions in lights_list.items():
        # Validate positions list
        if not positions or not isinstance(positions, list) or len(positions) > 10000 \
                or not all(isinstance(pos, int) and not isinstance(pos, bool) for pos in positions):
            return {'error': 'Invalid positions list'}, 400
        # Only configured WLED controllers may be contacted
        esp = db.get_esp_settings_by_ip(ip)
        if esp is None:
            return {'error': f'Unknown ESP {ip!r}'}, 404
        jobs.append((json.dumps(positions), esp['esp_ip'], esp))
    for positions_json, ip, esp in jobs:
        if not submit_locate(light, positions_json, ip, esp, 1, True):
            return {'error': LOCATE_BUSY}, 429
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


@app.route('/led/on', methods=['POST'])
def turn_led_on():
    set_global_settings()
    app.previous_positions = []  # Reset previous positions
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
@app.route('/led/off', methods=['POST'])
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
@app.route('/led/party', methods=['POST'])
def turn_led_party():
    app.previous_positions = []  # Reset previous positions
    set_global_settings()
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
