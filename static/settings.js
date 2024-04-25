// Function to update brightness output
function updateBrightnessOutput() {
    const brightnessSlider = document.getElementById("settings_brightness");
    document.getElementById('brightness-display').textContent = brightnessSlider.value + "%";
    addSettings(event);
}

function updateTimeoutOutput() {
    const timeoutSlider = document.getElementById("settings_timeout");
    if (timeoutSlider.value < 1) {
        document.getElementById('timeout-display').textContent = "Off";
    } else {
        const minutes = Math.floor(timeoutSlider.value / 60);
        const seconds = timeoutSlider.value % 60;

        document.getElementById('timeout-display').textContent = minutes + "m " + seconds + "s";
    }
    addSettings(event);
}

function addSettings(event) {
    //event.preventDefault();
    const brightness = document.getElementById("settings_brightness").value;
    const timeout = document.getElementById("settings_timeout").value;
    if (lightMode === undefined){
        lightMode = "light"
    }
    const settings = {brightness, timeout, lightMode};
    console.log(settings);
    // Save the settings in the database using fetch
    fetch("/api/settings", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(settings),
    })
        .then((response) => response.json())
        .catch((error) => console.error(error));
}

const timeoutRange = document.getElementById('settings_timeout');
timeoutRange.addEventListener('input', function () {
    if (this.value < 1) {
        document.getElementById('timeout-display').textContent = "Off";
    } else {
        var minutes = Math.floor(this.value / 60);
        var seconds = this.value % 60;

        var timeString = minutes + "m " + seconds + "s";
        document.getElementById('timeout-display').textContent = timeString;
    }
});
timeoutRange.addEventListener('change', function () {
    updateTimeoutOutput();
});

const brightnessRange = document.getElementById('settings_brightness');
brightnessRange.addEventListener('input', function () {
    document.getElementById('brightness-display').textContent = this.value + "%";
});
brightnessRange.addEventListener('change', function () {
    updateBrightnessOutput();
});

function loadSettings() {
    // Fetch the settings from the server
    fetch("/api/settings", {
        method: "GET",
        headers: {"Content-Type": "application/json"},
    })
        .then((response) => response.json())
        .then((settings) => {
            console.log("Loaded settings: setting_timeout(" + settings.timeout + "), setting_brightness(" + settings.brightness + ")");
            // Update input fields with the retrieved settings
            document.getElementById("settings_brightness").value = settings.brightness;
            document.getElementById("settings_timeout").value = settings.timeout;
            lightMode = settings.lightMode;
        })
        .catch((error) => console.error(error));
}

window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-bs-theme-value]')
        .forEach(toggle => {
            toggle.addEventListener('click', () => {
                let theme;
                theme = toggle.getAttribute('data-bs-theme-value');
                lightMode = theme;
                addSettings(event);
            })
        })
})

// Function to send a GET request based on the button pressed
function sendLedRequest(state) {
    const url = `/led/${state}`; // Replace with the actual endpoint
    fetch(url)
        .then((response) => {
        })
        .catch((error) => {
            console.error("Error:", error);
        });
}

var myOffcanvas = document.getElementById('offcanvasSettings')
myOffcanvas.addEventListener('show.bs.offcanvas', function () {
    console.log("Settings side-bar: 'show'");
    updateBrightnessOutput();
    updateTimeoutOutput();
    populateEspTable();
})

var scrollToTop = document.querySelectorAll('.scroll-to-top');
scrollToTop.forEach(function (scrollToTop) {
    scrollToTop.addEventListener('click', function (e) {
        e.preventDefault();
        window.scroll({
            top: 0,
            left: 0,
            behavior: 'smooth'
        });
    });
});

document.getElementById("on-button").addEventListener('click', () => {
    sendLedRequest('on')
});
document.getElementById("off-button").addEventListener('click', () => {
    sendLedRequest('off')
});
document.getElementById("party-button").addEventListener('click', () => {
    sendLedRequest('party')
});

loadSettings();
populateEspTable();