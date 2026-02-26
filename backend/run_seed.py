import sys
import os

# Add the directory containing the 'app' module to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from seed import seed_database

if __name__ == "__main__":
    print("Executing final DB seed...")
    seed_database()
