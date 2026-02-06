let products = {};
let cart = [];

// Check session on load
document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!user.email || user.role !== "consumer") {
    alert("Please login as a consumer first.");
    window.location.href = "/login";
    return;
  }
  loadProducts();
  loadOrders();
});

function loadProducts() {
  fetch("/api/products")
    .then(res => res.json())
    .then(data => {
      products = data;
      renderProducts();
    })
    .catch(err => {
      console.error(err);
      document.getElementById("products").innerHTML = "Error loading products";
    });
}

function loadOrders() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!user.email) return;

  fetch(`/api/consumer_orders/${user.email}`)
    .then(res => res.json())
    .then(data => {
      renderOrders(data);
    })
    .catch(err => console.error(err));
}

function renderOrders(ordersData) {
  let html = "";
  if (!ordersData || Object.keys(ordersData).length === 0) {
    html = "<p>No orders placed yet.</p>";
  } else {
    for (let key in ordersData) {
      let order = ordersData[key];
      let itemsNames = order.items.map(i => i.name).join(", ");
      // We'll use the first item's deviceId for tracking if multiple items
      let deviceId = order.items[0].deviceId; 

      html += `
        <div class="product-card" style="border-left: 5px solid #27ae60;">
          <h4>Order #${key.substring(1, 6).toUpperCase()}</h4>
          <p><b>Items:</b> ${itemsNames}</p>
          <p><b>Total:</b> ₹${order.totalAmount}</p>
          <p><b>Status:</b> ${order.status}</p>
          <button class="track-btn" onclick="track('${deviceId}')">Track Delivery</button>
        </div>
      `;
    }
  }
  document.getElementById("myOrders").innerHTML = html;
}

function renderProducts() {
  let html = "";
  if (!products || Object.keys(products).length === 0) {
    html = "<p>No products available</p>";
  } else {
    for (let key in products) {
      let p = products[key];
      html += `
        <div class="product-card">
          <h3>${p.name}</h3>
          <p>Price: ₹${p.price}</p>
          <p>Status: ${p.status}</p>
          <button onclick="addToCart('${key}')">Add to Cart</button>
        </div>
      `;
    }
  }
  document.getElementById("products").innerHTML = html;
}

function addToCart(key) {
  cart.push({ ...products[key], id: key });
  renderCart();
}

function renderCart() {
  let html = "";
  let total = 0;
  cart.forEach((item, index) => {
    total += parseFloat(item.price);
    html += `
      <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
        <span>${item.name}</span>
        <span>₹${item.price}</span>
        <button onclick="removeFromCart(${index})" style="padding:2px 8px; background:#e74c3c;">X</button>
      </div>
    `;
  });
  document.getElementById("cartItems").innerHTML = html;
  document.getElementById("cartTotal").innerText = total;
}

function removeFromCart(index) {
  cart.splice(index, 1);
  renderCart();
}

const DELIVERABLE_CITIES = ["hyderabad"];

function openAddressModal() {
  if (cart.length === 0) {
    alert("Cart is empty!");
    return;
  }
  document.getElementById("addressModal").style.display = "flex";
}

function closeAddressModal() {
  document.getElementById("addressModal").style.display = "none";
  document.getElementById("deliveryStatus").innerText = "";
}

function confirmOrder() {
  const address = document.getElementById("deliveryAddress").value.trim();
  if (!address) {
    alert("Please enter a delivery address.");
    return;
  }

  // Check if delivery is possible
  const city = address.toLowerCase();
  const isDeliverable = DELIVERABLE_CITIES.some(c => city.includes(c));

  if (!isDeliverable) {
    const statusMsg = document.getElementById("deliveryStatus");
    statusMsg.innerText = "Error: Sorry, we only deliver within Hyderabad at the moment.";
    statusMsg.style.color = "#e74c3c";
    return;
  }

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const orderData = {
    consumerEmail: user.email || "guest@example.com",
    address: address,
    items: cart,
    totalAmount: document.getElementById("cartTotal").innerText,
    status: "Ordered",
    timestamp: new Date().toISOString()
  };

  fetch("/api/create_order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderData)
  })
    .then(res => res.json())
    .then(data => {
      closeAddressModal();
      alert("Order placed successfully!");
      // Clear cart
      cart = [];
      renderCart();
      showOrderSuccess(orderData);
    })
    .catch(err => {
      console.error(err);
      alert("Failed to place order.");
    });
}

function showOrderSuccess(orderData) {
    const container = document.querySelector('.container');
    let itemsHtml = orderData.items.map(item => `
        <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #eee;">
            <span>${item.name}</span>
            <span>₹${item.price}</span>
        </div>
    `).join('');

    container.innerHTML = `
        <div style="width:100%; display:flex; flex-direction:column; gap:20px;">
            <div style="text-align:center; padding:40px; background:white; border-radius:14px; box-shadow:0 6px 16px rgba(0,0,0,.1);">
                <h1 style="color:#27ae60; margin-bottom:10px;">🎉 Order Placed Successfully!</h1>
                <p>Your order has been confirmed and is being prepared.</p>
                
                <div style="margin:40px 0; display:flex; justify-content:center; align-items:center; gap:0; max-width:600px; margin-left:auto; margin-right:auto;">
                    <div style="text-align:center; flex:1;">
                        <div style="width:60px; height:60px; background:#27ae60; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto; position:relative; z-index:2;">
                            <img src="https://cdn-icons-png.flaticon.com/512/2972/2972185.png" style="width:35px; filter:invert(1);">
                        </div>
                        <p style="margin-top:10px;"><b>Ordered</b></p>
                    </div>
                    <div style="flex:1; height:4px; background:#ddd; margin-top:-30px;"></div>
                    <div style="text-align:center; flex:1;">
                        <div style="width:60px; height:60px; background:#ddd; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto; position:relative; z-index:2;">
                            <img src="https://cdn-icons-png.flaticon.com/512/709/709790.png" style="width:35px;">
                        </div>
                        <p style="margin-top:10px; color:#888;">Out for Delivery</p>
                    </div>
                    <div style="flex:1; height:4px; background:#ddd; margin-top:-30px;"></div>
                    <div style="text-align:center; flex:1;">
                        <div style="width:60px; height:60px; background:#ddd; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto; position:relative; z-index:2;">
                            <img src="https://cdn-icons-png.flaticon.com/512/1161/1161388.png" style="width:35px;">
                        </div>
                        <p style="margin-top:10px; color:#888;">Delivered</p>
                    </div>
                </div>
            </div>

            <div style="background:white; padding:30px; border-radius:14px; box-shadow:0 6px 16px rgba(0,0,0,.1);">
                <h2>Order Summary</h2>
                <p><b>Delivery Address:</b> ${orderData.address}</p>
                <div style="margin:20px 0;">
                    ${itemsHtml}
                </div>
                <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:1.2em; margin-top:20px; border-top:2px solid #eee; padding-top:10px;">
                    <span>Total</span>
                    <span>₹${orderData.totalAmount}</span>
                </div>
                <button onclick="window.location.reload()" style="margin-top:30px; width:100%;">Back to Shop</button>
            </div>

            <div id="orders-section" style="margin-top: 40px; width: 100%;">
                <h2>My Orders</h2>
                <div id="myOrders" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;"></div>
            </div>
        </div>
    `;
    loadOrders(); // Re-load orders in the new view
}

function track(deviceId) {
  window.location.href = "/track?deviceId=" + deviceId;
}
