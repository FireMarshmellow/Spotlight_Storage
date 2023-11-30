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
    const sideMenu = document.getElementById("mySideMenu");
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
    const title = document.getElementById("title");
    const sideMenu = document.getElementById("mySideMenu");
    const menuTitle = document.getElementById("menu_title")
    const menuButton = document.getElementById("menu-button")

    const brightnessOutput = document.getElementById("brightness-output");
    const brightnessTitle = document.getElementById("brightness-title");

    const timeoutOutput = document.getElementById("timeout-output");
    const timeoutTitle = document.getElementById("timeout-title");

    lightModeButton.innerHTML = lightMode ? "Dark Mode" : "Light Mode";

    const background = "bg-gray-700";
    const textdark = "text-gray-700";
    const text = "text-gray-200";

    if (lightMode) {
        body.classList.remove(background);
        title.classList.remove(text);
        title.classList.add(textdark);

        sideMenu.style.backgroundColor = "#f1f1f1";

        menuTitle.classList.add(textdark);

        brightnessOutput.classList.remove(text);
        timeoutOutput.classList.remove(text);
        brightnessTitle.classList.remove(text);
        timeoutTitle.classList.remove(text);

        timeoutOutput.classList.add(textdark);
        brightnessOutput.classList.add(textdark);
        brightnessTitle.classList.add(textdark);
        timeoutTitle.classList.add(textdark);
        menuButton.classList.add(textdark);
    } else {
        body.classList.add(background);
        title.classList.remove(textdark);
        title.classList.add(text);

        sideMenu.style.backgroundColor = "#1F2937FF";
        menuTitle.classList.remove(textdark);

        brightnessOutput.classList.add(text);
        timeoutOutput.classList.add(text);
        brightnessTitle.classList.add(text);
        timeoutTitle.classList.add(text);

        timeoutOutput.classList.remove(textdark);
        brightnessOutput.classList.remove(textdark);
        brightnessTitle.classList.remove(textdark);
        timeoutTitle.classList.remove(textdark);
        menuButton.classList.remove(textdark);
    }


}

// Add event listeners to the "On" and "Off" buttons
const onButton = document.getElementById("on-button");
const offButton = document.getElementById("off-button");
const partyButton = document.getElementById("party-button");

const lightModeButton = document.getElementById("light-mode");

onButton.addEventListener('click', () => {sendLedRequest('on')});
offButton.addEventListener('click', () => {sendLedRequest('off')});
partyButton.addEventListener('click', () => {sendLedRequest('party')});
document.getElementById("brightness").addEventListener("input", function (event) {updateBrightnessOutput();});
document.getElementById("timeout").addEventListener("input", function (event) {updateTimeoutOutput();});
lightModeButton.addEventListener("click", () => {toggleLightMode();});
loadSettings();
