import sqlite3

conn = sqlite3.connect('sql_app.db')
cursor = conn.cursor()

# Check newspapers table schema
cursor.execute("PRAGMA table_info(newspapers)")
columns = cursor.fetchall()
print("Newspapers columns:")
for col in columns:
    print(col)

# Check for existing data
cursor.execute("SELECT * FROM newspapers")
rows = cursor.fetchall()
print("\nNewspapers data count:", len(rows))
for row in rows:
    print(row)

conn.close()
