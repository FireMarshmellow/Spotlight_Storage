import json
import os
import shutil
import sqlite3
from collections import Counter

# Define the path for the combined database
COMBINED_DATABASE = 'data/combined_data.db'


def create_combined_db():
    # Ensure the 'data' directory exists
    if not os.path.exists(os.path.dirname(COMBINED_DATABASE)):
        os.makedirs(os.path.dirname(COMBINED_DATABASE))  # Connect to the combined database

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
                brightness INTEGER DEFAULT 100,
                timeout INTEGER DEFAULT 5,
                lightMode TEXT DEFAULT 'light',
                colors TEXT DEFAULT '[#00ff00, #00ff00]',
                language TEXT DEFAULT 'en'
            )
        ''')

    # Commit the changes
    conn_combined.commit()

    # Check and add new columns if they don't exist
    cursor = conn_combined.cursor()

    # Check for the existence of 'colors' column
    cursor.execute("PRAGMA table_info(settings)")
    columns = [column[1] for column in cursor.fetchall()]
    if 'colors' not in columns:
        cursor.execute("ALTER TABLE settings ADD COLUMN colors TEXT DEFAULT '[#00ff00, #00ff00]'")
        conn_combined.commit()
    if 'language' not in columns:
        cursor.execute("ALTER TABLE settings ADD COLUMN language TEXT DEFAULT 'en'")
        conn_combined.commit()

    # Items: article number (e.g. barcode) and existing storage location label
    cursor.execute("PRAGMA table_info(items)")
    item_columns = [column[1] for column in cursor.fetchall()]
    for column in ('article_number', 'storage_location'):
        if column not in item_columns:
            cursor.execute(f"ALTER TABLE items ADD COLUMN {column} TEXT DEFAULT ''")
            conn_combined.commit()

    # ESP: optional uneven drawer layout and per-box locate colours
    cursor.execute("PRAGMA table_info(esp)")
    esp_columns = [column[1] for column in cursor.fetchall()]
    for column in ('row_layout', 'locate_colors'):
        if column not in esp_columns:
            cursor.execute(f"ALTER TABLE esp ADD COLUMN {column} TEXT DEFAULT ''")
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
    cursor.execute(
        'INSERT INTO items (name, link, image, position, quantity, ip, tags, article_number, storage_location) '
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [item['name'], item['link'], item['image'], item['position'], item['quantity'], item['ip'],
         item['tags'], item.get('article_number', '') or '', item.get('storage_location', '') or ''])
    lastId = cursor.lastrowid
    conn.commit()
    conn.close()
    return lastId


def update_item_image(item_id, new_image_url):
    conn = create_combined_db()
    try:
        cursor = conn.cursor()
        # Update the image of the item with the specified item_id
        cursor.execute('UPDATE items SET image = ? WHERE id = ?', [new_image_url['image'], item_id])
        conn.commit()
    except sqlite3.Error as e:
        conn.rollback()
        print(e)
    finally:
        conn.close()


# Function to update data in the database
def update_item(id, data):
    conn = create_combined_db()

    try:

        conn.execute(
            'UPDATE items SET name = ?, link = ?, image = ?, position = ?, quantity = ?, ip = ?, tags = ?, '
            'article_number = ?, storage_location = ? WHERE id = ?',
            [data['name'], data['link'], data['image'], data['position'], data['quantity'], data['ip'], data['tags'],
             data.get('article_number', '') or '', data.get('storage_location', '') or '', id])
        conn.commit()
    except sqlite3.Error as e:
        conn.rollback()
    finally:
        conn.close()


def update_item_quantity(id, data):
    conn = create_combined_db()
    try:

        conn.execute(
            'UPDATE items SET  quantity = ? WHERE id = ?',
            [data['quantity'], id])
        conn.commit()
    except sqlite3.Error as e:
        conn.rollback()
        print(e)
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


def normalize_row_layout(value):
    """Return a clean comma-separated list of positive drawer counts, or ''."""
    if not value:
        return ''
    if isinstance(value, (list, tuple)):
        parts = value
    else:
        parts = str(value).replace(';', ',').split(',')
    counts = []
    for part in parts:
        try:
            n = int(str(part).strip())
        except ValueError:
            continue
        if n > 0:
            counts.append(str(n))
    return ','.join(counts)


def parse_row_layout(value):
    """Turn a stored row layout into a list of ints (empty list = regular grid)."""
    layout = normalize_row_layout(value)
    return [int(n) for n in layout.split(',')] if layout else []


def normalize_colors(value):
    """Store per-box locate colours as a JSON list of '#rrggbb' strings, or ''."""
    if not value:
        return ''
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except ValueError:
            value = [v.strip() for v in value.split(',')]
    if not isinstance(value, list):
        return ''
    colors = [c for c in value if isinstance(c, str) and len(c) == 7 and c.startswith('#')
              and all(ch in '0123456789abcdefABCDEF' for ch in c[1:])]
    return json.dumps(colors) if colors else ''


def parse_colors(value):
    normalized = normalize_colors(value)
    return json.loads(normalized) if normalized else []


def search_items(query):
    """Return items ranked by how well they match `query` (best first).

    Exact article-number matches win (barcode scans), then exact names,
    then substring matches on name / article number / storage location / tags,
    then fuzzy name similarity (handles voice-assistant typos).
    """
    from difflib import SequenceMatcher

    q = (query or '').strip().lower()
    if not q:
        return []
    scored = []
    for item in read_items():
        name = (item.get('name') or '').lower()
        article = (item.get('article_number') or '').lower()
        location = (item.get('storage_location') or '').lower()
        tags = (item.get('tags') or '').lower()
        if article and article == q:
            score = 5.0
        elif name == q:
            score = 4.0
        elif location and location == q:
            score = 3.5
        elif q in name or (article and q in article):
            # Prefer matches that cover more of the name
            score = 3.0 + len(q) / max(len(name), 1)
        elif (location and q in location) or q in tags:
            score = 2.0
        else:
            score = max([SequenceMatcher(None, q, name).ratio()] +
                        [SequenceMatcher(None, q, word).ratio() for word in name.split()])
            if score < 0.6:
                continue
        scored.append((score, item))
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [item for _, item in scored]


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
            'INSERT INTO esp (name, esp_ip, rows, cols, start_top, start_left, serpentine_direction, row_layout, '
            'locate_colors) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                esp_settings['name'],
                esp_settings['esp_ip'],
                esp_settings['rows'],
                esp_settings['cols'],
                esp_settings['startTop'],
                esp_settings['startLeft'],
                esp_settings['serpentineDirection'],
                normalize_row_layout(esp_settings.get('rowLayout')),
                normalize_colors(esp_settings.get('locateColors')),
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
    conn = create_combined_db()
    try:
        old = conn.execute('SELECT name, esp_ip FROM esp WHERE id = ?', [id]).fetchone()
        conn.execute(
            'UPDATE esp SET name = ?, esp_ip = ?, rows = ?, cols = ?, start_top = ?, start_left = ?, '
            'serpentine_direction = ?, row_layout = ?, locate_colors = ? WHERE id = ?',
            [
                esp_settings['name'],
                esp_settings['esp_ip'],
                esp_settings['rows'],
                esp_settings['cols'],
                esp_settings['startTop'],
                esp_settings['startLeft'],
                esp_settings['serpentineDirection'],
                normalize_row_layout(esp_settings.get('rowLayout')),
                normalize_colors(esp_settings.get('locateColors')),
                id
            ])
        # Items reference their ESP by IP (or by name for older entries), so
        # carry the reference over when the ESP's IP or name changes.
        # Otherwise a replaced WLED controller leaves every item orphaned.
        if old:
            if old['esp_ip'] != esp_settings['esp_ip']:
                conn.execute('UPDATE items SET ip = ? WHERE ip = ?', [esp_settings['esp_ip'], old['esp_ip']])
            if old['name'] != esp_settings['name']:
                conn.execute('UPDATE items SET ip = ? WHERE ip = ?', [esp_settings['name'], old['name']])
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


def get_esp_settings_by_id(id):
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


def get_esp_settings_by_ip(ip):
    conn = create_combined_db()  # Get a database connection
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM esp WHERE esp_ip = ?', (ip,))
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
    try:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM settings')
        settings = cursor.fetchone()
        if settings is None:
            print("No settings found in the database.")
            return {
                'brightness': 100,
                'timeout': 5,
                'lightMode': 'light',
                'colors': ['#ffff00', '#00ffff'],
                'language': 'en'
            }
        else:
            # Convert the settings row to a dictionary
            settings_dict = dict(zip([column[0] for column in cursor.description], settings))
            # Deserialize the colors field if it exists
            if 'colors' in settings_dict:
                settings_dict['colors'] = json.loads(settings_dict['colors'])

            else:
                print("No 'colors' field found in the settings.")
            return settings_dict
    except sqlite3.Error as e:
        print(f"SQLite error while reading settings: {e}")
        return {}
    finally:
        conn.close()


# Function to update settings in the database
def update_settings(settings):
    try:
        # Serialize the colors list to a JSON string
        settings['colors'] = json.dumps(settings['colors'])
        conn = create_combined_db()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM settings')  # Clear existing settings
        cursor.execute('''
            INSERT INTO settings (brightness, timeout, lightMode, colors, language)
            VALUES (?, ?, ?, ?, ?)
        ''', [settings['brightness'], settings['timeout'], settings['lightMode'], settings['colors'], settings['language']])
        conn.commit()
    except sqlite3.Error as e:
        print(f"SQLite error while updating settings: {e}")
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


# ---------------------------------------------------------------------------
# Backup: export / import of settings, WLED nodes and items
# ---------------------------------------------------------------------------

BACKUP_FORMAT = 'spotlight-storage-backup'
BACKUP_VERSION = 1
ITEM_FIELDS = ('name', 'link', 'image', 'position', 'quantity', 'ip', 'tags', 'article_number', 'storage_location')
ESP_FIELDS = ('name', 'esp_ip', 'rows', 'cols', 'start_top', 'start_left', 'serpentine_direction',
              'row_layout', 'locate_colors')
SETTINGS_FIELDS = ('brightness', 'timeout', 'lightMode', 'colors', 'language')


def export_data(include=('settings', 'esps', 'items')):
    """Return a JSON-serialisable backup of the selected sections."""
    from datetime import datetime, timezone

    data = {
        'format': BACKUP_FORMAT,
        'version': BACKUP_VERSION,
        'exported_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
    }
    if 'settings' in include:
        settings = read_settings() or {}
        data['settings'] = {k: settings[k] for k in SETTINGS_FIELDS if k in settings}
    if 'esps' in include:
        data['esps'] = [{k: esp.get(k) for k in ESP_FIELDS} for esp in read_esp()]
        for esp in data['esps']:
            esp['locate_colors'] = parse_colors(esp.get('locate_colors'))
    if 'items' in include:
        data['items'] = [{k: item.get(k) for k in ITEM_FIELDS} for item in read_items()]
    return data


class BackupError(ValueError):
    pass


def _validate_backup(data):
    if not isinstance(data, dict):
        raise BackupError('Backup must be a JSON object')
    if data.get('format') != BACKUP_FORMAT:
        raise BackupError('Not a Spotlight Storage backup file')
    if not isinstance(data.get('version'), int) or data['version'] > BACKUP_VERSION:
        raise BackupError('Unsupported backup version')
    for section in ('esps', 'items'):
        if section in data and not isinstance(data[section], list):
            raise BackupError(f"'{section}' must be a list")
    if 'settings' in data and not isinstance(data['settings'], dict):
        raise BackupError("'settings' must be an object")
    for esp in data.get('esps', []):
        if not isinstance(esp, dict) or not esp.get('name') or not esp.get('esp_ip'):
            raise BackupError('Every WLED node needs a name and esp_ip')
    for item in data.get('items', []):
        if not isinstance(item, dict) or not item.get('name'):
            raise BackupError('Every item needs a name')


def import_data(data, mode='merge'):
    """Import a backup produced by export_data.

    mode='merge'   : update WLED nodes matched by IP (or name) and items matched by
                     name + box; add everything else. Nothing is deleted.
    mode='replace' : wipe the sections present in the backup, then insert them.
    Runs in a single transaction: either everything is imported or nothing.
    Returns counts of what was added/updated.
    """
    if mode not in ('merge', 'replace'):
        raise BackupError("mode must be 'merge' or 'replace'")
    _validate_backup(data)

    stats = {'settings': False, 'esps_added': 0, 'esps_updated': 0, 'items_added': 0, 'items_updated': 0}
    conn = create_combined_db()
    try:
        cur = conn.cursor()

        if 'settings' in data:
            current = read_settings() or {}
            merged = {**current, **{k: v for k, v in data['settings'].items() if k in SETTINGS_FIELDS}}
            colors = merged.get('colors') or ['#00ff00', '#00ff00']
            cur.execute('DELETE FROM settings')
            cur.execute('INSERT INTO settings (brightness, timeout, lightMode, colors, language) VALUES (?, ?, ?, ?, ?)',
                        [int(merged.get('brightness', 100)), int(merged.get('timeout', 5)),
                         merged.get('lightMode', 'light'),
                         json.dumps(colors) if not isinstance(colors, str) else colors,
                         merged.get('language', 'en')])
            stats['settings'] = True

        if 'esps' in data:
            if mode == 'replace':
                cur.execute('DELETE FROM esp')
            for esp in data['esps']:
                values = [
                    esp['name'], esp['esp_ip'], int(esp.get('rows') or 1), int(esp.get('cols') or 1),
                    esp.get('start_top') or 'Top', esp.get('start_left') or 'Left',
                    esp.get('serpentine_direction') or 'Horizontal',
                    normalize_row_layout(esp.get('row_layout')), normalize_colors(esp.get('locate_colors')),
                ]
                existing = None
                if mode == 'merge':
                    existing = cur.execute('SELECT id FROM esp WHERE esp_ip = ? OR name = ? ORDER BY esp_ip = ? DESC',
                                           [esp['esp_ip'], esp['name'], esp['esp_ip']]).fetchone()
                if existing:
                    cur.execute('UPDATE esp SET name = ?, esp_ip = ?, rows = ?, cols = ?, start_top = ?, start_left = ?, '
                                'serpentine_direction = ?, row_layout = ?, locate_colors = ? WHERE id = ?',
                                values + [existing['id']])
                    stats['esps_updated'] += 1
                else:
                    cur.execute('INSERT INTO esp (name, esp_ip, rows, cols, start_top, start_left, serpentine_direction, '
                                'row_layout, locate_colors) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', values)
                    stats['esps_added'] += 1

        if 'items' in data:
            if mode == 'replace':
                cur.execute('DELETE FROM items')
            for item in data['items']:
                position = item.get('position')
                if not isinstance(position, str):
                    position = json.dumps(position or [])
                tags = item.get('tags')
                if tags is not None and not isinstance(tags, str):
                    tags = json.dumps(tags)
                values = [
                    item['name'], item.get('link') or '', item.get('image') or '', position,
                    int(item.get('quantity') or 0), item.get('ip') or '', tags or '[]',
                    item.get('article_number') or '', item.get('storage_location') or '',
                ]
                existing = None
                if mode == 'merge':
                    existing = cur.execute('SELECT id FROM items WHERE name = ? AND ip = ?',
                                           [item['name'], item.get('ip') or '']).fetchone()
                if existing:
                    cur.execute('UPDATE items SET name = ?, link = ?, image = ?, position = ?, quantity = ?, ip = ?, '
                                'tags = ?, article_number = ?, storage_location = ? WHERE id = ?',
                                values + [existing['id']])
                    stats['items_updated'] += 1
                else:
                    cur.execute('INSERT INTO items (name, link, image, position, quantity, ip, tags, article_number, '
                                'storage_location) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', values)
                    stats['items_added'] += 1

        conn.commit()
    except (sqlite3.Error, KeyError, TypeError, ValueError) as e:
        conn.rollback()
        if isinstance(e, BackupError):
            raise
        raise BackupError(f'Import failed, nothing was changed: {e}')
    finally:
        conn.close()
    return stats


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
    conn_combined = sqlite3.connect(COMBINED_DATABASE)

    # Fetch all items from the source database
    items = conn_data.execute('SELECT * FROM items').fetchall()

    # Check if 'tags' column exists in the source database
    column_names = [description[0] for description in conn_data.execute('PRAGMA table_info(items)').fetchall()]
    has_tags_column = 'tags' in column_names

    for item in items:
        # Extract the first 6 columns
        columns_to_insert = [
            item['name'], item['link'], item['image'],
            item['position'], item['quantity'], item['ip']
        ]

        # Add 'tags' column if it exists, otherwise, add an empty string
        if has_tags_column:
            columns_to_insert.append(item['tags'])
        else:
            columns_to_insert.append("")

        # Insert data into the destination database
        conn_combined.execute(
            'INSERT INTO items (name, link, image, position, quantity, ip, tags) VALUES (?, ?, ?, ?, ?, ?, ?)',
            columns_to_insert
        )

    # Commit changes and close connections
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

    # Call the function to perform the check and move
    move_db_to_data_dir()


def move_db_to_data_dir():
    main_dir_db = 'combined_data.db'  # The original path in the main directory
    data_dir_db = 'data/combined_data.db'  # The new path inside the data directory

    # Check if the database exists in the main directory
    if os.path.exists(main_dir_db):
        # Ensure the data directory exists, create if it doesn't
        if not os.path.exists('data'):
            os.makedirs('data')

        # Move the database to the data directory
        shutil.move(main_dir_db, data_dir_db)
        print(f"Database moved to {data_dir_db}")


# Perform migration
perform_migration()
