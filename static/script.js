const selectEspDropdown = document.getElementById("item_esp_select");
let fetchedItems = []; // Define an array to store fetched items
let isEditingItem = false;
let isCopyingItem = false;
let editingItemId = null; // Track the ID of the item being edited
let editingItemIP = null; // Track the ID of the item being edited
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
        return new URL(window.location.href + imageURL);
    } catch (error) {
        console.error('Error uploading file:', error);
        return null;
    }
}
// Function to check if an image exists on the server
async function doesImageExist(imageURL) {
    try {
        const response = await fetch(`/images/${imageURL}`);
        return response.ok;
    } catch (error) {
        console.error('Error checking image existence:', error);
        return false;
    }
}

// Function to download an image from a URL
async function downloadImage(url) {
    const urlParts = url.split('/');
    const imageURL = urlParts[urlParts.length - 1];
    console.log(imageURL)
    // Check if the image already exists on the server
    if (await doesImageExist(imageURL)) {
        console.log('Image already exists on the server.');
        return `/images/${imageURL}`;
    }

    try {
        const response = await fetch(url);
        const blob = await response.blob();

        // Check if the file extension is valid
        const validExtensions = ['.jpeg', '.jpg', '.png'];
        const hasValidExtension = validExtensions.some(extension => imageURL.endsWith(extension));
        if (!hasValidExtension) {
            // Append ".jpg" if the file extension is missing or invalid
            return new File([blob], imageURL + '.jpg', { type: 'image/jpeg' });
        }

        return new File([blob], imageURL, { type: 'image/jpeg' });
    } catch (error) {
        console.error('Error downloading image:', error);
        return null;
    }
}




