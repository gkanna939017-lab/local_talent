# Simple smoke test for Python backend
# Run while the server is running: python smoke_test.py
import requests

BASE = 'http://localhost:8000'

print('POST /api/add-worker')
resp = requests.post(f'{BASE}/api/add-worker', json={
    'name': 'Smoke Tester',
    'skill': 'IT Support',
    'city': 'Narasaraopet',
    'phone': '9000000000',
    'experience': '2',
    'category': 'General'
})
print(resp.status_code, resp.json())

print('\nGET /api/search?q=it')
resp = requests.get(f'{BASE}/api/search?q=it')
print(resp.status_code, resp.json()[:3])

print('\nPOST /api/bookings')
resp = requests.post(f'{BASE}/api/bookings', json={'worker_id': 1, 'customer_name': 'Test Customer', 'customer_phone': '9000000000'})
print(resp.status_code, resp.json())

booking_id = None
if resp.status_code == 200:
    booking_id = resp.json().get('booking', {}).get('id')

if booking_id:
    print(f'\nPOST /api/bookings/{booking_id}/update-location')
    resp2 = requests.post(f'{BASE}/api/bookings/{booking_id}/update-location', json={'lat':17.0,'lng':80.0,'status':'enroute','eta_minutes':10})
    print(resp2.status_code, resp2.json())

print('\nGET /api/workers')
resp = requests.get(f'{BASE}/api/workers')
print(resp.status_code, len(resp.json()))