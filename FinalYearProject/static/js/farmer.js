function add_product() {
  fetch("http://127.0.0.1:5000/api/add_product", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: document.getElementById("name").value,
      price: document.getElementById("price").value,
      deviceId: document.getElementById("deviceId").value,
      
    })
  })
  .then(res => res.json())
  .then(data => {
    document.getElementById("msg").innerText = data.message;
  })
  .catch(err => {
    document.getElementById("msg").innerText = "Error adding product";
  });
}