// Async function to handle the addition or editing of an item
async function addItem(event) {
    event.preventDefault();
    const imageUrl = document.getElementById("item_image").value.trim();
    const imageFileInput = document.getElementById("item_image_upload");
    let editImageURL = ""
    if(isEditingItem) {
         editImageURL = localStorage.getItem('edit_image_path').replace(/"/g, '').trim();
    }
    if (imageFileInput.files.length === 0 && imageUrl !== editImageURL) {
        const downloadedImage = await downloadImage(imageUrl);
        console.log('Downloading image', downloadedImage);
        if (downloadedImage) {
            const formData = new FormData();
            formData.append('file', downloadedImage);

            try {
                const response = await fetch('/upload', { body: formData, method: 'POST' });
                const imageURL = await response.text();
                document.getElementById("item_image").value = new URL(window.location.href + imageURL);
            } catch (error) {
                console.error('Error uploading file:', error);
            }
        } else {
            console.log('Failed to download image from the provided URL.');
        }
    } else if (imageFileInput.files.length > 0) {
        // Upload the new image and update the local storage
        const localImage = await uploadImage();

        if (localImage) {
            document.getElementById("item_image").value = localImage;
        }
    }


    // Submit lights and tags information
    submitLights();
    SubmitTags();

    // Gather item information from the form
    const name = document.getElementById("item_name").value;
    const link = document.getElementById("item_url").value || "";
    const image = document.getElementById("item_image").value;
    let position = localStorage.getItem('led_positions');
    const quantity = document.getElementById("item_quantity").value;
    const tags = localStorage.getItem('item_tags');
    const selectedEspOption = selectEspDropdown.options[selectEspDropdown.selectedIndex];

    // If LED positions are not selected, prompt the user
    if (position === "[]") {
        if (!isEditingItem) {
            alert("Please select an LED to light up.");
            return;
        } else {
            // If editing, retrieve the previous LED positions
            position = localStorage.getItem('edit_led_positions');
            position = JSON.parse(position);
        }
    }

    // Retrieve the IP address of the selected ESP device
    const ip = selectedEspOption.dataset.espIp;

    // Create the item object with gathered information
    const item = {
        name,
        link,
        image,
        position,
        quantity,
        ip,
        tags,
    };

    // Check if editing an existing item or adding a new one
    if (isEditingItem) {
        // Update existing item via PUT request
        fetch(`/api/items/${editingItemId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
        })
            .then((response) => response.json())
            .then((data) => {
                // Update the displayed item in the UI
                item.id = data.id;
                const col = document.getElementById('items-container-grid').querySelector(`div[data-id="${editingItemId}"]`);
                const updatedCol = createItem(item);
                document.getElementById('items-container-grid').replaceChild(updatedCol, col);
                lucide.createIcons();
                fetchDataAndLoadTags();
            })
            .catch((error) => console.error(error));
    } else {
        // Add a new item via POST request
        fetch("/api/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
        })
            .then((response) => response.json())
            .then((data) => {
                // Create and append the new item to the UI
                const col = createItem(data);
                document.getElementById('items-container-grid').appendChild(col);
                lucide.createIcons();
                fetchDataAndLoadTags();
            })
            .catch((error) => console.error(error));
    }

    // Reset editing flag, remove local storage, and reset the modal
    isEditingItem = false;
    isCopyingItem = false;
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
    let index = 0;
    selectEspDropdown.innerHTML = "";
    // Fetch ESP devices
    fetch("/api/esp").then((response) => response.json()).then((data) => {
        if (data.length > 0) {
            // Devices found: Populate dropdown and select the first one
            data.forEach((esp) => {
                const option = document.createElement("option");
                option.value = esp.id;
                option.dataset.espRows = esp.rows;
                option.dataset.espColumns = esp.cols;
                option.dataset.espStartY = esp.start_top;
                option.dataset.espStartX = esp.start_left;
                option.dataset.espSerpentine = esp.serpentine_direction;
                option.dataset.espIp = esp.esp_ip;
                option.dataset.espName = esp.name;
                option.textContent = esp.name + " (" + esp.esp_ip + ")";
                selectEspDropdown.appendChild(option);

            });

            if (isEditingItem) {
                index = findIndexByIP(editingItemIP);
            }
            selectEspDropdown.selectedIndex = index;

        } else {
            // No devices found: Disable dropdown and display message
            selectEspDropdown.disabled = true;
            const messageOption = document.createElement("option");
            messageOption.textContent = "Please add an ESP device first...";
            messageOption.disabled = true;
            selectEspDropdown.appendChild(messageOption);
        }
        let rows = document.getElementById('item_esp_select').options[index].getAttribute("data-esp-rows");
        let columns = document.getElementById('item_esp_select').options[index].getAttribute("data-esp-columns");
        let startX = document.getElementById('item_esp_select').options[index].getAttribute("data-esp-start-x");
        let startY = document.getElementById('item_esp_select').options[index].getAttribute("data-esp-start-y");
        let serpentineDirection = document.getElementById('item_esp_select').options[index].getAttribute("data-esp-serpentine");
        drawGrid("item", rows, columns, startX, startY, serpentineDirection);
    }).catch((error) => console.error(error));
}

document.getElementById('item-modal').addEventListener('shown.bs.modal', function () {
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

// Function to create an HTML element representing an item
function createItem(item) {
    // Create a new column element with Bootstrap classes
    const col = document.createElement('div');
    col.classList.add('col-6', 'col-sm-4', 'col-md-3', 'col-lg-2', 'mb-3');

    // Set dataset attributes to store item information
    col.dataset.id = item.id;
    col.dataset.name = item.name;
    col.dataset.quantity = parseInt(item.quantity, 10);  // Store as numbers
    col.dataset.ip = item.ip;
    item.position = item.position.replace('[', '').replace(']', '');
    item.position = item.position.split(',').map(Number).filter(num => !isNaN(num));
    col.dataset.position = item.position;
    col.dataset.tags = item.tags;
    // Set inner HTML for the created column
    col.innerHTML = `
        <div class="card overflow-hidden position-relative">
            <!-- Image container with tooltip -->
            <div class="overflow-hidden">
                <img src="${item.image}" class="card-img-top" style="height: 15rem" alt="${item.name}"> 
                <div class="position-absolute top-0 end-0 show-on-hover d-none"></div>
            </div>

            <!-- Card body with item details and buttons -->
            <div class="card-body p-2 >
                <!-- Link to the item -->
                <a href="${item.link}" target="_blank" class="card-title-link">
                    <h5 class="card-title" data-bs-toggle="tooltip" title="Shop for more">${item.name}</h5>
                </a>

                <!-- Buttons for locating, editing, and deleting the item -->
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <button class="btn btn-outline-info locate-btn" data-bs-toggle="tooltip" title="Locate" data-item-id="${item.id}">
                        <span class="icon-n4px"><i data-lucide="lightbulb"></i></span>
                    </button>
                    <button class="btn btn-outline-primary edit-btn" data-bs-toggle="tooltip" title="Edit">
                        <span class="icon-n4px"><i data-lucide="file-edit"></i></span>
                    </button>
                    <button class="btn btn-outline-secondary copy-btn" data-bs-toggle="tooltip" title="Copy Item">
                        <span class="icon-n4px"><i data-lucide="copy"></i></span>
                    </button>
                    <button class="btn btn-outline-danger delete-btn" data-bs-toggle="tooltip" title="Delete" data-item-id="${item.id}">
                        <span class="icon-n4px"><i data-lucide="trash"></i></span>
                    </button>
                </div>


                <!-- Quantity control buttons -->
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

    // Add event listeners for quantity change, locating, deleting, and editing
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

    col.querySelector('.delete-btn').addEventListener('click', () => {
        const response = confirm(`Are you sure you want to delete ${item.name}?`);
        const id = item.id;
        const itemsContainer = document.getElementById('items-container-grid');
        if (response) {
            // Delete item from database
            fetch(`/api/items/${id}`, { method: "DELETE" })
                .then(() => {
                    const col = itemsContainer.querySelector(`div[data-id="${id}"]`);
                    col.parentNode.removeChild(col);
                    const deleteTooltip = bootstrap.Tooltip.getInstance(col.querySelector('.delete-btn'));
                    if (deleteTooltip) {
                        deleteTooltip.hide();
                    }
                    fetchDataAndLoadTags();
                })
                .catch((error) => console.error(error));
        }
    });

    col.querySelector('.copy-btn').addEventListener('click', () => {
        isCopyingItem = true;
        removeLocalStorage();
        $("#item-modal").modal("show");
        document.getElementById("item_name").value = item.name;
        document.getElementById("item_url").value = item.link;
        document.getElementById("item_image").value = item.image;
        document.getElementById("item_quantity").value = item.quantity;
        // Set LED positions for editing
        localStorage.setItem('led_positions', JSON.stringify(item.position))
        clickedCells = JSON.parse(localStorage.getItem('led_positions'));
        localStorage.setItem('edit_led_positions', JSON.stringify(item.position))
        localStorage.setItem('edit_image_path', JSON.stringify(item.image))
        // Set item tags for editing
        if (item.tags) {
            const cleanedTags = item.tags.replace(/[\[\]'"`\\]/g, '');
            const itemTagsArray = cleanedTags.split(',');
            localStorage.setItem('item_tags', JSON.stringify(itemTagsArray))
            tags = itemTagsArray;
            loadTagsIntoTagify()
        }
    });
    col.querySelector('.edit-btn').addEventListener('click', () => {
        // Set flag for editing, remove local storage, and show the item modal
        isEditingItem = true;
        removeLocalStorage();
        $("#item-modal").modal("show");
        document.getElementById("item_name").value = item.name;
        document.getElementById("item_url").value = item.link;
        document.getElementById("item_image").value = item.image;
        document.getElementById("item_quantity").value = item.quantity;

        // Set LED positions for editing
        localStorage.setItem('led_positions', JSON.stringify(item.position))
        clickedCells = JSON.parse(localStorage.getItem('led_positions'));
        localStorage.setItem('edit_led_positions', JSON.stringify(item.position))
        localStorage.setItem('edit_image_path', JSON.stringify(item.image))

        // Set item tags for editing
        if (item.tags) {
            const cleanedTags = item.tags.replace(/[\[\]'"`\\]/g, '');
            const itemTagsArray = cleanedTags.split(',');
            localStorage.setItem('item_tags', JSON.stringify(itemTagsArray))
            tags = itemTagsArray;
            loadTagsIntoTagify()
        }

        // Set editing item ID and IP
        editingItemId = item.id;
        editingItemIP = item.ip;
    });

    // Return the created column element
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
    const options = Array.from(selectEspDropdown.options);
    for (let i = 0; i < options.length; i++) {
        const optionIp = options[i].dataset.espIp.trim().toLowerCase();
        const optionName = options[i].dataset.espName.trim().toLowerCase();
        if (optionIp === ip.trim().toLowerCase() || optionName === ip.trim().toLowerCase()) {
            return i; // Return the index when either the IP or the name matches the selected option value.
        }
    }
    return 0; // Return -1 if no match is found.
}



function initialiseTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
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
    isEditingItem = false;
    isCopyingItem = false;

}

function sortItems(sortMethod) {
    const itemsContainer = document.getElementById('items-container-grid');
    // Get the list of items
    const items = Array.from(itemsContainer.children);
    // Sort the items based on the selected sorting method

    const sortedItems = items.sort((a, b) => {
        let itemA = a.dataset[sortMethod];
        let itemB = b.dataset[sortMethod];
        if (sortMethod === 'quantity' || sortMethod === 'id') {
            // Convert values to numbers for numeric comparison
            return parseInt(itemA, 10) - parseInt(itemB, 10);
        }
        if (sortMethod === 'position') {
            return itemA[0] - itemB[0];
        }
        else {
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
