import os
import subprocess

try:
    print("Running alembic revision...")
    res1 = subprocess.run(["alembic", "revision", "--autogenerate", "-m", "add_sold"], cwd="c:\\Users\\ruthr\\OneDrive\\Desktop\\NewsFlux\\backend", capture_output=True, text=True)
    print("STDOUT:", res1.stdout)
    print("STDERR:", res1.stderr)
    
    print("Running alembic upgrade...")
    res2 = subprocess.run(["alembic", "upgrade", "head"], cwd="c:\\Users\\ruthr\\OneDrive\\Desktop\\NewsFlux\\backend", capture_output=True, text=True)
    print("STDOUT:", res2.stdout)
    print("STDERR:", res2.stderr)
except Exception as e:
    print(f"Error: {e}")
