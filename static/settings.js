const onButton = document.getElementById('on-button');
const offButton = document.getElementById('off-button');
const partyButton = document.getElementById('party-button');
const brightnessButton = document.getElementById('apply-brightness');
// Function to update brightness output
function updateBrightnessOutput() {
    const brightnessSlider = document.getElementById("brightness");
    const brightnessOutput = document.getElementById("brightness-output");
    brightnessOutput.innerText = brightnessSlider.value + "%";
    addSettings(event);

}
function applyBrightness() {
    // Send a POST request to update the LED brightness
    fetch("/led/brightness", { })
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

function addSettings(event) {
    event.preventDefault();
    const brightness = document.getElementById("brightness").value;


    const settings = {brightness };

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
    fetch("/api/settings",{
        method: "GET",
        headers: { "Content-Type": "application/json" },
    })
        .then((response) => response.json())
        .then((settings) => {
            // Update input fields with the retrieved settings
            document.getElementById("brightness").value = settings.brightness;
        })
        .catch((error) => console.error(error));
}
// Function to send a GET request based on the button pressed
function sendLedRequest(state) {
    const url = `/led/${state}`; // Replace with the actual endpoint
    fetch(url)
        .then(response => {})
        .catch(error => {
            console.error('Error:', error);
        });
}
function toggleSideMenu() {
    var sideMenu = document.getElementById("mySideMenu");
    updateBrightnessOutput();
    if (sideMenu.style.width === "250px") {
        sideMenu.style.width = "0";
        addSettings(event);
    } else {
        loadSettings()
        sideMenu.style.width = "250px";
    }
}

// Add event listeners to the "On" and "Off" buttons


onButton.addEventListener('click', () => {sendLedRequest('on')});
offButton.addEventListener('click', () => {sendLedRequest('off')});
partyButton.addEventListener('click', () => {sendLedRequest('party')});
brightnessButton.addEventListener("click", applyBrightness)
document.getElementById("brightness").addEventListener("input", function (event) {updateBrightnessOutput();});
loadSettings();

