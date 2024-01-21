import json
import os
import sqlite3
from collections import Counter

# Define the path for the combined database
COMBINED_DATABASE = 'combined_data.db'


def create_combined_db():
    # Connect to the combined database
    conn_combined = sqlite3.connect(COMBINED_DATABASE)
    conn_combined.row_factory = sqlite3.Row

    # Create items table in the combined database
    conn_combined.execute('''
            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                link TEXT,
                image TEXT,
                position TEXT,
                quantity INTEGER,
                ip TEXT,
                tags TEXT 
            )
        ''')

    # Create esp table in the combined database
    conn_combined.execute('''
            CREATE TABLE IF NOT EXISTS esp (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                esp_ip TEXT,
                rows INTEGER,
                cols INTEGER,
                start_top TEXT,
                start_left TEXT,
                serpentine_direction TEXT
            )
        ''')

    # Create settings table in the combined database
    conn_combined.execute('''
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                brightness INTEGER,
                timeout INTEGER,
                lightMode TEXT DEFAULT 'light'
            )
        ''')

    # Commit the changes
    conn_combined.commit()
    return conn_combined


# Function to read the data from the database
def read_items():
    conn = create_combined_db()
    items = conn.execute('SELECT * FROM items').fetchall()
    conn.close()
    return [dict(item) for item in items]


def write_item(item):
    conn = create_combined_db()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO items (name, link, image, position, quantity, ip, tags) VALUES (?, ?, ?, ?, ?, ?, ?)',
                   [item['name'], item['link'], item['image'], item['position'], item['quantity'], item['ip'],
                    item['tags']])
    lastId = cursor.lastrowid
    conn.commit()
    conn.close()
    return lastId


# Function to update data in the database
def update_item(id, data):
    conn = create_combined_db()
    try:
        conn.execute(
            'UPDATE items SET name = ?, link = ?, image = ?, position = ?, quantity = ?, ip = ?, tags = ? WHERE id = ?',
            [data['name'], data['link'], data['image'], data['position'], data['quantity'], data['ip'], data['tags'],
             id])
        conn.commit()

    except sqlite3.Error as e:
        conn.rollback()
    finally:
        conn.close()


def get_item(id):
    conn = create_combined_db()
    item = conn.execute('SELECT * FROM items WHERE id = ?', [id]).fetchone()
    conn.close()
    return dict(item) if item else None


def delete_item(id):
    conn = create_combined_db()
    conn.execute('DELETE FROM items WHERE id = ?', [id])
    conn.commit()
    conn.close()


# Function to write ESP settings to the database
def write_esp_settings(esp_settings):
    required_fields = ['name', 'esp_ip', 'rows', 'cols', 'startTop', 'startLeft', 'serpentineDirection']
    if not all(field in esp_settings for field in required_fields):
        print("Missing required fields in esp_settings")
        return None

    conn = create_combined_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO esp (name, esp_ip, rows, cols, start_top, start_left, serpentine_direction) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                esp_settings['name'],
                esp_settings['esp_ip'],
                esp_settings['rows'],
                esp_settings['cols'],
                esp_settings['startTop'],
                esp_settings['startLeft'],
                esp_settings['serpentineDirection']
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
# Function to update ESP settings in the database
def update_esp_settings(id, esp_settings):
    conn = create_combined_db()
    try:
        conn.execute(
            'UPDATE esp SET name = ?, esp_ip = ?, rows = ?, cols = ?, start_top = ?, start_left = ?, serpentine_direction = ? WHERE id = ?',
            [
                esp_settings['name'],
                esp_settings['esp_ip'],
                esp_settings['rows'],
                esp_settings['cols'],
                esp_settings['startTop'],
                esp_settings['startLeft'],
                esp_settings['serpentineDirection'],
                id
            ])
        conn.commit()
    except sqlite3.Error as e:
        conn.rollback()

    finally:
        conn.close()


# Function to get ESP settings from the database by ID
def get_esp_settings(id):
    conn = create_combined_db()
    esp_settings = conn.execute('SELECT * FROM esp WHERE id = ?', [id]).fetchone()
    conn.close()
    if esp_settings:
        return dict(esp_settings)
    else:
        return None  # Return None if no matching settings are found


def read_esp():
    conn = create_combined_db()
    esps = conn.execute('SELECT * FROM esp').fetchall()
    conn.close()
    return [dict(esp) for esp in esps]


# Function to delete ESP settings from the database by ID
def delete_esp_settings(id):
    conn = create_combined_db()
    try:
        conn.execute('DELETE FROM esp WHERE id = ?', [id])
        conn.commit()
    except sqlite3.Error as e:
        conn.rollback()
    finally:
        conn.close()


def get_esp_settings_by_ip(id):
    conn = create_combined_db()  # Get a database connection
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM esp WHERE id = ?', (id,))
        row = cursor.fetchone()

        if row is None:
            return None  # No record found for the given IP

        # Convert the row to a dictionary
        esp_settings = {col[0]: row[idx] for idx, col in enumerate(cursor.description)}
        return esp_settings

    except Exception as e:
        print(f"Database error: {e}")
        return None

    finally:
        conn.close()


