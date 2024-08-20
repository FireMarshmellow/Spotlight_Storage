// Function to populate the ESP table with data fetched from the server
function populateEspTable() {
    const espTable = document.getElementById("esp_table");

    // Display loading state
    espTable.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';

    // Fetch and populate the ESP data into the table
    fetch("/api/esp")
        .then((response) => response.json())
        .then((data) => {
            const tableBody = document.createElement("tbody");
            ESPs = data;
            populateESPMenu(data);
            data.forEach((esp) => {
                const row = document.createElement("tr");

                const cellName = document.createElement("td");
                cellName.textContent = esp.name;
                cellName.classList.add("ps-2");

                const cellIp = document.createElement("td");
                const ipLink = document.createElement("a");
                ipLink.href = `http://${esp.esp_ip}`;
                ipLink.textContent = esp.esp_ip;
                ipLink.target = "_blank"; // Opens link in a new window/tab
                ipLink.setAttribute("data-bs-toggle", "tooltip");
                ipLink.setAttribute("title", "WLED"); // Tooltip text
                cellIp.appendChild(ipLink);

                const cellActions = document.createElement("td");
                cellActions.classList.add("text-end");

                // Edit Button
                const editButton = document.createElement("button");
                editButton.type = "button";
                editButton.classList.add("btn", "btn-link", "me-2", "p-0", "icon-n4px");
                editButton.dataset.bsTarget = "#esp-modal";
                editButton.dataset.bsMode = "edit";
                editButton.dataset.bsEspId = esp.id;
                editButton.dataset.bsEspIp = esp.esp_ip;
                editButton.dataset.bsEspName = esp.name;
                editButton.dataset.bsEspRows = esp.rows;
                editButton.dataset.bsEspColumns = esp.cols;
                editButton.dataset.bsEspStartY = esp.start_top;
                editButton.dataset.bsEspStartX = esp.start_left;
                editButton.dataset.bsEspSerpentinedirection = esp.serpentine_direction;
                editButton.dataset.bsToggle = "modal";
                editButton.innerHTML = '<i data-lucide="file-edit" class="text-primary"></i>';

                // Delete Button
                const deleteButton = document.createElement("button");
                deleteButton.type = "button";
                deleteButton.classList.add("btn", "btn-link", "me-2", "p-0", "icon-n4px");
                deleteButton.dataset.bsTarget = "#esp-delete-modal";
                deleteButton.dataset.bsEspId = esp.id;
                deleteButton.dataset.bsEspIp = esp.esp_ip;
                deleteButton.dataset.bsEspName = esp.name;
                deleteButton.dataset.bsToggle = "modal";
                deleteButton.innerHTML = '<i data-lucide="trash" class="text-danger"></i>';

                cellActions.appendChild(editButton);
                cellActions.appendChild(deleteButton);

                row.appendChild(cellName);
                row.appendChild(cellIp);
                row.appendChild(cellActions);

                tableBody.appendChild(row);
            });

            // Clear the table and append the new data
            espTable.innerHTML = ""; // Clear the loading state
            espTable.appendChild(tableBody);
            lucide.createIcons();
        })
        .catch((error) => {
            console.error(error);
            // Display an error message or handle the error accordingly
            espTable.innerHTML = '<tr><td colspan="3">Failed to fetch data.</td></tr>';
        });
}


