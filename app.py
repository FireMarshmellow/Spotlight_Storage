# Importing necessary modules and packages
from flask import Flask, render_template, jsonify, request
import db
import requests
import time
import threading
# Creating a Flask application instance
app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False
# Global variable to store the timer start time
app.timer_start_time = time.time()
# Define default values for settings
app.segment_size = 5
app.led_count = 300
app.brightness = 0.5
def get_unique_ips_from_database():
    # Get all items from the database
    items = db.read_items()
    # Create a set to store unique IP addresses
    unique_ips = set()
    # Iterate through the items and extract unique IPs
    for item in items:
        ip = item.get('ip')
        if ip:
            unique_ips.add(ip)
    # Convert the set of unique IPs back to a list (if needed)
    unique_ips_list = list(unique_ips)

    return unique_ips_list
def set_global_brightness():
    brightness = db.read_settings()
    if brightness:
        app.brightness = brightness['brightness']/100
    else: app.brightness = 0.50
def set_global_settings(target_ip):
    esp_settings = db.get_esp_settings_by_ip(target_ip)
    if esp_settings:
        app.segment_size = esp_settings['segment_size']  # Set segment size from database
        app.led_count = esp_settings['led_count']  # Set LED count from database
    else:
        # Handle the case where ESP settings are not found in the database
        # You can set default values or raise an error as needed.
        app.segment_size = 5
        app.led_count = 300


@app.route('/api/settings', methods=['GET', 'POST'])
def settings():
    if request.method == 'GET':
        # If the request method is GET, read data from the database and return as JSON
        settings = db.read_settings()
        return jsonify(settings)
    elif request.method == 'POST':
        settings = request.get_json()
        db.update_settings(settings)  # Update settings in the database
        return jsonify({ 'success': True })
# Route to the home page of the web application
@app.route('/api/esp/', methods=['GET', 'POST'])
def esps():
    if request.method == 'GET':
        esps = db.read_esp()
        return jsonify(esps)
    elif request.method == 'POST':
        esp = request.get_json()
        id = db.write_esp_settings(esp)
        esp['id'] = id
        return jsonify(esp)

@app.route('/api/esp/<id>', methods=['GET'])
def get_esp_by_id(id):
    esp_data = db.get_esp_settings(id)
    if esp_data:
        return jsonify({
            'id': esp_data[0],
            'esp_ip': esp_data[1],
            'led_count': esp_data[2],
            'segment_size': esp_data[3]
        })
@app.route('/api/esp/<id>', methods=['PUT'])
def update_esp_by_id(id):
    # Parse the JSON data from the request
    esp_data = request.get_json()

    # Update the ESP settings in the database
    db.update_esp_settings(id, esp_data)

    return jsonify({'success': True})
@app.route('/api/esp/<id>', methods=['DELETE'])
def delete_esp_by_id(id):
    # Delete the ESP settings in the database
    db.delete_esp_settings(id)
    return jsonify({'success': True})
@app.route('/')
def index():
    return render_template('index.html')

# Route to handle GET and POST requests for items
@app.route('/api/items', methods=['GET', 'POST'])
def items():
    if request.method == 'GET':
        # If the request method is GET, read data from the database and return as JSON
        items = db.read_items()
        return jsonify(items)
    elif request.method == 'POST':
        # If the request method is POST, add new item to the database and return the item as JSON
        item = request.get_json()
        id = db.write_item(item)
        item['id'] = id

        return jsonify(item)

# Route to handle GET, PUT, DELETE and POST requests for an individual item
@app.route('/api/items/<id>', methods=['GET', 'PUT', 'DELETE', 'POST'])
def item(id):
    item = db.get_item(id)
    if not item:
        return jsonify({ 'error': 'Item not found' }), 404
    if request.method == 'GET':
        # If the request method is GET, return the item as JSON
        return jsonify(dict(item))
    elif request.method == 'PUT':
        # If the request method is PUT, update the item in the database and return the updated item as JSON
        db.update_item(id, request.get_json())
        item = db.get_item(id)
        return jsonify(dict(item))
    elif request.method == 'DELETE':
        # If the request method is DELETE, remove the item from the database and return a success message as JSON
        db.delete_item(id)
        return jsonify({ 'success': True })
    elif request.method == 'POST':
        # If the request method is POST, check if the request is for locating the item, and send the position to a WLED API
        if request.form.get('action') == 'locate':

            if item['quantity'] > 0:
                lights(item['position'], item['ip'], empty=False)  # Call the 'lights' function without turning the LEDs red
                #print(f"Position of {item['name']}: {item['position']}: {item['ip']}")
                return jsonify({'success': True})
            else:
                lights(item['position'], item['ip'], empty=True)  # Call the 'lights' function with the red flag set to True
                #print(f"Position of {item['name']}: {item['position']}: {item['ip']}")
                return jsonify({'success': True})
        elif request.form.get('action') == 'addQuantity': #incrementing the quantity by 1 instead of append a digit next to the current quantity
            item['quantity'] = int(item['quantity']) + 1
            db.update_item(id, item)
            return jsonify({ 'success': True })
        elif request.form.get('action') == 'removeQuantity':
            item['quantity'] -= 1
            db.update_item(id, item)
            return jsonify({ 'success': True })
        elif request.form.get('action') == 'setQuantity':
            new_quantity = int(request.form.get('quantity'))
            if new_quantity >= 1:
                item['quantity'] = new_quantity
                db.update_item(id, item)
                return jsonify({ 'success': True })

        else:
            return jsonify({ 'error': 'Invalid action' }), 400

