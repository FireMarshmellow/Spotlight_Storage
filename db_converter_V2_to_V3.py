import sqlite3

def update_database_schema_and_position_format(db_path):
    """
    Update the database schema to include new columns in the 'items' table and
    ensure the 'position' values are formatted with numbers enclosed in square brackets.
    """
    try:
        # Connect to the SQLite database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Updating the format of 'position' values
        cursor.execute("SELECT id, position FROM items")
        items = cursor.fetchall()
        for item_id, position in items:
            # Check if the position is not already formatted correctly
            if not position.startswith('[') or not position.endswith(']'):
                # Reformat and update the position value
                new_position = f'[{position}]'
                cursor.execute("UPDATE items SET position = ? WHERE id = ?", (new_position, item_id))

        # Adding new columns to the 'items' table
        new_columns = ['tags TEXT', 'slot_1 TEXT', 'slot_2 TEXT', 'slot_3 TEXT', 'slot_4 TEXT']
        for column in new_columns:
            try:
                cursor.execute(f'ALTER TABLE items ADD COLUMN {column};')
            except sqlite3.OperationalError:
                # This exception is expected if the column already exists
                pass

        # Committing the changes
        conn.commit()
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        conn.close()


# File path to the uploaded database
db_file_path = 'data.db'  # Replace with your database file path

# Updating the database schema
update_database_schema_and_position_format(db_file_path)
