# Importing necessary modules and packages
from flask import Flask, render_template, jsonify, request
import csv
import os
import wled_api

# Creating a Flask application instance
app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False

# Defining the path of the data file
DATA_FILE = 'data.csv'

# Function to read the data from the CSV file
def read_csv():
    items = []
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, newline='') as f:
            reader = csv.DictReader(f)
            items = list(reader)
    return items

# Function to write data to the CSV file
def write_csv(items):
    with open(DATA_FILE, 'w', newline='') as f:
        fieldnames = ['id', 'name', 'link', 'image', 'position']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for item in items:
            writer.writerow(item)

# Route to the home page of the web application
@app.route('/')
def index():
    return render_template('index.html')

# Route to handle GET and POST requests for items
@app.route('/api/items', methods=['GET', 'POST'])
def items():
    if request.method == 'GET':
        # If the request method is GET, read data from the CSV file and return as JSON
        items = read_csv()
        return jsonify(items)
    elif request.method == 'POST':
        # If the request method is POST, read data from the CSV file, add new item, and write back to the CSV file
        item = request.get_json()
        items = read_csv()
        item['id'] = str(max(int(i['id']) for i in items) + 1)
        items.append(item)
        write_csv(items)
        return jsonify(item)

# Route to handle GET, PUT, DELETE and POST requests for an individual item
@app.route('/api/items/<id>', methods=['GET', 'PUT', 'DELETE', 'POST'])
def item(id):
    items = read_csv()
    item = next((item for item in items if item['id'] == id), None)
    if not item:
        return jsonify({ 'error': 'Item not found' }), 404
    if request.method == 'GET':
        # If the request method is GET, return the item as JSON
        return jsonify(item)
    elif request.method == 'PUT':
        # If the request method is PUT, update the item, write back to the CSV file, and return the updated item as JSON
        item.update(request.get_json())
        write_csv(items)
        return jsonify(item)
    elif request.method == 'DELETE':
        # If the request method is DELETE, remove the item, write back to the CSV file, and return a success message as JSON
        items = [i for i in items if i['id'] != id]
        write_csv(items)
        return jsonify({ 'success': True })
    elif request.method == 'POST':
        if request.form.get('action') != 'locate':
            return jsonify({ 'error': 'Invalid action' }), 400
        position = tuple(map(int, item['position'].split(',')))
        wled_api.lights(position)
        print(f"Position of {item['name']}: {position}")
        return jsonify({ 'success': True })

# Route to handle DELETE requests for an individual item
@app.route('/api/items/<id>', methods=['DELETE'])
def delete_item(id):
    items = read_csv
    # If the request method is DELETE, remove the item, write back to the CSV file, and return a success message as JSON
    items = [item for item in items if item['id'] != id]
    write_csv(items)
    return jsonify({ 'success': True })

# Running the Flask application
if __name__ == '__main__':
    app.run(host="0.0.0.0", debug=True)