document.getElementById("save-esp-button").addEventListener('click', () => {
    const saveButton = document.getElementById('save-esp-button');
    let espId = saveButton.getAttribute('data-bs-esp-id');
    const name = document.getElementById("esp_name").value;
    const esp_ip = document.getElementById("esp_ip").value;
    const rows = document.getElementById("esp_rows").value;
    const cols = document.getElementById("esp_columns").value;

    const startTop = document.querySelector("#esp_starty option:checked").getAttribute("data-starty");
    const startLeft = document.querySelector("#esp_startx option:checked").getAttribute("data-startx");
    const serpentineDirection = document.querySelector("#esp_serpentine option:checked").getAttribute("data-serpentine");

    console.log(startTop, startLeft, serpentineDirection);

    const emptyFields = [];
    const isValidIPAddress = (ip) => {
        const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
        return ipRegex.test(ip) && ip.split('.').every(octet => parseInt(octet, 10) <= 255);
    };

    const showAlert = (alertId, message) => {
        const alert = document.getElementById(alertId);
        alert.classList.remove('d-none');
        const errorList = document.getElementById('error-list');
        errorList.innerHTML = message;
    };

    const handleEmptyFields = () => {
        if (name.trim() === '') {
            emptyFields.push('Name');
        }
        if (esp_ip.trim() === '') {
            emptyFields.push('IP Address');
        }
        if (emptyFields.length > 0) {
            showAlert(espId !== null && espId !== '' ? 'edit-esp-error-alert' : 'esp-error-alert', "The following fields are empty:<br>" + emptyFields.map(field => `<li>${field}</li>`).join(''));
            return true;
        }
        return false;
    };

    if (handleEmptyFields()) return;
    if (!isValidIPAddress(esp_ip)) {
        showAlert(espId !== null && espId !== '' ? 'edit-esp-error-alert' : 'esp-error-alert', "IP Address is not valid.");
        return;
    }

    const espItem = {
        name,
        esp_ip,
        rows,
        cols,
        startTop,
        startLeft,
        serpentineDirection
    };

    const processESPItem = () => {
        fetch(espId !== null && espId !== '' ? `/api/esp/${espId}` : '/api/esp', {
            method: espId !== null && espId !== '' ? "PUT" : "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(espItem),
        }).then((response) => response.json()).then(() => {
            setTimeout(() => {
                populateEspTable();
            }, 500);
            const new_esp_modal = document.querySelector('#esp-modal');
            const modal = bootstrap.Modal.getInstance(new_esp_modal);
            modal.hide();
        }).catch((error) => console.error(error));
    };

    const existingESP = ESPs.find(esp => esp.name === name || esp.esp_ip === esp_ip || esp.name === esp_ip);

    if (existingESP && (espId == null || espId === '')) {
        espId = existingESP.id;
        // Hide the esp-modal
        const espModal = bootstrap.Modal.getInstance(document.getElementById('esp-modal'));
        espModal.hide();

        // Show confirmation modal
        const confirmationModal = new bootstrap.Modal(document.getElementById('esp-override-modal'));
        document.getElementById('deviceNameSpan').textContent = existingESP.name;
        document.getElementById('ipAddressSpan').textContent = existingESP.esp_ip;
        confirmationModal.show();

        document.getElementById('confirmOverride').addEventListener('click', () => {
            processESPItem();
            confirmationModal.hide();
        }, { once: true });

        // Restore the esp-modal and user inputs if the user cancels the action
        document.querySelector('#esp-override-modal .btn-secondary').addEventListener('click', () => {
            espModal.show();
            document.getElementById("esp_name").value = espItem.name;
            document.getElementById("esp_ip").value = espItem.esp_ip;
            document.getElementById("esp_rows").value = espItem.rows;
            document.getElementById("esp_columns").value = espItem.cols;
            document.getElementById("esp_starty").value = espItem.startTop;
            document.getElementById("esp_startx").value = espItem.startLeft;
            document.getElementById("esp_serpentine").value = espItem.serpentineDirection;
            espId = "";
        }, { once: true });
    } else {
        processESPItem();
    }
});

document.getElementById('esp-delete-modal').addEventListener('show.bs.modal', function (event) {
    const button = event.relatedTarget;
    const espName = button.getAttribute('data-bs-esp-name');
    const ipAddress = button.getAttribute('data-bs-esp-ip');
    // Set device name and IP address in the modal
    document.getElementById('deviceNameSpan').innerHTML = `<b>${espName}</b>`;
    document.getElementById('ipAddressSpan').innerHTML = `<b>${ipAddress}</b>`;
    document.getElementById('confirmDelete').dataset.bsEspId = button.getAttribute('data-bs-esp-id');

});
document.getElementById('esp-modal').addEventListener('show.bs.modal', function (event) {
    const button = event.relatedTarget;
    const mode = button.getAttribute('data-bs-mode');
    if (mode === "edit") {
        document.getElementById('esp-modal-label').innerHTML = "Edit ESP";
        document.getElementById('save-esp-button').innerHTML = "<span class=\"icon-n4px\"><i data-lucide=\"save\" class=\"me-2\"></i>Save</span>";
        lucide.createIcons();
        const espName = button.getAttribute('data-bs-esp-name');
        const ipAddress = button.getAttribute('data-bs-esp-ip');
        const espRows = button.getAttribute('data-bs-esp-rows');
        const espColumns = button.getAttribute('data-bs-esp-columns');
        const espStartTop = button.getAttribute('data-bs-esp-start-y');
        const espStartLeft = button.getAttribute('data-bs-esp-start-x');
        const espSerpentineDirection = button.getAttribute('data-bs-esp-serpentinedirection');
        console.log(espSerpentineDirection, espStartTop, espStartLeft);
        // Set device name and IP address in the modal
        document.getElementById('esp_name').value = espName;
        document.getElementById('esp_ip').value = ipAddress;
        document.getElementById('esp_rows').value = espRows;
        document.getElementById('esp_columns').value = espColumns;
        setSelectedIndexByValue('esp_starty', espStartTop, 'data-starty');
        setSelectedIndexByValue('esp_startx', espStartLeft, 'data-startx');
        setSelectedIndexByValue('esp_serpentine', espSerpentineDirection, 'data-serpentine');
        document.getElementById('save-esp-button').dataset.bsEspId = button.getAttribute('data-bs-esp-id');
    }
});

