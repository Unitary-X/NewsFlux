import sqlite3
import sys
import os

# Add the current directory to path so we can import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.security import get_password_hash

conn = sqlite3.connect('newsflux.db')
cursor = conn.cursor()

# Check what users exist
cursor.execute("SELECT username, role FROM users")
users = cursor.fetchall()
print("Available users in database:")
for u in users:
    print(f"- Username: {u[0]} (Role: {u[1]})")

# Update password for praba
target_user = 'praba'
new_password = 'password123'
hashed_pw = get_password_hash(new_password)

cursor.execute("UPDATE users SET password_hash = ? WHERE username = ?", (hashed_pw, target_user))
if cursor.rowcount > 0:
    print(f"\nSuccessfully reset password for '{target_user}' to: {new_password}")
else:
    print(f"\nUser '{target_user}' not found! Let's check if 'admin' exists...")
    cursor.execute("UPDATE users SET password_hash = ? WHERE username = ?", (hashed_pw, 'admin'))
    if cursor.rowcount > 0:
        print(f"Successfully reset password for 'admin' to: {new_password}")

conn.commit()
conn.close()
