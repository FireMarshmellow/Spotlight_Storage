from flask import Flask, render_template, jsonify, request
import csv
import os
import wled_api

app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False

DATA_FILE = 'data.csv'

def read_csv():
    items = []
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, newline='') as f:
            reader = csv.DictReader(f)
            items = [row for row in reader]
    return items

def write_csv(items):
    with open(DATA_FILE, 'w', newline='') as f:
        fieldnames = ['id', 'name', 'link', 'image', 'position']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for item in items:
            writer.writerow(item)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/items', methods=['GET', 'POST'])
def items():
    if request.method == 'GET':
        items = read_csv()
        return jsonify(items)
    elif request.method == 'POST':
        item = request.get_json()
        items = read_csv()
        item['id'] = str(len(items) + 1)
        items.append(item)
        write_csv(items)
        return jsonify(item)


@app.route('/api/items/<id>', methods=['GET', 'PUT', 'DELETE', 'POST'])
def item(id):
    items = read_csv()
    item = next((item for item in items if item['id'] == id), None)
    if not item:
        return jsonify({ 'error': 'Item not found' }), 404
    if request.method == 'GET':
        return jsonify(item)
    elif request.method == 'PUT':
        item.update(request.get_json())
        write_csv(items)
        return jsonify(item)
    elif request.method == 'DELETE':
        items = [i for i in items if i['id'] != id]
        write_csv(items)
        return jsonify({ 'success': True })
    elif request.method == 'POST':
        if request.form.get('action') == 'locate':
            position = item['position']
            wled_api.light_on(position)
            print(f"Position of {item['name']}: {position}")
            return jsonify({ 'success': True })
        else:
            return jsonify({ 'error': 'Invalid action' }), 400


@app.route('/api/items/<id>', methods=['DELETE'])
def delete_item(id):
    items = read_csv()
    items = [item for item in items if item['id'] != id]
    write_csv(items)
    return jsonify({ 'success': True })

if __name__ == '__main__':
    app.run(debug=True)