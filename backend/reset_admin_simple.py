import sqlite3
import os
import sys

# Try to import passlib from the environment
try:
    from passlib.context import CryptContext
except ImportError:
    print("passlib not found. Please run this script in the correct virtual environment.")
    sys.exit(1)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
hashed_password = pwd_context.hash("admin123")

db_path = 'sql_app.db'
if not os.path.exists(db_path):
    print(f"Database {db_path} not found.")
    sys.exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("UPDATE users SET password_hash = ? WHERE username = 'superadmin'", (hashed_password,))
    if cursor.rowcount == 0:
        print("User 'superadmin' not found in database.")
    else:
        print(f"Successfully reset 'superadmin' password to 'admin123' in {db_path}.")
    conn.commit()
except Exception as e:
    print(f"Error: {e}")
    conn.rollback()
finally:
    conn.close()
