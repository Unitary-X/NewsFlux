import urllib.request
import json

data = json.dumps({"username": "superadmin", "password": "admin123"}).encode('utf-8')
req = urllib.request.Request("http://localhost:8000/api/v1/auth/login", data=data, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as response:
        print("Status:", response.status)
        print("Body:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("Error:", e.code)
    print("Details:", e.read().decode('utf-8'))
except Exception as e:
    print("Exception:", e)
