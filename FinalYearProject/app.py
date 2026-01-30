
from flask import Flask, request, jsonify
import firebase_admin
from firebase_admin import credentials, db
from flask import render_template


app = Flask(__name__)

# Firebase Admin SDK initialization
# cred = credentials.Certificate("firebase_key.json")
# firebase_admin.initialize_app(cred, {
#     'databaseURL': 'https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com/'
# })
cred = credentials.Certificate("firebase_key.json")

firebase_admin.initialize_app(cred, {
    "databaseURL": "https://iot-asset-tracking-34508-default-rtdb.firebaseio.com"
})



@app.route("/")
def home():
    return render_template("index.html")

@app.route("/login")
def login():
    return render_template("login.html")

@app.route("/register")
def register():
    return render_template("register.html")

@app.route("/farmer/profile")
def farmer_profile():
    return render_template("farmer_profile.html")

@app.route("/farmer/orders")
def farmer_orders():
    return render_template("farmer_orders.html")



# ---------- FARMER API ----------
@app.route("/api/add_product", methods=["POST"])
@app.route("/farmer")
def farmer_page():
    return render_template("farmer.html")
def add_product():
    try:
        if not request.is_json:
            return jsonify({"error": "Request must be JSON"}), 400

        data = request.get_json(force=True)

        product = {
            "name": data["name"],
            "price": data["price"],
            "deviceId": data["deviceId"],
            "status": "available"
        }

        print("Before Firebase push")   # 👈 DEBUG
        ref = db.reference("products")
        ref.push(product)
        print("After Firebase push")    # 👈 DEBUG

        return jsonify({"message": "Product added successfully"})

    except Exception as e:
        print("ERROR:", e)
        return jsonify({"error": str(e)}), 500




# ---------- CONSUMER API ----------
@app.route("/api/products", methods=["GET"])
@app.route("/consumer")
def consumer_page():
    return render_template("consumer.html")

def get_products():
    products = db.reference("products").get()
    return jsonify(products if products else {})

@app.route("/api/track/<device_id>", methods=["GET"])
@app.route("/track")
def track_page():
    return render_template("track.html")
def track_device(device_id):
    tracking_data = db.reference("tracking/" + device_id).get()
    if tracking_data:
        return jsonify(tracking_data)
    return jsonify({"error": "No tracking data found"})

# ---------- HARDWARE API ----------
@app.route("/api/update_tracking", methods=["POST"])
def update_tracking():
    data = request.json
    device_id = data.get("deviceId")

    tracking_payload = {
        "latitude": data.get("latitude"),
        "longitude": data.get("longitude"),
        "temperature": data.get("temperature"),
        "humidity": data.get("humidity"),
        "timestamp": data.get("timestamp")
    }

    db.reference("tracking/" + device_id).set(tracking_payload)
    return jsonify({"message": "Tracking data updated"})

if __name__ == "__main__":
    app.run(debug=True)
