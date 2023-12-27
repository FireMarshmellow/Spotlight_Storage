const selectEspDropdown = document.getElementById("select_esp");
const delEspButton = document.getElementById("delete-esp");

// Flag to track whether we are editing an existing ESP or adding a new one
let isEditing = false;
let editingEspId = null; // Track the ID of the ESP being edited


function addEsp(event) {
    const name = document.getElementById("add_esp_name").value;
    const esp_ip = document.getElementById("add_esp_ip").value;
    const rows = document.getElementById("add_esp_rows").value;
    const cols = document.getElementById("add_esp_columns").value;
    const startTop = document.getElementById("add_esp_starttop").value;
    const startLeft = document.getElementById("add_esp_startleft").value;
    const serpentineDirection = document.getElementById("add_esp_serpentine").value;

    const espItem = {
        name,
        esp_ip,
        rows,
        cols,
        startTop,
        startLeft,
        serpentineDirection,
    };
    // Check if we are editing an existing ESP or adding a new one
    if (isEditing) {
        // We are editing, so send a PUT request to update the existing ESP
        fetch(`/api/esp/${editingEspId}`, {
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(espItem),
        })
            .then((response) => response.json())
            .then((data) => {

                isEditing = false; // Reset the editing flag
            })
            .catch((error) => console.error(error));
    } else {
        // We are adding a new ESP, so send a POST request
        fetch("/api/esp", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(espItem),
        })
            .then((response) => response.json())
            .then((data) => {
                console.log("ESP item added:", data);
            })
            .catch((error) => console.error(error));
    }
    setTimeout(function () {
        populateEspTable();
    }, 500);

}

function populateEspTable() {
    const espTable = document.getElementById("esp_table");

    // Display loading state
    espTable.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';

    // Fetch and populate the ESP data into the table
    fetch("/api/esp")
        .then((response) => response.json())
        .then((data) => {
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
                editButton.dataset.bsTarget = "#edit-esp-modal";
                editButton.dataset.bsEspId = esp.id;
                editButton.dataset.bsEspIp = esp.esp_ip;
                editButton.dataset.bsEspName = esp.name;
                editButton.dataset.bsEspRows = esp.rows;
                editButton.dataset.bsEspColumns = esp.cols;
                editButton.dataset.bsEspStarttop = esp.start_top;
                editButton.dataset.bsEspStartleft = esp.start_left;
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
        })
        .catch((error) => {
            console.error(error);
            // Display an error message or handle the error accordingly
            espTable.innerHTML = '<tr><td colspan="3">Failed to fetch data.</td></tr>';
        });
}

document.getElementById("add-esp-button").addEventListener('click', () => {
    const name = document.getElementById("add_esp_name").value;
    const esp_ip = document.getElementById("add_esp_ip").value;
    const rows = document.getElementById("add_esp_rows").value;
    const cols = document.getElementById("add_esp_columns").value;
    const startTop = document.getElementById("add_esp_starttop").value;
    const startLeft = document.getElementById("add_esp_startleft").value;
    const serpentineDirection = document.getElementById("add_esp_serpentine").value;

    // Check for empty fields
    const emptyFields = [];
    if (name.trim() === '') {
        emptyFields.push('Name');
    }
    if (esp_ip.trim() === '') {
        emptyFields.push('IP Address');
    }

    // Function to validate IP address
    const isValidIPAddress = (ip) => {
        const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
        return ipRegex.test(ip) && ip.split('.').every(octet => parseInt(octet, 10) <= 255);
    };

    if (emptyFields.length > 0) {
        const alert = document.getElementById('add-esp-error-alert');
        alert.classList.remove('d-none');
        const errorList = document.getElementById('error-list');
        errorList.innerHTML = "The following fields are empty:<br>";

        const emptyFieldsList = document.createElement('ul');
        emptyFieldsList.classList.add('mb-0');
        emptyFields.forEach(field => {
            const listItem = document.createElement('li');
            listItem.textContent = field;
            emptyFieldsList.appendChild(listItem);
        });

        errorList.appendChild(emptyFieldsList);

        return; // Stop execution if fields are empty
    }

    if (!isValidIPAddress(esp_ip)) {
        const alert = document.getElementById('add-esp-error-alert');
        alert.classList.remove('d-none');
        const errorList = document.getElementById('error-list');
        errorList.innerHTML = "IP Address is not valid.";

        return; // Stop execution if IP address is invalid
    }

    // Fetch existing data to check for duplicates
    fetch("/api/esp")
        .then((response) => response.json())
        .then((data) => {
            const existingNames = data.map(esp => esp.name);
            const existingIPs = data.map(esp => esp.esp_ip);

            if (existingNames.includes(name) || existingIPs.includes(esp_ip)) {
                const alert = document.getElementById('add-esp-error-alert');
                alert.classList.remove('d-none');
                const errorList = document.getElementById('error-list');
                errorList.innerHTML = "";

                if (existingNames.includes(name)) {
                    errorList.innerHTML += `- Name "${name}" already exists.<br>`;
                }

                if (existingIPs.includes(esp_ip)) {
                    errorList.innerHTML += `- IP Address "${esp_ip}" already exists.`;
                }

                return; // Stop execution if name or IP exists
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

            fetch("/api/esp", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(espItem),
            })
                .then((response) => response.json())
                .then((data) => {
                    console.log("ESP item added:", data);
                    // If successful, repopulate the table
                    setTimeout(function () {
                        populateEspTable();
                    }, 500);
                    const new_esp_modal = document.querySelector('#add-esp-modal');
                    const modal = bootstrap.Modal.getInstance(new_esp_modal);
                    modal.hide();

                })
                .catch((error) => console.error(error));
        })
        .catch((error) => console.error(error));
});

