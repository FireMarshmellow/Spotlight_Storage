import sqlite3

DATABASE = 'data.db'
conn = sqlite3.connect(DATABASE)

conn.execute('ALTER TABLE items ADD COLUMN lights TEXT')
conn.commit()

