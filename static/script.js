const selectEspDropdown = document.getElementById("item_esp_select");
let fetchedItems = []; // Define an array to store fetched items
let isEditingItem = false;
let editingItemId = null; // Track the ID of the item being edited
const item_modal = document.getElementById("item-modal");
async function uploadImage() {
    const formData = new FormData();
    const fileInput = document.getElementById("item_image_upload");

    // Append the file input to the formData
    formData.append('file', fileInput.files[0]);

    // returns undefined if no file is selected
    if (!fileInput.files[0]) {
        console.log('no file uploaded');
        return null;
    }

    try {
        const response = await fetch('/upload', { body: formData, method: 'POST' });
        const imageURL = await response.text();
        console.log(`uploaded file to ${imageURL}`);
        return new URL(window.location.href + imageURL);
    } catch (error) {
        console.error('Error uploading file:', error);
        return null;
    }
}

// Add item to list
async function addItem(event) {
    event.preventDefault();

    if(document.getElementById("item_image").value !== localStorage.getItem('edit_image_path')) { //check whether image has changed and only then load image
        let localImage = await uploadImage();
        if (!!localImage) {
            // set image path to newly uploaded file
            document.getElementById("item_image").value = localImage
        }
    }
    submitLights();

    const name = document.getElementById("item_name").value;
    const link = document.getElementById("item_url").value || "";
    const image = document.getElementById("item_image").value;
    let position = localStorage.getItem('led_positions');
    const quantity = document.getElementById("item_quantity").value;
    const selectedEspDropdown = document.getElementById("item_esp_select"); // Get the selected ESP dropdown
    const tags = localStorage.getItem('item_tags');
    const selectedEspValue = selectedEspDropdown.value;
    if (selectedEspValue === "select") {
        // Check if the user has not selected anything
        alert("Please select an ESP.");
        return;
    }
    if (position === "[]") {
        // Check if the user has not selected anything
        if(!isEditingItem){alert("Please select an LEDS to light up.");
            return;}
        else{
            position = localStorage.getItem('edit_led_positions');
            position = JSON.parse(position); // Convert the string to an array
        }
    }
    // Fetch the IP associated with the selected ESP
    fetch(`/api/esp/${selectedEspValue}`)
        .then((response) => response.json())
        .then((espData) => {
            const ip = espData.name;
            const item = {
                name,
                link,
                image,
                position,
                quantity,
                ip,
                tags,
            };
            console.log('item', item);
            if (isEditingItem) {
                // We are editing, so send a PUT request to update the existing item
                fetch(`/api/items/${editingItemId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(item),
                })
                    .then((response) => response.json())
                    .then((data) => {
                        item.id = data.id;
                        const col =  document.getElementById('items-container-grid').querySelector(`li[data-id="${editingItemId}"]`);
                        const updatedCol = createItem(item);
                        document.getElementById('items-container-grid').replaceChild(updatedCol, col);
                        isEditingItem = false; // Reset the editing flag
                        document.getElementById("btn-add").innerHTML = "Add item"; // Change the button text back to "Add item"
                    })
                    .catch((error) => console.error(error));
            } else {
                // Add the item with the correct IP
                fetch("/api/items", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(item),
                })
                    .then((response) => response.json())
                    .then((data) => {
                        const col = createItem(data);
                        isEditingItem = false;
                        document.getElementById('items-container-grid').appendChild(col);
                        removeLocalStorage();
                    })
                    .catch((error) => console.error(error));
            }
        })
        .catch((error) => console.error(error));
    // Clear the stored data in the 'led_positions' key
    removeLocalStorage();
    resetModal();

}
function removeLocalStorage(){
    localStorage.removeItem('led_positions');
    localStorage.removeItem('edit_led_positions');
    localStorage.removeItem('item_tags');
    localStorage.removeItem('edit_image_path');


}
function populateEspDropdown() {

    selectEspDropdown.innerHTML = "";
    // Fetch ESP devices
    fetch("/api/esp").then((response) => response.json()).then((data) => {
        if (data.length > 0) {
            // Devices found: Populate dropdown and select the first one
            data.forEach((esp, index) => {
                const option = document.createElement("option");
                option.value = esp.id;
                option.dataset.espRows = esp.rows;
                option.dataset.espColumns = esp.cols;
                option.dataset.espStartY = esp.start_top;
                option.dataset.espStartX = esp.start_left;
                option.dataset.espSerpentine = esp.serpentine_direction;
                option.dataset.espIp = esp.esp_ip;
                option.textContent = esp.name + " (" + esp.esp_ip + ")";
                selectEspDropdown.appendChild(option);
                if (index === 0) {
                    selectEspDropdown.selectedIndex = index;
                }
            });
        } else {
            // No devices found: Disable dropdown and display message
            selectEspDropdown.disabled = true;
            const messageOption = document.createElement("option");
            messageOption.textContent = "Please add an ESP device first...";
            messageOption.disabled = true;
            selectEspDropdown.appendChild(messageOption);
        }
        console.log("Dropdown populated:", data); // Logging the output to console
        let rows = document.getElementById('item_esp_select').options[0].getAttribute("data-esp-rows");
        let columns = document.getElementById('item_esp_select').options[0].getAttribute("data-esp-columns");
        let startX = document.getElementById('item_esp_select').options[0].getAttribute("data-esp-start-x");
        let startY = document.getElementById('item_esp_select').options[0].getAttribute("data-esp-start-y");
        let serpentineDirection = document.getElementById('item_esp_select').options[0].getAttribute("data-esp-serpentine");
        drawGrid("item", rows, columns, startX, startY, serpentineDirection);
    }).catch((error) => console.error(error));
}

document.getElementById('item-modal').addEventListener('shown.bs.modal', function (event) {
    console.log("Add item modal: 'shown'")
    let inputField = document.getElementById('item_name');
    inputField.focus();
    inputField.select();
    populateEspDropdown();
});
document.getElementById('item_esp_select').addEventListener('change', function () {
    let selectEspDropdown = document.getElementById('item_esp_select');
    let rows = selectEspDropdown.options[selectEspDropdown.selectedIndex].getAttribute("data-esp-rows");
    let columns = selectEspDropdown.options[selectEspDropdown.selectedIndex].getAttribute("data-esp-columns");
    let startX = selectEspDropdown.options[selectEspDropdown.selectedIndex].getAttribute("data-esp-start-x");
    let startY = selectEspDropdown.options[selectEspDropdown.selectedIndex].getAttribute("data-esp-start-y");
    let serpentineDirection = selectEspDropdown.options[selectEspDropdown.selectedIndex].getAttribute("data-esp-serpentine");
    clearAll();
    drawGrid("item", rows, columns, startX, startY, serpentineDirection);
});

document.getElementById("save-item-button").addEventListener("click", addItem);
function loadItems() {
    fetch("/api/items")
        .then((response) => response.json())
        .then((data) => {
            // Store fetched items in the array
            fetchedItems = data;
            //generateItemsList();
            generateItemsGrid();
        })
        .catch((error) => console.error(error));

}

function createItem(item) {
    const col = document.createElement('div');
    col.classList.add('col-6', 'col-sm-4', 'col-md-3', 'col-lg-2', 'mb-3');
    col.dataset.id = item.id;
    col.dataset.name = item.name;
    col.dataset.quantity = parseInt(item.quantity, 10);  // Store as numbers
    col.dataset.ip = item.ip;
    col.dataset.tags = item.tags;
    col.innerHTML = `
        <div class="card overflow-hidden position-relative">
            <div class="overflow-hidden">
                <img src="${item.image}" class="card-img-top"  alt="${item.name}"> <!-- Inline style added -->
                <div class="position-absolute top-0 end-0 show-on-hover d-none"></div>
            </div>

            <div class="card-body p-2">
                <a href="${item.link}" target="_blank" class="card-title-link">
                    <h5 class="card-title" data-bs-toggle="tooltip" title="Shop for more">${item.name}</h5>
                </a>
                <div class="d-flex justify-content-center align-items-center mb-2">
                    <button class="btn btn-outline-info me-auto locate-btn" data-bs-toggle="tooltip" title="Locate" data-item-id="${item.id}">
                        <span class="icon-n4px"><i data-lucide="lightbulb"></i></span>
                    </button>
                    <button class="btn btn-outline-primary edit-btn" data-bs-toggle="tooltip" title="Edit">
                        <span class="icon-n4px"><i data-lucide="file-edit"></i></span>
                    </button>
                    <button class="btn btn-outline-danger ms-auto delete-btn" data-bs-toggle="tooltip" title="Delete" data-item-id="${item.id}">
                        <span class="icon-n4px"><i data-lucide="trash"></i></span>
                    </button>
                </div>
                <div class="d-flex justify-content-center align-items-center">
                    <button class="btn btn-outline-danger me-auto minus-btn" data-bs-toggle="tooltip" title="-1 from stock" data-item-id="${item.id}">
                        <span class="icon-n4px"><i data-lucide="minus"></i></span>
                    </button>
                    <span id="quantity-${item.id}">${item.quantity}</span>
                    <button class="btn btn-outline-success ms-auto plus-btn" data-bs-toggle="tooltip" title="+1 to stock" data-item-id="${item.id}">
                        <span class="icon-n4px"><i data-lucide="plus"></i></span>
                    </button>
                </div>
            </div>
        </div>`;
    col.querySelector('.minus-btn').addEventListener('click', () => {
        handleQuantityChange(item, -1); // Decrease quantity by 1
    });

    col.querySelector('.plus-btn').addEventListener('click', () => {
        handleQuantityChange(item, 1); // Increase quantity by 1
    });
    col.querySelector('.card-img-top').addEventListener('click', () => {
        fetch(`/api/items/${item.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ action: "locate" }),
        }).catch((error) => console.error(error));
    });
    col.querySelector('.locate-btn').addEventListener('click', () => {
        fetch(`/api/items/${item.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ action: "locate" }),
        }).catch((error) => console.error(error));
    });
    col.querySelector('.edit-btn').addEventListener('click', () => {
        isEditingItem = true;
        removeLocalStorage();
        document.getElementById("item_name").value = item.name;
        document.getElementById("item_url").value = item.link;
        document.getElementById("item_image").value = item.image;
        document.getElementById("item_quantity").value = item.quantity;
       localStorage.setItem('led_positions', JSON.stringify(item.position))
        let positions = JSON.parse(localStorage.getItem('led_positions'))
        positions = positions.replace('[', '').replace(']', '');
        positions = positions.split(',').map(Number).filter(num => !isNaN(num));
        clickedCells = positions;
        localStorage.setItem('edit_led_positions', JSON.stringify(item.position))
        localStorage.setItem('edit_image_path', JSON.stringify(item.image))
        if(item.tags){
            const cleanedTags = item.tags.replace(/[\[\]'"`\\]/g, '');
            const itemTagsArray = cleanedTags.split(',');
            localStorage.setItem('item_tags', JSON.stringify(itemTagsArray))
            tags = itemTagsArray;
            loadTagsIntoTagify()

        }
        const selectedValue = item.ip; // The IP to select
        selectEspDropdown.selectedIndex = findIndexByIP(selectedValue);
        editingItemId = item.id;
        $("#item-modal").modal("show");
    });

    return col;
}
function handleQuantityChange(item, changeValue) {
    const itemId = item.id;
    const quantityElement = document.getElementById(`quantity-${itemId}`);
    if (quantityElement) {
        let currentQuantity = parseInt(quantityElement.textContent, 10);
        if (!isNaN(currentQuantity)) {
            currentQuantity += changeValue; // Increment or decrement quantity
            if (currentQuantity < 0) {
                currentQuantity = 0; // Ensure quantity doesn't go below 0
            }
            quantityElement.textContent = currentQuantity.toString(); // Update the displayed quantity

            // Create the updated item object
            const updatedItem = {...item, quantity: currentQuantity };

            // Make a fetch request to update the quantity in the database
            fetch(`/api/items/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedItem),
            })
                .then()
                .catch(error => {
                    console.error('Error updating quantity:', error);
                });
        }
    }
}

function generateItemsGrid() {
    const itemsContainer = document.getElementById('items-container-grid');
    // Clear previous content in the container if needed
    itemsContainer.innerHTML = '';
    fetchedItems.forEach((item) => {
        const col = createItem(item)
        itemsContainer.appendChild(col);
    });

    initialiseTooltips();
}
function findIndexByIP(ip) {
    const options = selectEspDropdown.options;
    for (let i = 0; i < options.length; i++) {
        const optionValue = options[i].textContent.trim(); // Trim whitespace from option value
        if (optionValue.toLowerCase() === ip.trim().toLowerCase()) { // Case-insensitive comparison
            return i; // Return the index when the IP matches the selected option value.
        }
    }
    return 0; // Return 0 if no match is found.
}

function generateItemsList() {
    const itemsContainer = document.getElementById('items-container-list');

    // Clear previous content in the container if needed
    itemsContainer.innerHTML = '';

    // Create table element
    const table = document.createElement('table');
    table.classList.add('table', 'table-striped');

    // Create table header
    const tableHeader = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headerName = document.createElement('th');
    headerName.textContent = 'Name';
    const headerLink = document.createElement('th');
    headerLink.textContent = 'Link';
    headerRow.appendChild(headerName);
    headerRow.appendChild(headerLink);
    tableHeader.appendChild(headerRow);
    table.appendChild(tableHeader);

    // Create table body
    const tableBody = document.createElement('tbody');
    fetchedItems.forEach((item) => {
        const row = document.createElement('tr');

        // Create table cells for item properties
        const nameCell = document.createElement('td');
        nameCell.textContent = item.name;

        const linkCell = document.createElement('td');
        const link = document.createElement('a');
        link.href = item.link;
        link.textContent = 'View Item';
        linkCell.appendChild(link);

        // Append cells to the row
        row.appendChild(nameCell);
        row.appendChild(linkCell);

        // Append the row to the table body
        tableBody.appendChild(row);
    });

    // Append table body to the table
    table.appendChild(tableBody);

    // Append table to the container
    itemsContainer.appendChild(table);
}

function initialiseTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

function resetModal() {
    document.getElementById("item_name").value = "";
    document.getElementById("item_url").value = "";
    document.getElementById("item_image").value = "";
    document.getElementById("item_quantity").value = "";
    document.getElementById("item_image_upload").value = "";
    document.getElementById("item_tags").value = "";
    removeLocalStorage();
    clearAll();
    const new_item_modal = document.querySelector('#item-modal');
    const modal = bootstrap.Modal.getInstance(new_item_modal);
    modal.hide();

}

function sortItems(sortMethod) {
    const itemsContainer = document.getElementById('items-container-grid');
    // Get the list of items
    const items = Array.from(itemsContainer.children);
    // Sort the items based on the selected sorting method
    const sortedItems = items.sort((a, b) => {
        const itemA = a.dataset[sortMethod];
        const itemB = b.dataset[sortMethod];
        if (sortMethod === 'quantity') {
            // Convert values to numbers for numeric comparison
            return parseInt(itemA, 10) - parseInt(itemB, 10);
        } else {
            // For other fields, use string comparison
            return itemA.localeCompare(itemB);
        }
    });

    // Clear the current list
    itemsContainer.innerHTML = '';

    // Append the sorted items to the list
    sortedItems.forEach(item => {
        itemsContainer.appendChild(item);
    });
}
document.getElementById("search").addEventListener("input", function (e){
    const itemsContainer = document.getElementById('items-container-grid');
    const searchText = e.target.value.toLowerCase();
    const items = Array.from(itemsContainer.children);

    Array.from(items).forEach((item) => {
        const itemName = item.dataset["name"];
        if (itemName.toLowerCase().indexOf(searchText) !== -1) {
            item.style.display = "flex";
        } else {
            item.style.display = "none";
        }
    });
});

loadItems();