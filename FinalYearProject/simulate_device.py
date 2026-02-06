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

# ... (rest of the source/destination config)

# Realistic Hyderabad Route Waypoints (following main roads)
waypoints = [
    {"lat": 17.4401, "lon": 78.3489}, # Gachibowli
    {"lat": 17.4486, "lon": 78.3908}, # Madhapur
    {"lat": 17.4325, "lon": 78.4470}, # Panjagutta
    {"lat": 17.4447, "lon": 78.4664}, # Begumpet
    {"lat": 17.4399, "lon": 78.4983}  # Secunderabad
]

steps_per_segment = 10
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
