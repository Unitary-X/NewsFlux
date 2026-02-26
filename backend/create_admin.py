import psycopg2
from passlib.context import CryptContext

# We use the same configuration as security.py
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
password = "admin123"
hashed = pwd_context.hash(password)

conn = psycopg2.connect(
    dbname="newsflux",
    user="postgres",
    password="postgres",
    host="localhost",
    port=5433
)
cur = conn.cursor()

cur.execute("DELETE FROM users WHERE username = 'superadmin';")

cur.execute("""
    INSERT INTO users (id, username, password_hash, role, tenant_id) 
    VALUES ('b2345678-1234-5678-1234-567812345678', 'superadmin', %s, 'super_admin', null)
""", (hashed,))

conn.commit()
cur.close()
conn.close()
print("Inserted superadmin accurately with real generated hash.")
