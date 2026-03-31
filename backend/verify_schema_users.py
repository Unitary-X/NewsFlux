import sqlite3
import os

db_path = "backend/sql_app.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(users)")
    columns = cursor.fetchall()
    print("Columns in users table:")
    for col in columns:
        print(col)
    conn.close()
else:
    print(f"Database not found at {db_path}")