# Route to handle DELETE requests for an individual item
@app.route('/api/items/<id>', methods=['DELETE'])
def delete_item(id):
    db.delete_item(id)
    return jsonify({ 'success': True })

def send_request(target_ip, data):
    url = f"http://{target_ip}/json/state"
    response = requests.post(url, json=data)
def lights(position, ip, empty=False):
    set_global_settings(ip)
    set_global_brightness()
    start_num = round((int(position) - 1) * app.segment_size)
    end_num = round(start_num + app.segment_size)
    if empty:
        # Turn LEDs red
            pulsate_data = {"on":True,"bri":255,"transition":0,"mainseg":0,"seg":[{"id":0,"start":start_num,"stop":end_num,"grp":1,"spc":0,"of":0,"on":True,
                    "frz":False,"bri":255,"cct":127,"set":0,"col":[[255*app.brightness,0,0],[0,0,0],[0,0,0]],
                    "fx":2,"sx":200,"ix":200,"pal":0,"c1":128,"c2":128,"c3":16,"sel":True,
                    "rev":False,"mi":False,"o1":False,"o2":False,"o3":False,"si":0,"m12":0},
                    {"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},
                    {"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},
                    {"stop":0}]}


    else:
        # Use green color
            pulsate_data = {"on":True,"bri":255,"transition":0,"mainseg":0,"seg":[{"id":0,"start":start_num,"stop":end_num,"grp":1,"spc":0,"of":0,"on":True,
                  "frz":False,"bri":255,"cct":127,"set":0,"col":[[0,255*app.brightness,0],[0,0,0],[0,0,0]],
                 "fx":2,"sx":200,"ix":200,"pal":0,"c1":128,"c2":128,"c3":16,"sel":True,
                 "rev":False,"mi":False,"o1":False,"o2":False,"o3":False,"si":0,"m12":0},
                {"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},
                {"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},
                {"stop":0}]}
    send_request(ip, pulsate_data)


# Route to turn the LED on
@app.route('/led/on', methods=['GET'])
def turn_led_on():
    set_global_brightness()
    if request.method == 'GET':
        ips = get_unique_ips_from_database()
        for ip in ips:
            set_global_settings(ip)
            on_data = {"on":True,"bri":255,"transition":0,"mainseg":0,"seg":[{"id":0,"start":0,"stop":app.led_count,"grp":1,"spc":0,"of":0,"on":True,"frz":False,"bri":255,"cct":127,"set":0,"col":[[255*app.brightness,255*app.brightness,255*app.brightness],[0,0,0],[0,0,0]],"fx":0,"sx":128,"ix":128,"pal":0,"c1":128,"c2":128,"c3":16,"sel":True,"rev":False,"mi":False,"o1":False,"o2":False,"o3":False,"si":0,"m12":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0}]}
            send_request(ip, on_data)
        return jsonify({ 'success': True})

# Route to turn the LED off
@app.route('/led/off', methods=['GET'])
def turn_led_off():
    set_global_brightness()

    if request.method == 'GET':
        ips = get_unique_ips_from_database()
        for ip in ips:
            set_global_settings(ip)
            off_data = {"on":False,"bri":128,"transition":0,"mainseg":0,"seg":[{"id":0,"start":0,"stop":app.led_count,"grp":1}]}
            send_request(ip, off_data)
        return jsonify()
# Route to turn the LED to Party
@app.route('/led/party', methods=['GET'])
def turn_led_party():
    set_global_brightness()
    if request.method == 'GET':
        ips = get_unique_ips_from_database()
        for ip in ips:
            set_global_settings(ip)
            party_data = {"on":True,"bri":round(255*app.brightness),"transition":5,"mainseg":0,"seg":[{"id":0,"start":0,"stop":app.led_count,"grp":1,"spc":0,"of":0,"on":True,"frz":False,"bri":255,"cct":127,"set":0,"col":[[255,255,255],[0,0,0],[0,0,0]],"fx":9,"sx":128,"ix":128,"pal":0,"c1":128,"c2":128,"c3":16,"sel":True,"rev":False,"mi":False,"o1":False,"o2":False,"o3":False,"si":0,"m12":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0},{"stop":0}]}
            send_request(ip, party_data)
        return jsonify()
@app.route('/led/brightness', methods=['GET'])
def apply_brightness():
    set_global_brightness()
    if request.method == 'GET':
        ips = get_unique_ips_from_database()
        for ip in ips:
            set_global_settings(ip)
            brightness_data = {"on":True,"bri":round(255*app.brightness),"transition":5}
            send_request(ip, brightness_data)
        return jsonify()
if __name__ == '__main__':
    app.run(host="0.0.0.0", debug=True)
    set_global_brightness()