# Importing necessary modules and packages
from flask import Flask, render_template, jsonify, request
import db
import requests
import time

# Creating a Flask application instance
app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False

# Route to the home page of the web application
@app.route('/')
def index():
    return render_template('index.html')

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
        esp_data = db.get_esp_settings(id)
        return jsonify(esp_data) if esp_data else jsonify({'error': 'ESP not found'}), 404

    elif request.method == 'PUT':
        esp_data = request.get_json()
        db.update_esp_settings(id, esp_data)
        print(f"saved data of {esp_data}")
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
@app.route('/api/items/<id>', methods=['GET', 'PUT', 'DELETE'])
def item(id):
    if request.method == 'GET':
        item = db.get_item(id)
        if item:
            return jsonify(item)
        else:
            return jsonify({'error': 'Item not found'}), 404

    elif request.method == 'PUT':
        updated_item = request.get_json()
        db.update_item(id, updated_item)
        return jsonify({'success': True})

    elif request.method == 'DELETE':
        db.delete_item(id)
        return jsonify({'success': True})

# Function to send request to WLED
def send_request(target_ip, segments):
    url = f"http://{target_ip}/json/state"
    state = {"seg": segments}
    print(segments)
    requests.post(url, json=state)
    
# Function to control lights
def light(positions, ip):
    segments = [{"id": 1, "start": 0, "stop": 1000, "col": [0, 0, 0]}]
    delSegments = [{"id": 1, "start": 0, "stop": 0, "col": [0, 0, 0]}]
    for i, pos in enumerate(positions):
        if pos is None:
            continue  # Skip if pos is None
        start_num = pos - 1
        stop_num = pos
        segments.append({"id": i+2, "start": start_num, "stop": stop_num, "col": [255, 0, 0]})
        delSegments.append({"id": i+2, "start": start_num, "stop": 0, "col": [0, 0, 0]})

    # Send the initial segments
    send_request(ip, segments)

    # Wait for a response or confirmation from the device (you may need to adjust the sleep duration)
    time.sleep(2)

    # Send the delSegments after receiving confirmation
    send_request(ip, delSegments)



@app.route('/test_lights', methods=['POST'])
def control_lights():
    lights_list = request.get_json()
    print("Received lights list:", lights_list)  # Debugging print statement

    for ip, positions in lights_list.items():
        # Validate positions list
        if not positions or not all(isinstance(pos, int) for pos in positions):
            return {'error': 'Invalid positions list'}, 400

        light(positions, ip)
    return {'status': 'Lights controlled'}



if __name__ == '__main__':
    app.run(host="0.0.0.0", debug=True)
