import requests

response = requests.post(
    "http://localhost:8000/generate-title",
    json={"description": "Create a user login system with password reset functionality"}
)

print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")