document.getElementById("edit-esp-button").addEventListener('click', () => {
    const espId = document.getElementById('edit-esp-button').getAttribute('data-bs-esp-id');
    const name = document.getElementById("edit_esp_name").value;
    const esp_ip = document.getElementById("edit_esp_ip").value;
    const rows = document.getElementById("edit_esp_rows").value;
    const cols = document.getElementById("edit_esp_columns").value;
    const startTop = document.getElementById("edit_esp_starttop").value;
    const startLeft = document.getElementById("edit_esp_startleft").value;
    const serpentineDirection = document.getElementById("edit_esp_serpentine").value;

    // Check for empty fields
    const emptyFields = [];
    if (name.trim() === '') {
        emptyFields.push('Name');
    }
    if (esp_ip.trim() === '') {
        emptyFields.push('IP Address');
    }

    // Function to validate IP address
    const isValidIPAddress = (ip) => {
        const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
        return ipRegex.test(ip) && ip.split('.').every(octet => parseInt(octet, 10) <= 255);
    };

    if (emptyFields.length > 0) {
        const alert = document.getElementById('edit-esp-error-alert');
        alert.classList.remove('d-none');
        const errorList = document.getElementById('error-list');
        errorList.innerHTML = "The following fields are empty:<br>";

        const emptyFieldsList = document.createElement('ul');
        emptyFieldsList.classList.add('mb-0');
        emptyFields.forEach(field => {
            const listItem = document.createElement('li');
            listItem.textContent = field;
            emptyFieldsList.appendChild(listItem);
        });

        errorList.appendChild(emptyFieldsList);

        return; // Stop execution if fields are empty
    }

    if (!isValidIPAddress(esp_ip)) {
        const alert = document.getElementById('edit-esp-error-alert');
        alert.classList.remove('d-none');
        const errorList = document.getElementById('error-list');
        errorList.innerHTML = "IP Address is not valid.";

        return; // Stop execution if IP address is invalid
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

            fetch(`/api/esp/${espId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(espItem),
            })
                .then((response) => response.json())
                .then((data) => {
                    setTimeout(function () {
                        populateEspTable();
                    }, 500);
                    const new_esp_modal = document.querySelector('#edit-esp-modal');
                    const modal = bootstrap.Modal.getInstance(new_esp_modal);
                    modal.hide();
                })
                .catch((error) => console.error(error));


});


document.getElementById('esp-delete-modal').addEventListener('show.bs.modal', function (event) {
    const button = event.relatedTarget;
    const espName = button.getAttribute('data-bs-esp-name');
    const ipAddress = button.getAttribute('data-bs-esp-ip');

    // Set device name and IP address in the modal
    document.getElementById('deviceNameSpan').innerHTML = `<b>${espName}</b>`;
    document.getElementById('ipAddressSpan').innerHTML = `<b>${ipAddress}</b>`;
    document.getElementById('confirmDelete').dataset.bsEspId = button.getAttribute('data-bs-esp-id');
    ;
});

document.getElementById('edit-esp-modal').addEventListener('show.bs.modal', function (event) {
    const button = event.relatedTarget;
    const espName = button.getAttribute('data-bs-esp-name');
    const ipAddress = button.getAttribute('data-bs-esp-ip');
    const espRows = button.getAttribute('data-bs-esp-rows');
    const espColumns = button.getAttribute('data-bs-esp-columns');
    const espStartTop = button.getAttribute('data-bs-esp-starttop');
    const espStartLeft = button.getAttribute('data-bs-esp-startleft');
    const espSerpentineDirection = button.getAttribute('data-bs-esp-serpentinedirection');


    // Set device name and IP address in the modal
    document.getElementById('edit_esp_name').value = espName;
    document.getElementById('edit_esp_ip').value = ipAddress;
    document.getElementById('edit_esp_rows').value = espRows;
    document.getElementById('edit_esp_columns').value = espColumns;
    document.getElementById('edit_esp_starttop').value = espStartTop;
    document.getElementById('edit_esp_startleft').value = espStartLeft;
    document.getElementById('edit_esp_serpentine').value = espSerpentineDirection;


    document.getElementById('edit-esp-button').dataset.bsEspId = button.getAttribute('data-bs-esp-id');
    ;
});

document.getElementById('add-esp-modal').addEventListener('shown.bs.modal', function (event) {
    let inputField = document.getElementById('add_esp_name');
    inputField.focus();
    inputField.select();
});

document.getElementById('confirmDelete').addEventListener('click', function () {
    const espId = document.getElementById('confirmDelete').getAttribute('data-bs-esp-id');

    // Delete item from the database
    fetch(`/api/esp/${espId}`, {method: "DELETE"})
        .then(response => {
            if (response.ok) {
                console.log("Item deleted successfully");
                setTimeout(function () {
                    populateEspTable();
                }, 500);
                const delete_esp_modal = document.querySelector('#esp-delete-modal');
                const modal = bootstrap.Modal.getInstance(delete_esp_modal);
                modal.hide();
            }
        })
        .catch(error => console.error(error));
});