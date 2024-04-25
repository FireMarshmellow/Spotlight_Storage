# Importing necessary modules and packages
import json
import re
from flask import Flask, render_template, jsonify, request, send_from_directory, redirect, url_for, flash
from requests import Timeout
import db
import requests
import time
import os
from werkzeug.utils import secure_filename

# Creating a Flask application instance
app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False

# Default Values
app.brightness = 1
app.delSegments = ""
app.timeout = 5
app.config['UPLOAD_FOLDER'] = 'images'
app.previous_positions = []


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


@app.route('/api/settings', methods=['GET', 'POST'])
def settings():
    if request.method == 'GET':
        # If the request method is GET, read data from the database and return as JSON
        settings = db.read_settings()
        return jsonify(settings)
    elif request.method == 'POST':
        settings = request.get_json()
        db.update_settings(settings)  # Update settings in the database
        return jsonify({'success': True})


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
        db.update_item(id, request.get_json())
        return jsonify(dict(item))

    elif request.method == 'DELETE':
        db.delete_item(id)
        return jsonify({'success': True})
    elif request.method == 'POST':

        if request.form.get('action') == 'locate':
            if is_valid_url_or_ip(item['ip']):
                ip = item['ip']
            else:
                ip = db.get_ip_by_name(item['ip'])
            light(item['position'], ip, item['quantity'])
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Invalid action'}), 400


def send_request(target_ip, data, timeout=0.2):
    url = f"http://{target_ip}/json/state"

    try:
        response = requests.post(url, json=data, timeout=timeout)
        # Check for successful response, and handle accordingly

        if response.status_code == 200:
            # Success
            print("Request was successful")
        else:
            # Handle other status codes (e.g., 404, 500, etc.) as needed
            print(f"Request failed with status code {response.status_code}")
    except ConnectionError as e:
        # Handle connection errors
        print(f"Connection error: {e}")
    except Timeout as e:
        # Handle timeout errors
        print(f"Timeout error: {e}")


# Function to control lights
def light(positions, ip, quantity=1, testing=False):
    # Turn off existing segments if they exist
    if app.delSegments:
        off_data = {"on": False, "bri": 0, "transition": 0, "mainseg": 0, "seg": app.delSegments}
        send_request(ip, off_data)

    # Set global settings
    set_global_settings()

    # Initialize default segments
    segments = [{"id": 1, "start": 0, "stop": 1000, "col": [0, 0, 0]}]
    delSegments = [{"id": 1, "start": 0, "stop": 0, "col": [0, 0, 0]}]

    # Set color based on quantity
    color = [0, 255, 0] if quantity >= 1 else [255, 0, 0]

    # Parse and sort positions
    positions_list = PositionOptimization(sorted(json.loads(positions)))
    print(positions_list)
    # Check if positions have changed
    if app.previous_positions != positions:
        # Create segments based on positions
        for i, (start, end) in enumerate(positions_list):
            if start is None or end is None:
                continue  # Skip if pos is None
            start_num = int(start-1)
            stop_num = int(end)
            segments.append({"id": i + 2, "start": start_num, "stop": stop_num, "col": [color, [0, 0, 0], [0, 0, 0]]})
            delSegments.append({"id": i + 2, "start": start_num, "stop": 0, "col": [255, 255, 255]})

        # Turn on the new segments
        on_data = {"on": True, "bri": 255 * app.brightness, "transition": 0, "mainseg": 0, "seg": segments}
        send_request(ip, on_data)
        app.previous_positions = positions
    else:
        # Turn off existing segments and reset previous_positions if positions haven't changed
        off_data = {"bri": 255 * app.brightness, "transition": 5, "mainseg": 0, "seg": delSegments}
        send_request(ip, off_data)
        app.previous_positions = []
        app.timeout = 0

    # If timeout is set, sleep and then turn off the segments
    if app.timeout != 0 and not testing:
        time.sleep(app.timeout)
        off_data = {"bri": 255 * app.brightness, "transition": 5, "mainseg": 0, "seg": delSegments}
        send_request(ip, off_data)

    # For testing, sleep for at least 3 seconds and then turn off the segments
    if testing:
        app.previous_positions = []
        time.sleep(app.timeout + 3)
        off_data = {"bri": 255 * app.brightness, "transition": 5, "mainseg": 0, "seg": delSegments}
        send_request(ip, off_data)

    # Update global delSegments and previous_positions
    app.delSegments = delSegments
    app.previous_positions = []


def PositionOptimization(positions):
    segments = []
    start = positions[0]
    end = positions[0]
    for i in range(1, len(positions)):
        # Check if the current position is consecutive to the previous one
        if positions[i] == positions[i - 1] + 1:
            end = positions[i]
        else:
            segments .append((start, end))
            start = positions[i]
            end = positions[i]
    # Append the last segment
    segments .append((start, end))
    return segments



@app.route('/test_lights', methods=['POST'])
def test_lights():
    set_global_settings()
    lights_list = request.get_json()
    testing = True
    for ip, positions in lights_list.items():
        # Validate positions list
        if not positions or not all(isinstance(pos, int) for pos in positions):
            return {'error': 'Invalid positions list'}, 400
        positions_json = json.dumps(positions)
        light(positions_json, ip, 1, testing)
    return {'status': 'Lights controlled'}


@app.route('/led/on', methods=['GET'])
def turn_led_on():
    set_global_settings()
    if request.method == 'GET':
        ips = get_unique_ips_from_database()
        for ip in ips:
            on_data = {"on": True, "bri": 255 * app.brightness, "transition": 0, "mainseg": 0, "seg": [
                {"id": 0, "grp": 1, "spc": 0, "of": 0, "on": True, "frz": False, "bri": 255, "cct": 127, "set": 0,
                 "col": [[255 * app.brightness, 255 * app.brightness, 255 * app.brightness], [0, 0, 0], [0, 0, 0]],
                 "fx": 0, "sx": 128, "ix": 128, "pal": 0, "c1": 128, "c2": 128, "c3": 16}]}
            send_request(ip, on_data)
        return jsonify({'success': True})


# Route to turn the LED off
@app.route('/led/off', methods=['GET'])
def turn_led_off():
    set_global_settings()

    if request.method == 'GET':
        ips = get_unique_ips_from_database()
        for ip in ips:
            off_data = {"on": False, "bri": 128, "transition": 0, "mainseg": 0,
                        "seg": [{"id": 1, "start": 0, "stop": 0, "grp": 1}]}
            send_request(ip, off_data)
        return jsonify()


# Route to turn the LED to Party
@app.route('/led/party', methods=['GET'])
def turn_led_party():
    set_global_settings()
    if request.method == 'GET':
        ips = get_unique_ips_from_database()
        for ip in ips:
            party_data = {"on": True, "bri": round(255 * app.brightness), "transition": 5, "mainseg": 0, "seg": [
                {"id": 0, "grp": 1, "spc": 0, "of": 0, "on": True, "frz": False, "bri": 255, "cct": 127, "set": 0,
                 "col": [[255, 255, 255], [0, 0, 0], [0, 0, 0]], "fx": 9, "sx": 128, "ix": 128, "pal": 0, "c1": 128,
                 "c2": 128, "c3": 16}]}
            send_request(ip, party_data)
        return jsonify()


if __name__ == '__main__':
    app.run(host="0.0.0.0", debug=True)
