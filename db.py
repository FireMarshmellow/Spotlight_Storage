import sqlite3

# Defining the path of the SQLite database file
DATABASE = 'data.db'
DATABASE_SETTING= 'settings.db'
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


def get_settingsdb():
    conn = sqlite3.connect(DATABASE_SETTING)
    conn.row_factory = sqlite3.Row
    # Create the settings table if it does not exist
    conn.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            brightness INTEGER
        )
    ''')

    conn.commit()
    return conn

# Function to read settings from the database
def read_settings():
    conn = get_settingsdb()
    settings = conn.execute('SELECT * FROM settings').fetchone()
    conn.close()
    if settings is None:
        return {}
    else:
        return dict(settings)

# Function to update settings in the database
def update_settings(settings):
    conn = get_settingsdb()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM settings')  # Clear existing settings
    cursor.execute('INSERT INTO settings (brightness) VALUES (?)', [settings['brightness']])
    conn.commit()
    conn.close()

# Function to write data to the database

def get_espdb():
    conn = sqlite3.connect(DATABASE_ESP)
    conn.row_factory = sqlite3.Row
    # Create the settings table if it does not exist
    conn.execute('''
        CREATE TABLE IF NOT EXISTS esp (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            esp_ip TEXT,
            led_count INTEGER,
            segment_size INTEGER
        )
    ''')

    conn.commit()
    return conn





# Function to write ESP settings to the database
def write_esp_settings(esp_settings):
    conn = get_espdb()
    cursor = conn.cursor()
    try:
        cursor.execute('INSERT INTO esp (esp_ip, led_count, segment_size) VALUES (?, ?, ?)',
                       [esp_settings['esp_ip'], esp_settings['led_count'], esp_settings['segment_size']])
        lastId = cursor.lastrowid
        conn.commit()
    except sqlite3.Error as e:
        conn.rollback()
        lastId = None
    finally:
        conn.close()
    return lastId

# Function to update ESP settings in the database
def update_esp_settings(id, esp_settings):
    conn = get_espdb()
    try:
        conn.execute('UPDATE esp SET esp_ip = ?, led_count = ?, segment_size = ? WHERE id = ?',
                     [esp_settings['esp_ip'], esp_settings['led_count'], esp_settings['segment_size'], id])
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
    return esp_settings

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

def get_esp_settings_by_ip(esp_ip):
    conn = get_espdb()
    esp_settings = conn.execute('SELECT * FROM esp WHERE esp_ip = ?', [esp_ip]).fetchone()
    conn.close()

    if esp_settings:
        return dict(esp_settings)
    else:
        return None  # Return None if no matching settings are found

