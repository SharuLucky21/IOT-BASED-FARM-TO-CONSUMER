
from flask import Flask, request, jsonify
import firebase_admin
from firebase_admin import credentials, db
from flask import render_template
import subprocess
import os
import sys

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

@app.route("/farmer")
def farmer_page():
    return render_template("farmer.html")
@app.route("/api/add_product", methods=["POST"])
def add_product():
    try:
        if not request.is_json:
            return jsonify({"error": "Request must be JSON"}), 400

        data = request.get_json(force=True)

        product = {
            "name": data["name"],
            "price": data["price"],
            "deviceId": data["deviceId"],
            "status": data["status"],
            "farmerEmail": data.get("farmerEmail")
        }

        print("Before Firebase push")   # 👈 DEBUG
        ref = db.reference("products")
        ref.push(product)
        print("After Firebase push")    # 👈 DEBUG

        return jsonify({"message": "Product added successfully"})

    except Exception as e:
        print("ERROR:", e)
        return jsonify({"error": str(e)}), 500

@app.route("/api/farmer_products/<email>", methods=["GET"])
def get_farmer_products(email):
    try:
        products = db.reference("products").get()
        farmer_products = {}
        if products:
            for key, val in products.items():
                if val.get("farmerEmail") == email:
                    farmer_products[key] = val
        return jsonify(farmer_products)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/create_order", methods=["POST"])
def create_order():
    try:
        data = request.json
        # data should contain: consumerEmail, items (list of products), totalAmount, address
        if not data.get("address"):
             return jsonify({"error": "Address is required"}), 400
             
        ref = db.reference("orders")
        new_order_ref = ref.push(data)
        order_id = new_order_ref.key

        # Trigger simulation for each device in the order
        items = data.get("items", [])
        devices = set([item.get("deviceId") for item in items if item.get("deviceId")])
        
        python_exe = sys.executable
        script_path = os.path.join(os.path.dirname(__file__), "simulate_device.py")
        
        for device_id in devices:
            # Run simulation in background
            subprocess.Popen([python_exe, script_path, device_id])
            
        return jsonify({"message": "Order placed and simulation started", "orderId": order_id})
    except Exception as e:
        print("Order Error:", e)
        return jsonify({"error": str(e)}), 500

@app.route("/api/farmer_orders/<email>", methods=["GET"])
def get_farmer_orders(email):
    try:
        orders = db.reference("orders").get()
        farmer_orders = {}
        if orders:
            for order_key, order_val in orders.items():
                # Check if any item in the order belongs to this farmer
                items = order_val.get("items", [])
                for item in items:
                    if item.get("farmerEmail") == email:
                        farmer_orders[order_key] = order_val
                        break
        return jsonify(farmer_orders)
    except Exception as e:
        return jsonify({"error": str(e)}), 500




@app.route("/api/consumer_orders/<email>", methods=["GET"])
def get_consumer_orders(email):
    try:
        orders = db.reference("orders").get()
        consumer_orders = {}
        if orders:
            for key, val in orders.items():
                if val.get("consumerEmail") == email:
                    consumer_orders[key] = val
        return jsonify(consumer_orders)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
# ---------- CONSUMER API ----------
@app.route("/consumer")
def consumer_page():
    return render_template("consumer.html")

@app.route("/api/products", methods=["GET"])
def get_products():
    products = db.reference("products").get()
    return jsonify(products if products else {})

@app.route("/api/order_status/<device_id>", methods=["GET"])
def get_order_status(device_id):
    try:
        orders = db.reference("orders").get()
        if orders:
            for order_key, order_val in orders.items():
                items = order_val.get("items", [])
                for item in items:
                    if item.get("deviceId") == device_id:
                        return jsonify({"status": order_val.get("status", "Ordered")})
        return jsonify({"status": "Ordered"}) # Default
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route("/api/track/<device_id>", methods=["GET"])
def track_device(device_id):
    tracking_data = db.reference("tracking/" + device_id).get()
    if tracking_data:
        return jsonify(tracking_data)
    return jsonify({"error": "No tracking data found"})

@app.route("/track")
def track_page():
    return render_template("track.html")

#@app.route("/api/track/<deviceId>")
#def track(deviceId):
    data = db.reference("tracking/" + deviceId).get()
    return jsonify(data if data else {})


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

    # Update latest location
    db.reference("tracking/" + device_id).set(tracking_payload)
    
    # Also append to history for path tracking
    db.reference("history/" + device_id).push(tracking_payload)
    
    return jsonify({"message": "Tracking data updated"})

@app.route("/api/history/<device_id>", methods=["GET"])
def get_history(device_id):
    history = db.reference("history/" + device_id).get()
    if history:
        return jsonify(history)
    return jsonify({})

# ---------- AUTH API ----------

@app.route("/api/register", methods=["POST"])
def register_user():
    try:
        data = request.json
        email = data.get("email")
        if not email:
            return jsonify({"error": "Email is required"}), 400
        
        # Sanitize email for Firebase key
        user_key = email.replace(".", ",")
        
        # Check if user already exists
        ref = db.reference(f"users/{user_key}")
        if ref.get():
            return jsonify({"error": "User already exists"}), 400
        
        ref.set(data)
        return jsonify({"message": "User registered successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/login", methods=["POST"])
def login_user():
    try:
        data = request.json
        email = data.get("email")
        password = data.get("password")
        
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400
        
        user_key = email.replace(".", ",")
        user = db.reference(f"users/{user_key}").get()
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        if user.get("password") == password:
            return jsonify({"message": "Login successful", "user": user})
        else:
            return jsonify({"error": "Invalid password"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/profile/<email>", methods=["GET"])
def get_profile(email):
    try:
        user_key = email.replace(".", ",")
        user = db.reference(f"users/{user_key}").get()
        if user:
            return jsonify(user)
        return jsonify({"error": "User not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
