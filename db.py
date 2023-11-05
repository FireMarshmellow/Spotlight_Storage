import sqlite3

# Defining the path of the SQLite database file
DATABASE = 'data.db'

# Function to connect to the database
def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row

    # Create the items table if it does not exist
    conn.execute('''
        CREATE TABLE IF NOT EXISTS items (''' + # items2 because i do not want to destroy old databases, will need to create a convert function 
         '''id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            link TEXT NOT NULL,
            image TEXT,
            quantity INTEGER,
            lights TEXT
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
    cursor = conn.cursor()
    cursor.execute('INSERT INTO items (name, link, image, quantity, lights) VALUES (?, ?, ?, ?, ?)', [item['name'], item['link'], item['image'], item['quantity'], item['lights']])
    lastId = cursor.lastrowid
    conn.commit()
    conn.close()
    return lastId

def delete_item(id):
    conn = get_db()
    conn.execute('DELETE FROM items WHERE id = ?', [id])
    conn.commit()
    conn.close()

def get_item(id):
    conn = get_db()
    item = conn.execute('SELECT * FROM items WHERE id = ?', [id]).fetchone()
    conn.close()
    return item

def update_item(id, data):
    conn = get_db()
    conn.execute('UPDATE items SET name = ?, link = ?, image = ?, quantity = ?, lights = ? WHERE id = ?', [data['name'], data['link'], data['image'], data['quantity'], data['lights'], id])
    conn.commit()
    conn.close()
