const selectEspDropdown = document.getElementById("item_esp_select");
let fetchedItems = []; // Define an array to store fetched items
let isEditingItem = false;
let isCopyingItem = false;
let editingItemId = null; // Track the ID of the item being edited
let editingItemIP = null; // Track the IP of the item being edited


// Async function to handle the addition or editing of an item
async function addItem(event) {
    event.preventDefault();

    const imageUrl = document.getElementById("item_image").value.trim();
    const imageFileInput = document.getElementById("item_image_upload");
    let editImageURL = "";

    if (isEditingItem) {
        editImageURL = localStorage.getItem('edit_image_path').replace(/"/g, '').trim();
    }

    if (imageFileInput.files.length > 0) {
        // If an image file is uploaded, upload the image and set its URL
        const localImage = await uploadImage();
        if (localImage) {
            document.getElementById("item_image").value = localImage;
        }
    } else if (imageUrl !== editImageURL && imageUrl) {
        // If an image URL is provided and it's different from the editing image URL, use it directly
        document.getElementById("item_image").value = imageUrl;
    }

    // Submit lights and tags information
    submitLights();
    SubmitTags();

    // Gather item information from the form
    const name = document.getElementById("item_name").value;
    const link = document.getElementById("item_url").value || "";
    const image = document.getElementById("item_image").value.replace(window.location.href, "");
    let position = localStorage.getItem('led_positions');
    let quantity = document.getElementById("item_quantity").value;
    const tags = localStorage.getItem('item_tags');
    const article_number = document.getElementById("item_article_number").value.trim();
    const storage_location = document.getElementById("item_storage_location").value.trim();
    const selectedEspOption = selectEspDropdown.options[selectEspDropdown.selectedIndex];

    // Check if there are any empty fields
    if (handleEmptyFields('item')) return; // Exit if any fields are empty


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
        article_number,
        storage_location,
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
                option.dataset.espLayout = esp.row_layout || "";
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
document.getElementById("cropAndSaveBtn").addEventListener("click", addItem);
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
    col.classList.add('col-8', 'col-sm-5', 'col-md-4', 'col-lg-2', 'mb-1');
    // Set dataset attributes to store item information
    item.id = parseInt(item.id, 10);
    col.dataset.id = item.id;
    col.dataset.name = item.name;
    col.dataset.quantity = parseInt(item.quantity, 10);  // Store as numbers
    col.dataset.ip = item.ip;
    if (!Array.isArray(item.position)) {
        item.position = item.position.replace('[', '').replace(']', '');
        item.position = item.position.split(',').map(Number).filter(num => !isNaN(num));
    }
    col.dataset.position = item.position;
    col.dataset.tags = item.tags;
    col.dataset.articleNumber = item.article_number || "";
    col.dataset.storageLocation = item.storage_location || "";
    const metaParts = [];
    if (item.article_number) metaParts.push(`<span title="Article number"># ${escapeHtml(item.article_number)}</span>`);
    if (item.storage_location) metaParts.push(`<span title="Storage location">&#128205; ${escapeHtml(item.storage_location)}</span>`);
    const safeName = escapeHtml(item.name);
    const safeImage = escapeHtml(safeUrl(item.image));
    const safeLink = escapeHtml(safeUrl(item.link));
    const metaHtml = metaParts.length ? `<div class="small text-muted mb-2 d-flex flex-wrap gap-2 item-meta">${metaParts.join('')}</div>` : '';

    // Set inner HTML for the created column
    col.innerHTML = `
    <div class="card overflow-hidden position-relative">
        <!-- Image container with tooltip -->
        <div class="overflow-hidden d-flex justify-content-center">
            <img src="${safeImage}" class="card-img-top dynamic-img" alt="${safeName}">
        </div>

        <!-- Card body with item details and buttons -->
        <div class="card-body p-2">
            <!-- Link to the item -->
            <a href="${safeLink}" target="_blank" rel="noopener noreferrer" class="card-title-link">
                <h5 id="link-btn-${item.id}" class="card-title" data-bs-toggle="tooltip" title="Shop for more">${safeName}</h5>
            </a>
            ${metaHtml}

            <!-- Buttons for locating, editing, and dropdown menu -->
            <div class="d-flex justify-content-between align-items-center mb-2">
                <button class="btn btn-outline-info locate-btn" id="locate-btn-${item.id}" data-bs-toggle="tooltip" title="Locate" data-item-id="${item.id}">
                    <span class="icon-n4px"><i data-lucide="lightbulb"></i></span>
                </button>
                <button class="btn btn-outline-primary edit-btn" id="edit-btn-${item.id}" data-bs-toggle="tooltip" title="Edit">
                    <span class="icon-n4px"><i data-lucide="file-edit"></i></span>
                </button>

                <!-- Dropdown menu trigger -->
                <div class="dropdown">
                    <button class="btn btn-outline-secondary" type="button" id="dropdownMenuButton-${item.id}" data-bs-toggle="dropdown" aria-expanded="false">
                        <span class="icon-n4px"><i data-lucide="more-vertical"></i></span>
                    </button>
                    <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton-${item.id}">
                        <li><a id="copy_item_${item.id}" class="dropdown-item copy-btn" href="#">Copy Item</a></li>
                        <li><a id="delete_item_${item.id}" class="dropdown-item delete-btn" href="#">Delete</a></li>
                        <li><a id="crop_image_${item.id}" class="dropdown-item image-edit-btn" href="#">Crop Image</a></li>
                    </ul>
                </div>
            </div>

            <!-- Quantity control buttons -->
            <div class="d-flex justify-content-center align-items-center">
                <button class="btn btn-outline-danger me-auto minus-btn" id="minus-btn-${item.id}" data-bs-toggle="tooltip" title="-1 from stock" data-item-id="${item.id}">
                    <span class="icon-n4px"><i data-lucide="minus"></i></span>
                </button>
                <span id="quantity-${item.id}">${escapeHtml(item.quantity)}</span>
                <button class="btn btn-outline-success ms-auto plus-btn" id="plus-btn-${item.id}" data-bs-toggle="tooltip" title="+1 to stock" data-item-id="${item.id}">
                    <span class="icon-n4px"><i data-lucide="plus"></i></span>
                </button>
            </div>
        </div>
    </div>`;
    // vanilla JS
    var msnry = new Masonry( '.grid', {
        columnWidth: 200,
        itemSelector: '.grid-item'
    });
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
        const response = confirm(`Are you sure you want to delete ${String(item.name)}?`);
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
        document.getElementById("item_article_number").value = item.article_number || "";
        document.getElementById("item_storage_location").value = item.storage_location || "";
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
    col.querySelector('.image-edit-btn').addEventListener('click', () => {
        const imageElement = document.getElementById('imageToCrop');
        const image = item.image;
        const cropImageModal = document.getElementById('cropImageModal');
        const downloadButton = document.getElementById('download-image-btn'); // Get the download button

        // Set the dataset attributes
        cropImageModal.dataset.item = JSON.stringify(item);

        if (isValidUrl(image)) {
            // Fetch the image from the backend instead of setting the URL directly
            fetchWithTimeout(`/proxy-image?url=${encodeURIComponent(image)}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    return response.blob();
                })
                .then(blob => {
                    imageElement.src = URL.createObjectURL(blob);

                    // Set up the download button
                    downloadButton.style.display = 'block'; // Make the button visible

                    // Add click event listener for downloading the image
                    downloadButton.addEventListener('click', function() {
                        const url = window.URL.createObjectURL(blob);
                        // Create a temporary link element
                        const link = document.createElement('a');
                        link.href = url;
                        // Extract the filename from the image URL or set a default name
                        link.download = image.split('/').pop() || 'downloaded_image';
                        // Append the link to the document body
                        document.body.appendChild(link);
                        // Programmatically trigger the download
                        link.click();
                        // Clean up by revoking the Blob URL and removing the link element
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                    });

                    $(cropImageModal).modal("show");
                })
                .catch(error => {
                    console.error('Error fetching image:', error);
                    alert('Unable to load image. Please try a different Image URL.');
                });
        } else {
            // Directly use the local image path
            imageElement.src = image;
            downloadButton.style.display = 'none'; // Hide the download button for local images
            $(cropImageModal).modal("show");
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
        document.getElementById("item_article_number").value = item.article_number || "";
        document.getElementById("item_storage_location").value = item.storage_location || "";

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
            const updatedItem = { quantity: currentQuantity };

            // Make a fetch request to update the quantity in the database
            fetch(`/api/items/${itemId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Update-Quantity': 'true'  // Custom header to indicate quantity update
                },
                body: JSON.stringify(updatedItem),
            })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        console.error('Error updating quantity:', data.error);
                    }
                })
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
    document.getElementById("item_article_number").value = "";
    document.getElementById("item_storage_location").value = "";
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
        // Match on name, article number (barcode) and storage location
        const haystack = [
            item.dataset.name || "",
            item.dataset.articleNumber || "",
            item.dataset.storageLocation || "",
        ].join(" ").toLowerCase();
        item.style.display = haystack.indexOf(searchText) !== -1 ? "flex" : "none";
    });
});

