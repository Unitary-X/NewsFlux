import sqlite3

conn = sqlite3.connect('newsflux.db')
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
try:
    cursor.execute("ALTER TABLE worker_daily_stock ADD COLUMN month_taken INTEGER")
    print("Added month_taken to worker_daily_stock.")
except sqlite3.OperationalError:
    pass

try:
    cursor.execute("ALTER TABLE worker_daily_stock ADD COLUMN year_taken INTEGER")
    print("Added year_taken to worker_daily_stock.")
except sqlite3.OperationalError:
    pass

try:
    cursor.execute("ALTER TABLE worker_daily_stock ADD COLUMN sold INTEGER DEFAULT 0")
    print("Added sold to worker_daily_stock.")
except sqlite3.OperationalError:
    pass

try:
    cursor.execute("ALTER TABLE worker_daily_stock ADD COLUMN amount_given DECIMAL(10, 2) DEFAULT 0.00")
    print("Added amount_given to worker_daily_stock.")
except sqlite3.OperationalError:
    pass

conn.commit()
conn.close()
