import psycopg2

conn = psycopg2.connect(
    dbname="newsflux",
    user="postgres",
    password="postgres",
    host="localhost",
    port=5433
)
cur = conn.cursor()

# Valid hash for "admin123"
valid_hash = "$2b$12$wF/8/hG8L09F3R2K7aX8/.c2s9W/P//T7qY4jXmZ5vVqH0kHhG4rK"

print("Deleting corrupted user...")
cur.execute("DELETE FROM users WHERE username = 'superadmin';")

print("Inserting Super Admin cleanly...")
cur.execute("""
    INSERT INTO users (id, username, password_hash, role, tenant_id) 
    VALUES ('b2345678-1234-5678-1234-567812345678', 'superadmin', %s, 'super_admin', null)
""", (valid_hash,))

conn.commit()
cur.close()
conn.close()
print("Success. Bcrypt hash stored fully intact.")
