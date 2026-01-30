function login() {
  fetch("/api/login", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      email: document.getElementById("email").value,
      password: document.getElementById("password").value
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      alert("Invalid login");
      return;
    }

    sessionStorage.setItem("loggedInUser", data.email);

    if (data.role === "farmer") {
      window.location.href = "/farmer";
    } else {
      window.location.href = "/consumer";
    }
  });
}