// Barcode scanners type the code and press Enter: locate the item right away
// when the code matches an article number exactly, or when only one item is left.
document.getElementById("search").addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const searchText = e.target.value.trim().toLowerCase();
    if (!searchText) return;
    const items = Array.from(document.getElementById('items-container-grid').children);
    const exact = items.filter(item => (item.dataset.articleNumber || "").toLowerCase() === searchText);
    const visible = items.filter(item => item.style.display !== "none");
    const target = exact.length === 1 ? exact[0] : (visible.length === 1 ? visible[0] : null);
    if (target) {
        fetch(`/api/items/${target.dataset.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ action: "locate" }),
        }).catch((error) => console.error(error));
    }
});

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
}


const showAlert = (alertId, message, formType) => {
    const alert = document.getElementById(alertId);
    alert.classList.remove('d-none');

    const errorListId = formType === 'item' ? 'item-error-list' : 'error-list';
    const errorList = document.getElementById(errorListId);
    errorList.innerHTML = message;

    // Scroll to the top of the modal or page
    alert.scrollIntoView({ behavior: 'smooth' });
};


const handleEmptyFields = (formType) => {
    let emptyFields = [];
    let alertId = '';

    if (formType === 'esp') {
        const name = document.getElementById('esp_name').value;
        const esp_ip = document.getElementById('esp_ip').value;

        if (name.trim() === '') {
            emptyFields.push('Name');
        }
        if (esp_ip.trim() === '') {
            emptyFields.push('IP Address');
        }

        alertId ='esp-error-alert';
    } else if (formType === 'item') {
        const itemName = document.getElementById('item_name').value;
        const itemUrl = document.getElementById('item_url').value;
        const itemQuantity = document.getElementById('item_quantity').value;
        let position = localStorage.getItem('led_positions');

        if (itemName.trim() === '') {
            emptyFields.push('Item Name');
        }
        if (itemUrl.trim() === '') {
            emptyFields.push('Item URL');
        }
        if (itemQuantity.trim() === '') {
            emptyFields.push('Item Quantity');
        }
        if (position === "[]") {
            emptyFields.push("LED Positions");
        }

        alertId = 'item-error-alert';
    }

    if (emptyFields.length > 0) {
        const message = "The following fields are empty:<br>" + emptyFields.map(field => `<li>${field}</li>`).join('');
        showAlert(alertId, message, formType);
        return true;
    }

    return false;
};



loadItems();
window.addEventListener('resize', function() {
    lucide.createIcons(); // This ensures icons are re-rendered if needed
});


// Function to fetch with timeout
function fetchWithTimeout(url, timeout = 1000) {  // Increase the timeout value to 10 seconds
    return Promise.race([
        fetch(url),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out')), timeout)
        )
    ]);
}

// Adding event listener to the cropAndSaveBtn for saving the cropped image
document.getElementById("cropAndSaveBtn").addEventListener("click", onCropAndSave);

// Event listener for the modal hide event to reset dataset
document.getElementById('cropImageModal').addEventListener('hidden.bs.modal', function () {
    resetModalAndCropper(this);
});