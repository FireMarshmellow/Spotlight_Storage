let lightMode = false;

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
        timeoutOutput.innerText = "Timeout off";
    }
    addSettings(event);
}
function applyBrightness() {
    // Send a POST request to update the LED brightness
    fetch("/led/brightness", {})
        .then((response) => {})
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

function updateTimeDisplay(seconds) {
    var minutes = Math.floor(seconds / 60);
    var seconds = seconds % 60;

    var timeString = minutes + "m " + seconds + "s";
    document.getElementById('time-display').textContent = timeString;
    document.getElementById('timeout-output').value = seconds;
}
function updateBrightnessDisplay(value) {
    document.getElementById('brightness-display').textContent = value + "%";
    document.getElementById('brightness-output').value = value;
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
    const sideMenu = document.getElementById("mySideMenu");

    updateBrightnessOutput();
    updateTimeoutOutput();
    if (sideMenu.style.width === "250px") {
        sideMenu.style.width = "0";
        sideMenu.style.display = "none";
        addSettings(event);
    } else {
        sideMenu.style.display = "block";
        loadSettings();
        sideMenu.style.width = "250px";
    }
}

function toggleLightMode() {
    lightMode = !lightMode;
    addSettings(event);
    activateLightMode();

    var themeText = document.getElementById('theme-text');
    if (lightMode) {
        themeText.textContent = 'Dark Mode'; // Text for switching to Dark Mode
    } else {
        themeText.textContent = 'Light Mode'; // Text for switching to Light Mode
    }
}

function activateLightMode() {
    const themeIcon = document.getElementById('theme-icon');

    // Update the themeButton innerHTML based on the current lightMode
    themeIcon.innerHTML = lightMode ? 'dark_mode' : 'light_mode';
    if (lightMode) {
        document.body.classList.add('light-mode');

    } else {
        document.body.classList.remove('light-mode');
    }
}

// Add event listeners to the "On" and "Off" buttons
const onButton = document.getElementById("on-button");
const offButton = document.getElementById("off-button");
const partyButton = document.getElementById("party-button");
onButton.addEventListener('click', () => {sendLedRequest('on')});
offButton.addEventListener('click', () => {sendLedRequest('off')});
partyButton.addEventListener('click', () => {sendLedRequest('party')});
document.getElementById("brightness").addEventListener("input", function (event) {updateBrightnessOutput();});
document.getElementById("timeout").addEventListener("input", function (event) {updateTimeoutOutput();});

loadSettings();
activateLightMode();