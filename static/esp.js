// Function to populate the ESP table with data fetched from the server
function populateEspTable() {
    const espTable = document.getElementById("esp_table");
    // Display loading state
    espTable.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';
    // Fetch and populate the ESP data into the table
    fetch("/api/esp").then((response) => response.json()).then((data) => {
        const tableBody = document.createElement("tbody");
        data.forEach((esp) => {
            const row = document.createElement("tr");
            const cellName = document.createElement("td");
            cellName.textContent = esp.name;
            cellName.classList.add("ps-2");
            const cellIp = document.createElement("td");
            cellIp.textContent = esp.esp_ip;
            const cellActions = document.createElement("td");
            cellActions.classList.add("text-end");
            // Creating buttons with esp id as data attribute
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
    }).catch((error) => {
        console.error(error);
        // Display an error message or handle the error accordingly
        espTable.innerHTML = '<tr><td colspan="3">Failed to fetch data.</td></tr>';
    });
}

document.getElementById("save-esp-button").addEventListener('click', () => {
    const espId = document.getElementById('save-esp-button').getAttribute('data-bs-esp-id');
    const name = document.getElementById("esp_name").value;
    const esp_ip = document.getElementById("esp_ip").value;
    const rows = document.getElementById("esp_rows").value;
    const cols = document.getElementById("esp_columns").value;
    const startTop = document.getElementById("esp_starty").value;
    const startLeft = document.getElementById("esp_startx").value;
    const serpentineDirection = document.getElementById("esp_serpentine").value;
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
        // TODO Check for existing names and IP addresses when saving the edit of an existing ESP entry
        fetch(espId !== null && espId !== '' ? `/api/esp/${espId}` : '/api/esp', {
            method: espId !== null && espId !== '' ? "PUT" : "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(espItem),
        }).then((response) => response.json()).then((data) => {
            setTimeout(() => {
                populateEspTable();
            }, 500);
            const new_esp_modal = document.querySelector('#esp-modal');
            const modal = bootstrap.Modal.getInstance(new_esp_modal);
            modal.hide();
        }).catch((error) => console.error(error));
    };
    if (espId !== null && espId !== '') {
        processESPItem();
    } else {
        fetch("/api/esp").then((response) => response.json()).then((data) => {
            const existingNames = data.map(esp => esp.name);
            const existingIPs = data.map(esp => esp.esp_ip);
            if (existingNames.includes(name) || existingIPs.includes(esp_ip)) {
                showAlert('esp-error-alert', (existingNames.includes(name) ? `- Name "${name}" already exists.<br>` : '') + (existingIPs.includes(esp_ip) ? `- IP Address "${esp_ip}" already exists.` : ''));
                return;
            }
            processESPItem();
        }).catch((error) => console.error(error));
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
        // Set device name and IP address in the modal
        document.getElementById('esp_name').value = espName;
        document.getElementById('esp_ip').value = ipAddress;
        document.getElementById('esp_rows').value = espRows;
        document.getElementById('esp_columns').value = espColumns;
        document.getElementById('esp_starty').value = espStartTop;
        document.getElementById('esp_startx').value = espStartLeft;
        document.getElementById('esp_serpentine').value = espSerpentineDirection;
        document.getElementById('save-esp-button').dataset.bsEspId = button.getAttribute('data-bs-esp-id');
    }
});
document.getElementById('esp-modal').addEventListener('shown.bs.modal', function (event) {
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
    document.getElementById('esp_starty').value = "Top";
    document.getElementById('esp_startx').value = "Left";
    document.getElementById('esp_serpentine').value = "Horizontal";

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