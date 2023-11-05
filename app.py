# Importing necessary modules and packages
from flask import Flask, render_template, jsonify, request, send_from_directory
import db
import requests
import time
import json

# Creating a Flask application instance
app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False

# Route to Favicon
@app.route('/favicon.ico')
def favicon():
    return send_from_directory(app.root_path, 'favicon.ico', mimetype='image/vnd.microsoft.icon')

# Route to Local Images
@app.route('/images/<path:path>')
def send_report(path):
    return send_from_directory('images', path)

# Route to the home page of the web application
@app.route('/')
def index():
    return render_template('index.html')

# Route to Create/Edit page
@app.route('/edititem')
def edititem():
    return render_template('edititem.html')

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
            try:
                enumerate_lights(json.loads(item['lights']))
                print(f"Lights of {item['name']}: {['lights']}")
                return jsonify({ 'success': True })
            except:
                return jsonify({ 'success': False })
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


def send_request(target_ip, segments):
    url = f"http://{target_ip}/json/state"
    state = {"seg": segments}
    response = requests.post(url, json=state)

def light(positions, ip):
    segments = [{"id": 1, "start": 0, "stop": 1000, "col": [0, 0, 0]}]
    delSegments = [{"id": 1, "start": 0, "stop": 0, "col": [0, 0, 0]}]
    for i, pos in enumerate(positions):
        start_num = pos - 1
        stop_num = pos
        segments.append({"id": i+2, "start": start_num, "stop": stop_num, "col": [255, 255, 255]})
        delSegments.append({"id": i+2, "start": start_num, "stop": 0, "col": [0, 0, 0]})
    
    send_request(ip, segments)
    time.sleep(5)
    send_request(ip, delSegments)

def enumerate_lights(lights_list):
    for ip, positions in lights_list.items():
        print("Positions: " + str(positions) + " IP: " + ip)
        light(positions, ip)


# Running the Flask application
if __name__ == '__main__':
    app.run(host="0.0.0.0", debug=True)