// Function to set selectedIndex based on the attribute value
function setSelectedIndexByValue(selectId, value, attributeName) {
    const selectElement = document.getElementById(selectId);
    for (let i = 0; i < selectElement.options.length; i++) {
        if (selectElement.options[i].getAttribute(attributeName) === value) {
            selectElement.selectedIndex = i;
            break;
        }
    }
}
document.getElementById('esp-modal').addEventListener('shown.bs.modal', function () {
    let inputField = document.getElementById('esp_name');
    inputField.focus();
    inputField.select();
    drawGrid("esp");
});
document.getElementById('confirmDelete').addEventListener('click', function () {
    const espId = document.getElementById('confirmDelete').getAttribute('data-bs-esp-id');
    // Delete item from the database
    fetch(`/api/esp/${espId}`, {
        method: "DELETE"
    }).then(response => {
        if (response.ok) {
            console.log("Item deleted successfully");
            setTimeout(function () {
                populateEspTable();
            }, 500);
            const delete_esp_modal = document.querySelector('#esp-delete-modal');
            const modal = bootstrap.Modal.getInstance(delete_esp_modal);
            modal.hide();
        }
    }).catch(error => console.error(error));
});


document.getElementById('esp_rows').addEventListener('change', function () {
    drawGrid("esp");
});
document.getElementById('esp_columns').addEventListener('change', function () {
    drawGrid("esp");
});
document.getElementById('esp_startx').addEventListener('change', function () {
    drawGrid("esp");
});
document.getElementById('esp_starty').addEventListener('change', function () {
    drawGrid("esp");
});
document.getElementById('esp_serpentine').addEventListener('change', function () {
    drawGrid("esp");
});
document.getElementById('esp-modal').addEventListener('hidden.bs.modal', function () {

    document.getElementById('esp-modal-label').innerHTML = "Add ESP"; // Set the modal label back to its initial state
    document.getElementById('save-esp-button').innerHTML = "<span class=\"icon-n4px\"><i data-lucide=\"save\" class=\"me-2\"></i>Save</span>";
    lucide.createIcons();

    // Clear input fields
    document.getElementById('esp_name').value = "";
    document.getElementById('esp_ip').value = "";
    document.getElementById('esp_rows').value = 4;
    document.getElementById('esp_columns').value = 4;
    document.getElementById('esp_starty').selectedIndex = 1;
    document.getElementById('esp_startx').selectedIndex = 1;
    document.getElementById('esp_serpentine').selectedIndex = 1;

    // Clear any existing data attributes
    document.getElementById('save-esp-button').removeAttribute('data-bs-esp-id');
    document.getElementById('save-esp-button').removeAttribute('data-bs-esp-ip');
    document.getElementById('save-esp-button').removeAttribute('data-bs-esp-name');
    document.getElementById('save-esp-button').removeAttribute('data-bs-esp-rows');
    document.getElementById('save-esp-button').removeAttribute('data-bs-esp-columns');
    document.getElementById('save-esp-button').removeAttribute('data-bs-esp-start-y');
    document.getElementById('save-esp-button').removeAttribute('data-bs-esp-start-x');
    document.getElementById('save-esp-button').removeAttribute('data-bs-esp-serpentinedirection');
});


const espTabs = document.getElementById('espTabs');
let ESPs = [];
let filterESP = [];

// Fetch ESP data from the server and populate the tabs


// Sort items based on the selected ESP filters
function sortItemsByESP(filter, filter2 = "") {

    const itemsContainer = document.getElementById('items-container-grid');
    const items = Array.from(itemsContainer.children);
    filterESP = [];
    if (filter !== "") filterESP.push(filter);
    if (filter2 !== "") filterESP.push(filter2);
    toggleSelectedESP();
    items.forEach(item => {
        const itemESP = item.dataset.ip.toLowerCase();
        const shouldDisplay = filterESP.length === 0 || filterESP.some(searchText => itemESP.includes(searchText.toLowerCase()));
        item.style.display = shouldDisplay ? "flex" : "none";
    });
}



// Create a tab for each ESP
function createESPTab(name, onClickHandler, ip) {
    const listItem = document.createElement('li');
    listItem.classList.add('nav-item');
    const anchor = document.createElement('a');
    anchor.dataset.filter = name;
    anchor.classList.add('nav-link');
    anchor.href = '#';

    if (name === "All Boxes") {
        anchor.innerHTML = 'All Boxes';
        anchor.classList.add('active');
    } else {
        anchor.innerHTML = `${name} <span class="esp_ip" style="color: #888;">(${ip})</span>`;
    }

    anchor.onclick = onClickHandler;
    listItem.appendChild(anchor);

    return listItem;
}

// Populate the ESP tabs with fetched data
function populateESPMenu(espDataArray) {
    espTabs.innerHTML = '';

    if (espDataArray.length > 1) {
        espTabs.parentElement.style.display = 'block'; // Display the tab view container
        espTabs.appendChild(createESPTab("All Boxes", () => sortItemsByESP("")));

        espDataArray.forEach(({ name, esp_ip }) => {
            espTabs.appendChild(createESPTab(name, () => sortItemsByESP(name, esp_ip), esp_ip));
        });
    } else {
        espTabs.parentElement.style.display = 'none'; // Hide the tab view container
    }
}

// Toggle the active class on selected ESP tabs
function toggleSelectedESP() {
    const listItems = Array.from(espTabs.querySelectorAll('.nav-link'));

    listItems.forEach(anchor => {
        const anchorText = anchor.dataset.filter;
        anchor.classList.toggle('active', filterESP.length === 0 ? anchorText === "All Boxes" : filterESP.includes(anchorText));
    });
}







