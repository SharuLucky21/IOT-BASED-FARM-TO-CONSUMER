import time
import requests
import random
import sys
import firebase_admin
from firebase_admin import credentials, db

# -------------------------------
# CONFIGURATION
# -------------------------------
# Initialize Firebase Admin if not already initialized
if not firebase_admin._apps:
    cred = credentials.Certificate("firebase_key.json")
    firebase_admin.initialize_app(cred, {
        "databaseURL": "https://iot-asset-tracking-34508-default-rtdb.firebaseio.com"
    })

API_URL = "http://127.0.0.1:5000/api/update_tracking"
# Get deviceId from command line or use default
DEVICE_ID = sys.argv[1] if len(sys.argv) > 1 else "DEV123"

def update_order_status(status):
    try:
        orders = db.reference("orders").get()
        if orders:
            for key, val in orders.items():
                items = val.get("items", [])
                for item in items:
                    if item.get("deviceId") == DEVICE_ID:
                        db.reference(f"orders/{key}/status").set(status)
                        print(f"✅ Order {key} status updated to: {status}")
    except Exception as e:
        print(f"❌ Error updating status: {e}")

def get_order_address():
    try:
        orders = db.reference("orders").get()
        if orders:
            for key, val in orders.items():
                items = val.get("items", [])
                for item in items:
                    if item.get("deviceId") == DEVICE_ID:
                        return val.get("address", "Hyderabad")
        return "Hyderabad"
    except Exception as e:
        print(f"❌ Error fetching address: {e}")
        return "Hyderabad"

# Mock Geocoder
CITY_COORDINATES = {
    "hyderabad": {"lat": 17.3850, "lon": 78.4867},
    "bangalore": {"lat": 12.9716, "lon": 77.5946},
    "anantapur": {"lat": 14.6819, "lon": 77.6006},
    "tadipatri": {"lat": 14.9142, "lon": 78.0125},
    "dharmavaram": {"lat": 14.4137, "lon": 77.7126},
    "gunttakal": {"lat": 15.1610, "lon": 77.3750},
    "kurnool": {"lat": 15.8281, "lon": 78.0373},
    "chennai": {"lat": 13.0827, "lon": 80.2707},
    "mumbai": {"lat": 19.0760, "lon": 72.8777},
    "pune": {"lat": 18.5204, "lon": 73.8567}
}

SRIT_COORDS = {"lat": 14.74536, "lon": 77.68958}

address = get_order_address().lower()
destination = None

for city, coords in CITY_COORDINATES.items():
    if city in address:
        destination = coords
        break

if not destination:
    # Default to Anantapur if city not found in mock geocoder (closer than Hyderabad)
    destination = CITY_COORDINATES["anantapur"]

# Create waypoints: Start at SRIT, end at Destination
# For simplicity, we'll just do a straight path or 3 segments if it's long
waypoints = [
    SRIT_COORDS,
    {"lat": (SRIT_COORDS["lat"] + destination["lat"]) / 2, "lon": (SRIT_COORDS["lon"] + destination["lon"]) / 2},
    destination
]

steps_per_segment = 15
interval = 3

print("🚚 Delivery Simulation Started (Realistic Road Path)\n")

# Clear history for fresh simulation
db.reference("history/" + DEVICE_ID).delete()

# Wait a few seconds then set status to "Out for Delivery"
time.sleep(5)
update_order_status("Out for Delivery")

# -------------------------------
# SIMULATION LOOP (Multi-segment)
# -------------------------------
for s in range(len(waypoints) - 1):
    start = waypoints[s]
    end = waypoints[s+1]
    
    for i in range(steps_per_segment):
        t = i / steps_per_segment
        lat = start["lat"] + (end["lat"] - start["lat"]) * t
        lon = start["lon"] + (end["lon"] - start["lon"]) * t

        # Simulate freshness change
        temperature = 24.0 + random.uniform(-1.0, 1.0)
        humidity = 70.0 + random.uniform(-2.0, 2.0)

        payload = {
            "deviceId": DEVICE_ID,
            "latitude": round(lat, 6),
            "longitude": round(lon, 6),
            "temperature": round(temperature, 1),
            "humidity": round(humidity, 1),
            "timestamp": time.time()
        }

        try:
            response = requests.post(API_URL, json=payload)
            print(f"⏱ Segment {s+1} Step {i} → {payload}")
        except Exception as e:
            print("❌ Error sending data:", e)

        time.sleep(interval)

# Final position
final = waypoints[-1]
requests.post(API_URL, json={
    "deviceId": DEVICE_ID,
    "latitude": final["lat"],
    "longitude": final["lon"],
    "temperature": 24.0,
    "humidity": 70.0,
    "timestamp": time.time()
})

print("\n✅ Delivery Reached Destination")
update_order_status("Delivered")
