import sqlite3
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.core.security import verify_password

conn = sqlite3.connect('newsflux.db')
cursor = conn.cursor()
cursor.execute("SELECT password_hash FROM users WHERE username = 'praba'")
row = cursor.fetchone()
if row:
    is_valid = verify_password('password123', row[0])
    print(f"Is 'password123' valid for 'praba'? {is_valid}")
else:
    print("User 'praba' not found!")
conn.close()
