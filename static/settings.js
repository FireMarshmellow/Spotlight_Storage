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
    if (language === undefined){
        language = "en"
    }
    const settings = {brightness, timeout, lightMode, colors, language};
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
            language = settings.language;
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

let currentnventurItemIndex = 0; // Keep track of the current item index
document.getElementById('cancel-inventur-button').addEventListener('click', function(){
    currentnventurItemIndex = 0;
})
document.getElementById("inventur").addEventListener("click", function () {
    const edit_btn = document.getElementById('edit-btn-inventur');
    const continue_btn = document.getElementById('continue-btn-inventur');
    const text = document.getElementById('current-item-text');
    const img = document.getElementById('current-item-img');
    const amount = document.getElementById('current-item-amount');
    const minus_btn = document.getElementById('minus-btn-inventur');
    const plus_btn = document.getElementById('plus-btn-inventur');
    // Create an array of objects containing ids and names
    const itemsData = fetchedItems
    // Function to display current item
    const confirmationModal = new bootstrap.Modal(document.getElementById('inventur-modal'));
    confirmationModal.show();
    function displayItem(index) {
        const currentItem = itemsData[index];
        text.innerHTML = currentItem.name;
        amount.innerHTML = currentItem.quantity;
        img.src = currentItem.image;
        fetch(`/api/items/${currentItem.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ action: "locate" }),
        }).catch((error) => console.error(error));
    }

    // Display the first item
    displayItem(currentnventurItemIndex);
    minus_btn.onclick = function() {
        const currentItem = itemsData[currentnventurItemIndex];
        handleQuantityChange(currentItem, -1);
        amount.innerHTML = currentItem.quantity - 1;
    };

    plus_btn.onclick = function() {
        const currentItem = itemsData[currentnventurItemIndex];
        handleQuantityChange(currentItem, + 1);
        amount.innerHTML = currentItem.quantity + 1 ;
    };


    edit_btn.addEventListener("click", function () {
        const currentItem = itemsData[currentnventurItemIndex];
        isEditingItem = true;
        console.log("editing item")
        removeLocalStorage();


        $("#item-modal").modal("show");
        confirmationModal.hide();
        document.getElementById("item_name").value = currentItem.name;
        document.getElementById("item_url").value = currentItem.link;
        document.getElementById("item_image").value = currentItem.image;
        document.getElementById("item_quantity").value = currentItem.quantity;

        // Set LED positions for editing
        localStorage.setItem('led_positions', JSON.stringify(currentItem.position))
        clickedCells = JSON.parse(localStorage.getItem('led_positions'));
        localStorage.setItem('edit_led_positions', JSON.stringify(currentItem.position))
        localStorage.setItem('edit_image_path', JSON.stringify(currentItem.image))

        // Set item tags for editing
        if (currentItem.tags) {
            const cleanedTags = currentItem.tags.replace(/[\[\]'"`\\]/g, '');
            const itemTagsArray = cleanedTags.split(',');
            localStorage.setItem('item_tags', JSON.stringify(itemTagsArray))
            tags = itemTagsArray;
            loadTagsIntoTagify()
        }

        // Set editing item ID and IP
        editingItemId = currentItem.id;
        editingItemIP = currentItem.ip;
        // Check if not already editing an item
    });


    // Handle the "continue" button click
    continue_btn.addEventListener("click", function () {
        console.log("Continue clicked for item with ID: " + itemsData[currentnventurItemIndex].id);
        currentnventurItemIndex++; // Move to the next item
        if (currentnventurItemIndex < itemsData.length) {
            // Display the next item if there's any left
            displayItem(currentnventurItemIndex);
        } else {
            console.log("End of items reached.");
            currentnventurItemIndex = 0; // Reset to the beginning
            displayItem(currentnventurItemIndex); // Display the first item again
        }
    });
});



document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    populateEspTable();
    sendLedRequest('on');
});
