var lightMode = false;

// Function to update brightness output
function updateBrightnessOutput() {
  const brightnessSlider = document.getElementById("brightness");
  const brightnessOutput = document.getElementById("brightness-output");
  brightnessOutput.innerText = brightnessSlider.value + "%";
  addSettings(event);
}
function updateTimeoutOutput() {
  const timeoutSlider = document.getElementById("timeout");
  const timeoutOutput = document.getElementById("timeout-output");
  timeoutOutput.innerText = timeoutSlider.value + " S";
  if (timeoutSlider.value < 1) {
    timeoutOutput.innerText = "Turn off timeout";
  }
  addSettings(event);
}
function applyBrightness() {
  // Send a POST request to update the LED brightness
  fetch("/led/brightness", {})
    .then((response) => {
      if (response.ok) {
        // Successfully updated brightness
        console.log("Brightness updated successfully");
      } else {
        // Handle error cases here
        console.error("Failed to update brightness");
      }
    })
    .catch((error) => console.error(error));
}
const settingsButton = document.getElementById("apply-settings");
settingsButton.addEventListener("click", applyBrightness);
function addSettings(event) {
  //event.preventDefault();
  const brightness = document.getElementById("brightness").value;
  const timeout = document.getElementById("timeout").value;

  const settings = { brightness, timeout, lightMode };

  // Save the settings in the database using fetch
  fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  })
    .then((response) => response.json())
    .catch((error) => console.error(error));
}
function loadSettings() {
  // Fetch the settings from the server
  fetch("/api/settings", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  })
    .then((response) => response.json())
    .then((settings) => {
      // Update input fields with the retrieved settings
      document.getElementById("brightness").value = settings.brightness;
      document.getElementById("timeout").value = settings.timeout;
      lightMode = settings.lightMode;
      activateLightMode();
    })
    .catch((error) => console.error(error));
}
// Function to send a GET request based on the button pressed
function sendLedRequest(state) {
  const url = `/led/${state}`; // Replace with the actual endpoint
  fetch(url)
    .then((response) => {})
    .catch((error) => {
      console.error("Error:", error);
    });
}
function toggleSideMenu() {
  var sideMenu = document.getElementById("mySideMenu");
  updateBrightnessOutput();
  updateTimeoutOutput();
  activateLightMode();
  if (sideMenu.style.width === "250px") {
    sideMenu.style.width = "0";
    addSettings(event);
  } else {
    loadSettings();
    sideMenu.style.width = "250px";
  }
}

function toggleLightMode() {
  lightMode = !lightMode;
  activateLightMode();
  addSettings(event);
}

function activateLightMode() {
  const body = document.getElementsByTagName("body")[0];
  const title = document.getElementById("tittle");
  const sideMenu = document.getElementById("mySideMenu");
  const menuTitle = document.getElementsByClassName("menu-title");

  const brightnessOutput = document.getElementById("brightness-output");
  const brightnessTitle = document.getElementById("brightness-title");

  const timeoutOutput = document.getElementById("timeout-output");
  const timeoutTitle = document.getElementById("timeout-title");

  lightModeButton.innerHTML = lightMode ? "Dark Mode" : "Light Mode";

  if (lightMode) {
    body.classList.remove("bg-gray-700");
    title.classList.remove("text-gray-200");
    title.classList.add("text-gray-700");

    sideMenu.style.backgroundColor = "#f1f1f1";

    menuTitle[0].classList.add("text-gray-700");
    menuTitle[1].classList.add("text-gray-700");

    brightnessOutput.classList.remove("text-gray-200");
    timeoutOutput.classList.remove("text-gray-200");
    brightnessTitle.classList.remove("text-gray-200");
    timeoutTitle.classList.remove("text-gray-200");

    timeoutOutput.classList.add("text-gray-700");
    brightnessOutput.classList.add("text-gray-700");
    brightnessTitle.classList.add("text-gray-700");
    timeoutTitle.classList.add("text-gray-700");
  } else {
    body.classList.add("bg-gray-700");
    title.classList.remove("text-gray-700");
    title.classList.add("text-gray-200");

    sideMenu.style.backgroundColor = "rgb(31 41 55)";
    menuTitle[0].classList.remove("text-gray-700");
    menuTitle[1].classList.remove("text-gray-700");

    brightnessOutput.classList.add("text-gray-200");
    timeoutOutput.classList.add("text-gray-200");
    brightnessTitle.classList.add("text-gray-200");
    timeoutTitle.classList.add("text-gray-200");

    timeoutOutput.classList.remove("text-gray-700");
    brightnessOutput.classList.remove("text-gray-700");
    brightnessTitle.classList.remove("text-gray-700");
    timeoutTitle.classList.remove("text-gray-700");
  }
}

// Add event listeners to the "On" and "Off" buttons
const onButton = document.getElementById("on-button");
const offButton = document.getElementById("off-button");
const partyButton = document.getElementById("party-button");

const lightModeButton = document.getElementById("light-mode");

onButton.addEventListener("click", () => {
  sendLedRequest("on");
});
offButton.addEventListener("click", () => {
  sendLedRequest("off");
});
partyButton.addEventListener("click", () => {
  sendLedRequest("party");
});
document
  .getElementById("brightness")
  .addEventListener("input", function (event) {
    updateBrightnessOutput();
  });
document.getElementById("timeout").addEventListener("input", function (event) {
  updateTimeoutOutput();
});

lightModeButton.addEventListener("click", () => {
  toggleLightMode();
});

loadSettings();
