console.log("consumer.js loaded");

fetch("/api/products")
  .then(res => res.json())
  .then(data => {
    console.log("Products data:", data);

    let html = "";

    if (!data || Object.keys(data).length === 0) {
      html = "<p>No products available</p>";
    } else {
      for (let key in data) {
        let p = data[key];

        html += `
          <div style="border:1px solid #ccc;padding:10px;margin:10px">
            <p><b>${p.name}</b></p>
            <p>Price: ₹${p.price}</p>
            <p>Device ID: ${p.deviceId}</p>
            <button onclick="track('${p.deviceId}')">Track</button>
          </div>
        `;
      }
    }

    document.getElementById("products").innerHTML = html;
  })
  .catch(err => {
    console.error(err);
    document.getElementById("products").innerHTML = "Error loading products";
  });

function track(deviceId) {
  console.log("Tracking device:", deviceId);
  window.location.href = "/track?deviceId=" + deviceId;
}
