const email = sessionStorage.getItem("loggedInUser");

fetch("/api/profile/" + email)
  .then(res => res.json())
  .then(user => {
    document.getElementById("name").innerText = user.name;
    document.getElementById("email").innerText = user.email;
    document.getElementById("mobile").innerText = user.mobile;
    document.getElementById("gender").innerText = user.gender;
    document.getElementById("dob").innerText = user.dob;
    document.getElementById("crops").innerText = user.crops;
  });
