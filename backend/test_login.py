import requests

try:
    response = requests.post(
        "http://localhost:8000/api/v1/auth/login",
        json={"username": "superadmin", "password": "admin123"},
        timeout=5
    )
    print("Status:", response.status_code)
    print("Body:", response.json())
except Exception as e:
    print("Error:", e)
