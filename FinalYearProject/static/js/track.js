console.log("track.js loaded");

const params = new URLSearchParams(window.location.search);
const deviceId = params.get("deviceId");

console.log("Device ID:", deviceId);

if (!deviceId) {
  alert("No device selected");
}

fetch("/api/track/" + deviceId)
  .then(res => res.json())
  .then(data => {
    console.log("Tracking data:", data);

    if (!data) {
      alert("No tracking data available");
      return;
    }

    document.getElementById("lat").innerText = data.latitude ?? "--";
    document.getElementById("lon").innerText = data.longitude ?? "--";
    document.getElementById("temp").innerText = data.temperature ?? "--";
    document.getElementById("hum").innerText = data.humidity ?? "--";
    document.getElementById("time").innerText = data.timestamp ?? "--";
  })
  .catch(err => {
    console.error(err);
    alert("Error loading tracking data");
  });
