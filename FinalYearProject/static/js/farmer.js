const farmerEmail = localStorage.getItem("loggedInUser");

if (!farmerEmail) {
    alert("Please login first");
    window.location.href = "/login";
}

function add_product() {
  fetch("/api/add_product", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: document.getElementById("name").value,
      price: document.getElementById("price").value,
      deviceId: document.getElementById("deviceId").value,
      status: document.getElementById("status").value,
      farmerEmail: farmerEmail
    })
  })
  .then(res => res.json())
  .then(data => {
    document.getElementById("msg").innerText = data.message;
    loadFarmerProducts();
  })
  .catch(err => {
    document.getElementById("msg").innerText = "Error adding product";
  });
}

function loadFarmerProducts() {
    fetch(`/api/farmer_products/${farmerEmail}`)
        .then(res => res.json())
        .then(data => {
            let html = "";
            if (!data || Object.keys(data).length === 0) {
                html = "<p>You haven't added any products yet.</p>";
            } else {
                for (let key in data) {
                    let p = data[key];
                    html += `
                        <div style="border:1px solid #ccc;padding:10px;margin:10px;background:white;border-radius:8px">
                            <p><b>${p.name}</b></p>
                            <p>Price: ₹${p.price}</p>
                            <p>Device ID: ${p.deviceId}</p>
                            <p>Status: ${p.status}</p>
                        </div>
                    `;
                }
            }
            document.getElementById("farmerProducts").innerHTML = html;
        });
}

loadFarmerProducts();
