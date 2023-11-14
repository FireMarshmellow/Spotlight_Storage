import json
import sqlite3

# Defining the path of the SQLite database file
DATABASE = 'data.db'
DATABASE_ESP= 'esp.db'
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
            position INTEGER,
            quantity INTEGER,
            ip TEXT
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

def write_item(item):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO items (name, link, image, position, quantity, ip) VALUES (?, ?, ?, ?, ?, ?)', [item['name'], item['link'], item['image'], item['position'], item['quantity'], item['ip']])
    lastId = cursor.lastrowid
    conn.commit()
    conn.close()
    return lastId

# Function to update data in the database
def update_item(id, data):
    conn = get_db()
    conn.execute('UPDATE items SET name = ?, link = ?, image = ?, position = ?, quantity = ?, ip = ? WHERE id = ?', [data['name'], data['link'], data['image'], data['position'], data['quantity'], data['ip'], id])
    conn.commit()
    conn.close()

def get_item(id):
    conn = get_db()
    item = conn.execute('SELECT * FROM items WHERE id = ?', [id]).fetchone()
    conn.close()
    return item

def delete_item(id):
    conn = get_db()
    conn.execute('DELETE FROM items WHERE id = ?', [id])
    conn.commit()
    conn.close()


# Function to write data to the database

def get_espdb():
    conn = sqlite3.connect(DATABASE_ESP)
    conn.row_factory = sqlite3.Row
    # Modify the ESP table to include new columns and arrays
    conn.execute('''
        CREATE TABLE IF NOT EXISTS esp (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            esp_ip TEXT,
            rows INTEGER,
            cols INTEGER,
            start_top TEXT,
            start_left TEXT,
            serpentine_direction TEXT,
            compartment_count INTEGER
        )
    ''')
    conn.commit()
    return conn

# Function to write ESP settings to the database
def write_esp_settings(esp_settings):
    required_fields = ['esp_name', 'esp_ip', 'rows', 'cols', 'startTop', 'startLeft', 'serpentineDirection','compartment_count']
    if not all(field in esp_settings for field in required_fields):
        print("Missing required fields in esp_settings")
        return None

    conn = get_espdb()
    try:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO esp (name, esp_ip, rows, cols, start_top, start_left, serpentine_direction, compartment_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', [
            esp_settings['esp_name'],
            esp_settings['esp_ip'],
            esp_settings['rows'],
            esp_settings['cols'],
            esp_settings['startTop'],
            esp_settings['startLeft'],
            esp_settings['serpentineDirection'],
            esp_settings['compartment_count']  # Convert array to JSON string
        ])
        lastId = cursor.lastrowid
        conn.commit()
    except Exception as e:
        print(f"Database error: {e}")
        conn.rollback()
        lastId = None
    finally:
        conn.close()

    return lastId

# Function to update ESP settings in the database
def update_esp_settings(id, esp_settings):
    conn = get_espdb()
    try:
        conn.execute('''
            UPDATE esp
            SET name = ?, esp_ip = ?, rows = ?, cols = ?, start_top = ?, start_left = ?, serpentine_direction = ?, compartment_count = ?,
            WHERE id = ?
        ''', [
            esp_settings['esp_name'],
            esp_settings['esp_ip'],
            esp_settings['rows'],
            esp_settings['cols'],
            esp_settings['startTop'],
            esp_settings['startLeft'],
            esp_settings['serpentineDirection'],
            esp_settings['compartment_count'],
            
            id
        ])
        conn.commit()
    except sqlite3.Error as e:
        conn.rollback()
    finally:
        conn.close()

# Function to get ESP settings from the database by ID
def get_esp_settings(id):
    conn = get_espdb()
    esp_settings = conn.execute('SELECT * FROM esp WHERE id = ?', [id]).fetchone()
    conn.close()
    if esp_settings:
        return dict(esp_settings)
    else:
        return None  # Return None if no matching settings are found

def read_esp():
    conn = get_espdb()
    esps = conn.execute('SELECT * FROM esp').fetchall()
    conn.close()
    return [dict(esp) for esp in esps]


# Function to delete ESP settings from the database by ID
def delete_esp_settings(id):
    conn = get_espdb()
    try:
        conn.execute('DELETE FROM esp WHERE id = ?', [id])
        conn.commit()
    except sqlite3.Error as e:
        conn.rollback()
    finally:
        conn.close()
def read_esp():
    conn = get_espdb()
    esps = conn.execute('SELECT * FROM esp').fetchall()
    conn.close()
    return [dict(esp) for esp in esps]

def get_esp_settings_by_ip(id):
    print('the esp_id is', id)
    conn = get_espdb()  # Get a database connection
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM esp WHERE id = ?', (id,))
        row = cursor.fetchone()
        
        if row is None:
            return None  # No record found for the given IP

        # Convert the row to a dictionary
        esp_settings = {col[0]: row[idx] for idx, col in enumerate(cursor.description)}
        print(esp_settings)
        return esp_settings

    except Exception as e:
        print(f"Database error: {e}")
        return None

    finally:
        conn.close()


