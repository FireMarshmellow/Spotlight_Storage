# Importing necessary modules and packages
from flask import Flask, render_template, jsonify, request
import os
import wled_api
import sqlite3

# Creating a Flask application instance
app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False

# Defining the path of the SQLite database file
DATABASE = 'data.db'

# Function to connect to the database
def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row

    # Create the items table if it does not exist
    conn.execute('''
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            link TEXT NOT NULL,
            image TEXT,
            position TEXT
        )
    ''')
    conn.commit()
    
    return conn


# Function to read the data from the database
def read_items():
    conn = get_db()
    items = conn.execute('SELECT * FROM items').fetchall()
    conn.close()
    return [dict(item) for item in items]

# Function to write data to the database
def write_item(item):
    conn = get_db()
    conn.execute('INSERT INTO items (name, link, image, position) VALUES (?, ?, ?, ?)', [item['name'], item['link'], item['image'], item['position']])
    conn.commit()
    conn.close()

# Route to the home page of the web application
@app.route('/')
def index():
    return render_template('index.html')

# Route to handle GET and POST requests for items
@app.route('/api/items', methods=['GET', 'POST'])
def items():
    if request.method == 'GET':
        # If the request method is GET, read data from the database and return as JSON
        items = read_items()
        return jsonify(items)
    elif request.method == 'POST':
        # If the request method is POST, add new item to the database and return the item as JSON
        item = request.get_json()
        write_item(item)
        return jsonify(item)

# Route to handle GET, PUT, DELETE and POST requests for an individual item
@app.route('/api/items/<id>', methods=['GET', 'PUT', 'DELETE', 'POST'])
def item(id):
    conn = get_db()
    item = conn.execute('SELECT * FROM items WHERE id = ?', [id]).fetchone()
    conn.close()
    if not item:
        return jsonify({ 'error': 'Item not found' }), 404
    if request.method == 'GET':
        # If the request method is GET, return the item as JSON
        return jsonify(dict(item))
    elif request.method == 'PUT':
        # If the request method is PUT, update the item in the database and return the updated item as JSON
        new_data = request.get_json()
        conn = get_db()
        conn.execute('UPDATE items SET name = ?, link = ?, image = ?, position = ? WHERE id = ?', [new_data['name'], new_data['link'], new_data['image'], new_data['position'], id])
        conn.commit()
        conn.close()
        item = conn.execute('SELECT * FROM items WHERE id = ?', [id]).fetchone()
        return jsonify(dict(item))
    elif request.method == 'DELETE':
        # If the request method is DELETE, remove the item from the database and return a success message as JSON
        conn = get_db()
        conn.execute('DELETE FROM items WHERE id = ?', [id])
        conn.commit()
        conn.close()
        return jsonify({ 'success': True })
    elif request.method == 'POST':
        # If the request method is POST, check if the request is for locating the item, and send the position to a WLED API
        if request.form.get('action') == 'locate':
            position = item['position']
            wled_api.lights(position)
            print(f"Position of {item['name']}: {position}")
            return jsonify({ 'success': True })
        else:
            return jsonify({ 'error': 'Invalid action' }), 400

# Route to handle DELETE requests for an individual item
@app.route('/api/items/<id>', methods=['DELETE'])
def delete_item(id):
    conn = get_db()
    # If the request method is DELETE, remove the item from the database and return a success message as JSON
    conn.execute('DELETE FROM items WHERE id = ?', [id])
    conn.commit()
    conn.close()
    return jsonify({ 'success': True })

# Running the Flask application
if __name__ == '__main__':
    app.run(host="0.0.0.0", debug=True)

