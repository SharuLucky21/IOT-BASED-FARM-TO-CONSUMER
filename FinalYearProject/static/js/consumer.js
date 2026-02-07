let products = {};
let cart = [];

// ----------------------------
// SESSION CHECK
// ----------------------------
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

// ----------------------------
// LOAD PRODUCTS
// ----------------------------
function loadProducts() {
  fetch("/api/products")
    .then(res => res.json())
    .then(data => {
      products = data || {};
      renderProducts();
    })
    .catch(err => {
      console.error(err);
      document.getElementById("products").innerHTML = "Error loading products";
    });
}

// ----------------------------
// LOAD ORDERS
// ----------------------------
function loadOrders() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!user.email) return;

  fetch(`/api/consumer_orders/${user.email}`)
    .then(res => res.json())
    .then(data => renderOrders(data))
    .catch(err => console.error(err));
}

// ----------------------------
// RENDER ORDERS
// ----------------------------
function renderOrders(ordersData) {
  let html = "";

  if (!ordersData || Object.keys(ordersData).length === 0) {
    html = "<p>No orders placed yet.</p>";
  } else {
    for (let key in ordersData) {
      const order = ordersData[key];
      const itemsNames = order.items.map(i => i.name).join(", ");
      const deviceId = order.items[0]?.deviceId || "";

      html += `
        <div class="product-card" style="border-left:5px solid #27ae60;">
          <h4>Order #${key.substring(1, 6).toUpperCase()}</h4>
          <p><b>Items:</b> ${itemsNames}</p>
          <p><b>Total:</b> ₹${order.totalAmount}</p>
          <p><b>Status:</b> ${order.status}</p>
          ${
            deviceId
              ? `<button class="track-btn" onclick="track('${deviceId}')">Track Delivery</button>`
              : `<p style="color:#999;">Tracking unavailable</p>`
          }
        </div>
      `;
    }
  }

  document.getElementById("myOrders").innerHTML = html;
}

// ----------------------------
// RENDER PRODUCTS
// ----------------------------
function renderProducts() {
  let html = "";

  if (!products || Object.keys(products).length === 0) {
    html = "<p>No products available</p>";
  } else {
    for (let key in products) {
      const p = products[key];
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

// ----------------------------
// CART FUNCTIONS
// ----------------------------
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
        <button onclick="removeFromCart(${index})"
          style="padding:2px 8px; background:#e74c3c;">X</button>
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

// ----------------------------
// ADDRESS MODAL
// ----------------------------
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

// ----------------------------
// CONFIRM ORDER
// ----------------------------
function confirmOrder() {
  const address = document.getElementById("deliveryAddress").value.trim();
  if (!address) {
    alert("Please enter a delivery address.");
    return;
  }

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const orderData = {
    consumerEmail: user.email,
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
    .then(() => {
      cart = [];
      renderCart();
      closeAddressModal();
      showOrderSuccess(orderData);
    })
    .catch(err => {
      console.error(err);
      alert("Failed to place order.");
    });
}

// ----------------------------
// ORDER SUCCESS UI
// ----------------------------
function showOrderSuccess(orderData) {
  const container = document.querySelector(".container");

  const itemsHtml = orderData.items.map(item => `
    <div style="display:flex; justify-content:space-between; padding:10px 0;">
      <span>${item.name}</span>
      <span>₹${item.price}</span>
    </div>
  `).join("");

  container.innerHTML = `
    <div style="background:white; padding:40px; border-radius:14px;">
      <h1 style="color:#27ae60;">🎉 Order Placed Successfully!</h1>
      <p><b>Delivery Address:</b> ${orderData.address}</p>
      <div>${itemsHtml}</div>
      <h3>Total: ₹${orderData.totalAmount}</h3>
      <button onclick="window.location.reload()">Back to Shop</button>
    </div>

    <div id="orders-section" style="margin-top:40px;">
      <h2>My Orders</h2>
      <div id="myOrders"></div>
    </div>
  `;

  loadOrders();
}

// ----------------------------
// TRACK DELIVERY
// ----------------------------
function track(deviceId) {
  if (!deviceId) {
    alert("Tracking not available for this order.");
    return;
  }
  window.location.href = "/track?deviceId=" + encodeURIComponent(deviceId);
}
