import sqlite3

conn = sqlite3.connect('sql_app.db')
cursor = conn.cursor()

try:
    # Add paper_type column to newspapers
    cursor.execute("ALTER TABLE newspapers ADD COLUMN paper_type VARCHAR(20) DEFAULT 'daily'")
    print("Added paper_type to newspapers table.")
except sqlite3.OperationalError:
    print("paper_type already exists in newspapers table.")

try:
    # Add subscription_type to customer_subscriptions if missing
    cursor.execute("ALTER TABLE customer_subscriptions ADD COLUMN subscription_type VARCHAR(20) DEFAULT 'daily'")
    print("Added subscription_type to customer_subscriptions table.")
except sqlite3.OperationalError:
    print("subscription_type already exists in customer_subscriptions table.")

conn.commit()
conn.close()