def get_ip_by_name(esp_name):
    conn = create_combined_db()
    esp = conn.execute('SELECT esp_ip FROM esp WHERE name = ?', (esp_name,)).fetchone()
    conn.close()
    return esp['esp_ip'] if esp else None


# Function to read settings from the database
def read_settings():
    conn = create_combined_db()
    settings = conn.execute('SELECT * FROM settings').fetchone()
    conn.close()
    if settings is None:
        return {}
    else:
        return dict(settings)


# Function to update settings in the database
def update_settings(settings):
    try:
        conn = create_combined_db()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM settings')  # Clear existing settings
        cursor.execute('INSERT INTO settings (brightness, timeout, lightMode) VALUES (?,?,?)',
                       [settings['brightness'], settings['timeout'], settings['lightMode']])
        conn.commit()
    except sqlite3.Error as e:
        print(f"SQLite error: {e}")
    finally:
        conn.close()


def get_all_tags():
    conn = create_combined_db()
    cursor = conn.cursor()

    try:
        # Fetch all distinct tags from the items table
        cursor.execute('SELECT tags FROM items')
        raw_tags = [tag['tags'] for tag in cursor.fetchall() if tag['tags']]

        # Parse the JSON strings representing lists
        tags = [tag for raw_tag in raw_tags for tag in json.loads(raw_tag)]
        # Count the occurrences of each tag
        tag_counts = Counter(tags)
        unique_tags_with_count = [{'tag': tag, 'count': count} for tag, count in tag_counts.items()]
        unique_tags_with_count.sort(key=lambda x: x['count'], reverse=True)
        return unique_tags_with_count
    finally:
        conn.close()


# Migration only needed if you are coming from an older version.

DATABASE = 'data.db'
DATABASE_ESP = 'esp.db'
DATABASE_SETTING = 'settings.db'


def get_db_connection(database_name):
    """Function to get a database connection."""
    conn = sqlite3.connect(database_name)
    conn.row_factory = sqlite3.Row
    return conn


def migrate_items():
    """Migrate items from data.db to combined_data.db."""
    conn_data = get_db_connection(DATABASE)
    items = conn_data.execute('SELECT * FROM items').fetchall()

    conn_combined = sqlite3.connect(COMBINED_DATABASE)
    for item in items:
        # Extract only the first 7 columns plus the 'tags' column
        columns_to_insert = [
            item['name'], item['link'], item['image'],
            item['position'], item['quantity'], item['ip'], item['tags']
        ]

        conn_combined.execute(
            'INSERT INTO items (name, link, image, position, quantity, ip, tags) VALUES (?, ?, ?, ?, ?, ?, ?)',
            columns_to_insert
        )

    conn_combined.commit()
    conn_data.close()
    conn_combined.close()


def migrate_esp_settings():
    """Migrate ESP settings from esp.db to combined_data.db."""
    conn_esp = get_db_connection(DATABASE_ESP)
    esp_settings_list = conn_esp.execute('SELECT * FROM esp').fetchall()
    conn_combined = sqlite3.connect(COMBINED_DATABASE)
    for esp_settings in esp_settings_list:
        conn_combined.execute(
            'INSERT INTO esp (name, esp_ip, rows, cols, start_top, start_left, serpentine_direction) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [esp_settings['name'], esp_settings['esp_ip'], esp_settings['rows'], esp_settings['cols'],
             esp_settings['start_top'], esp_settings['start_left'], esp_settings['serpentine_direction']]
        )

    conn_combined.commit()
    conn_esp.close()
    conn_combined.close()


def migrate_settings():
    """Migrate general settings from settings.db to combined_data.db."""
    conn_settings = get_db_connection(DATABASE_SETTING)
    settings = conn_settings.execute('SELECT * FROM settings').fetchone()

    conn_combined = sqlite3.connect(COMBINED_DATABASE)
    conn_combined.execute(
        'INSERT INTO settings (brightness, timeout, lightMode) VALUES (?, ?, ?)',
        [settings['brightness'], settings['timeout'], settings['lightMode']]
    )

    conn_combined.commit()
    conn_settings.close()
    conn_combined.close()


def is_database_empty(database_name, table_name):
    """Check if a table in a database is empty."""
    conn = get_db_connection(database_name)
    cursor = conn.cursor()
    cursor.execute(f'SELECT COUNT(*) FROM {table_name}')
    count = cursor.fetchone()[0]
    conn.close()
    return count


def should_perform_migration(database_path, table_name):
    """Check if migration should be performed for a specific database and table."""

    # Check if the individual database exists
    if os.path.exists(database_path):
        # Check if the combined database is not empty for the specified table
        return not is_database_empty(COMBINED_DATABASE, table_name)
    return False


def perform_migration():
    """Perform migration."""
    create_combined_db()
    # Check and migrate items
    if should_perform_migration(DATABASE, 'items'):
        migrate_items()
        print("Items migration successful.")
    # Check and migrate ESP settings
    if should_perform_migration(DATABASE_ESP, 'esp'):
        migrate_esp_settings()
        print("ESP settings migration successful.")
    # Check and migrate general settings
    if should_perform_migration(DATABASE_SETTING, 'settings'):
        migrate_settings()
        print("General settings migration successful.")


# Perform migration
perform_migration()
