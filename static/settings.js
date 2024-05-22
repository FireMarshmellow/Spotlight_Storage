var myOffcanvas = document.getElementById('offcanvasSettings')
const timeoutRange = document.getElementById('settings_timeout');
const brightnessRange = document.getElementById('settings_brightness');
const scrollToTop = document.querySelectorAll('.scroll-to-top');



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
    const colors = [
        document.getElementById("color-standby").value.toString(),
        document.getElementById("color-locate").value.toString()
    ];
    if (lightMode === undefined){
        lightMode = "light"
    }
    const settings = {brightness, timeout, lightMode, colors};
    // Save the settings in the database using fetch
    fetch("/api/settings", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(settings),
    })
        .then((response) => response.json())
        .catch((error) => console.error(error));
}



function loadSettings() {
    // Fetch the settings from the server
    fetch("/api/settings", {
        method: "GET",
        headers: {"Content-Type": "application/json"},
    })
        .then((response) => response.json())
        .then((settings) => {
            // Update input fields with the retrieved settings
            document.getElementById("settings_brightness").value = settings.brightness;
            document.getElementById("settings_timeout").value = settings.timeout;
            // Ensure colors is an array and update the color inputs

            const colors = Array.isArray(settings.colors) ? settings.colors : JSON.parse(settings.colors);
            document.getElementById("color-standby").value = colors[0];
            document.getElementById("color-locate").value = colors[1];
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

// colorPicker.js

function updateColor(inputId, spanId) {
    const input = document.getElementById(inputId);
    const span = document.getElementById(spanId);
    const color = input.value;
    console.log(color);
    span.textContent = color;
    input.style.color = color;
    addSettings();
}

document.getElementById("color-standby").addEventListener('change', function () {
    updateColor('color-standby', 'picked-color-standby')
});
document.getElementById("color-locate").addEventListener('change', function () {
    updateColor('color-locate', 'picked-color-locate')
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

brightnessRange.addEventListener('input', function () {
    document.getElementById('brightness-display').textContent = this.value + "%";
});
brightnessRange.addEventListener('change', function () {
    updateBrightnessOutput();
});


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

myOffcanvas.addEventListener('show.bs.offcanvas', function () {
    updateBrightnessOutput();
    updateTimeoutOutput();
    populateEspTable();
})


loadSettings();
populateEspTable();