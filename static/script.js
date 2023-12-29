const form = document.getElementById("add-form");
const itemList = document.getElementById("item-list");
const selectEspDropdownIP = document.getElementById("ip");
const CopyBnt = document.getElementById("copy-item")
let isEditingItem = false;
let editingItemId = null; // Track the ID of the item being edited


async function uploadImage() {
    const formData = new FormData(document.getElementById('add-form'))
    const file = formData.get('file')
    // returns undefined if no file is selected
    if (file.name.length === 0) {
        console.log('no file uploaded')
        return
    }
    const response = await fetch('/upload', {body: formData, method: 'POST'})
    const imageURL = await response.text()
    console.log(`uploaded file to ${imageURL}`)
    return new URL(window.location.href + imageURL)
}

// Add item to list
async function addItem(event) {
    event.preventDefault();

    if (document.getElementById("image").value !== localStorage.getItem('edit_image_path')) { //check whether image has changed and only then load image
        let localImage = await uploadImage();
        if (!!localImage) {
            // set image path to newly uploaded file
            document.getElementById("image").value = localImage
        }
    }
    submitLights();
    const name = document.getElementById("name").value;
    const link = document.getElementById("link").value || "";
    const image = document.getElementById("image").value;
    let position = localStorage.getItem('led_positions');
    const quantity = document.getElementById("quantity").value;
    const selectedEspDropdown = document.getElementById("ip"); // Get the selected ESP dropdown
    const tags = localStorage.getItem('item_tags');
    const selectedEspValue = selectedEspDropdown.value;
    if (selectedEspValue === "select") {
        // Check if the user has not selected anything
        alert("Please select an ESP.");
        return;
    }
    if (position === "[]") {
        // Check if the user has not selected anything
        if (!isEditingItem) {
            alert("Please select an LEDS to light up.");
            return;
        } else {
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
            if (isEditingItem) {
                // We are editing, so send a PUT request to update the existing item
                fetch(`/api/items/${editingItemId}`, {
                    method: "PUT",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify(item),
                })
                    .then((response) => response.json())
                    .then((data) => {
                        item.id = data.id;
                        const li = itemList.querySelector(`li[data-id="${editingItemId}"]`);
                        const updatedLi = createItemElement(item);
                        itemList.replaceChild(updatedLi, li);
                        isEditingItem = false; // Reset the editing flag
                        form.reset();
                        toggleAddForm();
                        document.getElementById("btn-add").innerHTML = "Add item"; // Change the button text back to "Add item"
                    })
                    .catch((error) => console.error(error));
            } else {
                // Add the item with the correct IP
                fetch("/api/items", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify(item),
                })
                    .then((response) => response.json())
                    .then((data) => {
                        const li = createItemElement(data);
                        isEditingItem = false;
                        itemList.appendChild(li);
                        form.reset();
                        toggleAddForm();
                        removeLocalStorage();
                    })
                    .catch((error) => console.error(error));
            }
        })
        .catch((error) => console.error(error));
    // Clear the stored data in the 'led_positions' key
    removeLocalStorage();
    loadTags();

}

function removeLocalStorage() {
    localStorage.removeItem('led_positions');
    localStorage.removeItem('edit_led_positions');
    localStorage.removeItem('item_tags');
    localStorage.removeItem('edit_image_path');
}


function toggleAddForm() {
    const btn = document.getElementById("btn-add");
    const container = document.getElementById("form-container");
    document.getElementById("select_led_container").style.display = "none";
    if (container.style.display === "block" && !isEditingItem) {
        loadTags();
        container.style.display = "none";
        btn.innerHTML = "Add item";
        form.reset();
        document.getElementById("save-item").innerHTML = "Add";
    } else {
        container.style.display = "block";
        btn.innerHTML = "Close";
        if (!isEditingItem) {
            form.reset();
            removeLocalStorage();
            CopyBnt.style.display = "none";
            resetTagSelection(tagContainer);
        }
    }
}

// Delete item
function deleteItem(item) {
    const response = confirm(`Are you sure you want to delete ${item.name}?`);
    const id = item.id;
    if (response) {
        // Delete item from database
        fetch(`/api/items/${id}`, {method: "DELETE"})
            .then(() => {
                const li = itemList.querySelector(`li[data-id="${id}"]`);
                li.parentNode.removeChild(li);
            })
            .catch((error) => console.error(error));
    }
}

// Create delete button
function createDeleteButton(item) {
    const deleteBtn = document.createElement("button");
    deleteBtn.innerText = "Delete";

    function setButtonStyle(isHovered) {
        deleteBtn.innerHTML = isHovered ? "delete" : "Delete";
        deleteBtn.className = isHovered ? 'material-symbols-outlined' : '';
        deleteBtn.classList.add(
            "bg-red-500",
            "h-8",
            "w-full",
            "rounded-md",
            "text-white",
            "justify-center",
            "items-center",
            "mx-auto"
        );
        if (isHovered) {
            deleteBtn.classList.add("hover:bg-red-700");
            deleteBtn.classList.add("text-xl");
        } else {
            deleteBtn.classList.add("text-xs");
        }
    }

    // Set the initial style
    setButtonStyle(false);
    // Set the inner text to "trash_can_open" on hover
    deleteBtn.addEventListener("mouseover", () => {
        setButtonStyle(true);
    });
    // Set the inner text back to "Delete" when not hovering
    deleteBtn.addEventListener("mouseout", () => {
        setButtonStyle(false);
    });
    deleteBtn.addEventListener("click", () => deleteItem(item));
    return deleteBtn;
}


// Create edit button
function createEditButton(item) {
    const editBtn = document.createElement("button");
    editBtn.innerText = "Edit";

    function setButtonStyle(isHovered) {
        editBtn.className = isHovered ? 'material-symbols-outlined' : '';
        editBtn.classList.add(
            "bg-blue-500",
            "h-8",
            "w-full",
            "rounded-md",
            "text-white",
            "justify-center",
            "items-center",
            "mx-auto"
        );
        if (isHovered) {
            editBtn.classList.add("hover:bg-blue-700");
            editBtn.classList.add("text-xl");
        } else {
            editBtn.classList.add("hover:bg-blue-700");
            editBtn.classList.add("text-xs");
        }
    }

    // Set the initial style
    setButtonStyle(false);

    // Set the inner text to "edit" on hover
    editBtn.addEventListener("mouseover", () => {
        editBtn.innerText = "edit";
        setButtonStyle(true);
    });

    // Set the inner text back to "Edit" when not hovering
    editBtn.addEventListener("mouseout", () => {
        editBtn.innerText = "Edit";
        setButtonStyle(false);
    });
    editBtn.addEventListener("click", () => {
        isEditingItem = true;
        resetTagSelection(tagContainer);
        document.getElementById("name").value = item.name;
        document.getElementById("link").value = item.link;
        document.getElementById("image").value = item.image;
        document.getElementById("quantity").value = item.quantity;
        localStorage.setItem('led_positions', JSON.stringify(item.position))
        localStorage.setItem('edit_led_positions', JSON.stringify(item.position))
        localStorage.setItem('edit_image_path', JSON.stringify(item.image))
        if (item.tags) {
            const cleanedTags = item.tags.replace(/[\[\]'"`\\]/g, '');
            const itemTagsArray = cleanedTags.split(',');
            localStorage.setItem('item_tags', JSON.stringify(itemTagsArray))
            PopulateTagSelection(itemTagsArray);
        }
        //console.log('LED data:', JSON.parse(localStorage.getItem('led_positions')));
        const selectedValue = item.ip; // The IP to select
        selectEspDropdownIP.selectedIndex = findIndexByIP(selectedValue);
        window.scrollTo({
            top: 10,
            behavior: "auto"
        });
        CopyBnt.style.display = "block";
        toggleAddForm();
        editingItemId = item.id;
        document.getElementById("save-item").innerHTML = "Save Changes";
        generateGrid();
    });

    return editBtn;
}

// Create locate button
function createLocateButton(item) {
    const locateBtn = document.createElement("button");
    locateBtn.innerText = "Locate";

    function setButtonStyle(isHovered) {
        locateBtn.innerHTML = isHovered ? "lightbulb" : "Locate";
        locateBtn.className = isHovered ? 'material-symbols-outlined' : '';
        locateBtn.classList.add(
            "bg-blue-500",
            "h-8",
            "w-full",
            "rounded-md",
            "text-white",
            "justify-center",
            "items-center",
            "mx-auto"
        );
        if (isHovered) {
            locateBtn.classList.add("hover:bg-blue-700");
            locateBtn.classList.add("text-xl");
        } else {
            locateBtn.classList.add("hover:bg-blue-700");
            locateBtn.classList.add("text-xs");
        }
    }

    // Set the initial style
    setButtonStyle(false);

    // Set the inner text to "locate" on hover
    locateBtn.addEventListener("mouseover", () => {
        locateBtn.innerText = "locate";
        setButtonStyle(true);
    });

    // Set the inner text back to "Locate" when not hovering
    locateBtn.addEventListener("mouseout", () => {
        locateBtn.innerText = "Locate";
        setButtonStyle(false);
    });
    locateBtn.addEventListener("click", () => {
        fetch(`/api/items/${item.id}`, {
            method: "POST",
            headers: {"Content-Type": "application/x-www-form-urlencoded"},
            body: new URLSearchParams({action: "locate"}),
        }).catch((error) => console.error(error));
    });
    return locateBtn;
}

// Create add quantity button
function createAddQuantityButton(item) {
    const addQuantityBtn = document.createElement("button");
    addQuantityBtn.setAttribute('class', 'material-symbols-outlined');
    addQuantityBtn.innerText = "add_circle";
    addQuantityBtn.classList.add(
        "text-blue-500",
        "hover:text-blue-700",
        "h-8",
        "w-8",
        "rounded-full",
        "text-4xl",
        "font-bold",
        "flex",
        "justify-center",
        "items-center",
        "mx-auto"
    );
    addQuantityBtn.addEventListener("click", () => {
        updatedItem = {...item, quantity: item.quantity + 1};
        fetch(`/api/items/${item.id}`, {
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(updatedItem),
        })
            .then(() => {
                const li = itemList.querySelector(`li[data-id="${item.id}"]`);
                const updatedLi = createItemElement(updatedItem);
                itemList.replaceChild(updatedLi, li);
            })
            .catch((error) => console.error(error));
    });
    return addQuantityBtn;
}

// Remove quantity
function removeQuantity(item) {
    console.log(`Quantity of ${item.name}: ${item.quantity}`);
}

// Create remove quantity button
function createRemoveQuantityButton(item) {
    const removeQuantityBtn = document.createElement("button");
    removeQuantityBtn.setAttribute('class', 'material-symbols-outlined');
    removeQuantityBtn.innerText = "do_not_disturb_on";
    removeQuantityBtn.classList.add(
        "text-blue-500",
        "hover:text-red-700",
        "h-8",
        "w-8",
        "rounded-full",
        "text-4xl",
        "font-bold",
        "flex",
        "justify-center",
        "items-center",
        "mx-auto"
    );
    removeQuantityBtn.addEventListener("click", () => {
        if (item.quantity > 0) {
            updatedItem = {...item, quantity: item.quantity - 1};
            fetch(`/api/items/${item.id}`, {
                method: "PUT",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(updatedItem),
            })
                .then(() => {
                    const li = itemList.querySelector(`li[data-id="${item.id}"]`);
                    const updatedLi = createItemElement(updatedItem);
                    itemList.replaceChild(updatedLi, li);
                })
                .catch((error) => console.error(error));
        }
    });
    return removeQuantityBtn;
}

// show quantity
function showQuantity(item) {
    console.log(`Quantity of ${item.name}: ${item.quantity}`);
}

const search = document.getElementById("search");

function filterItems(e) {
    const searchText = e.target.value.toLowerCase();
    const items = itemList.getElementsByTagName("li");

    Array.from(items).forEach((item) => {
        const itemName = item.getElementsByTagName("h2")[0].textContent;
        if (itemName.toLowerCase().indexOf(searchText) !== -1) {
            item.style.display = "flex";
        } else {
            item.style.display = "none";
        }
    });
}

//search.addEventListener("input", filterItems);

// Create item element
function createItemElement(item) {
    const li = document.createElement("li");
    li.dataset.id = item.id;
    li.dataset.name = item.name;
    li.dataset.quantity = parseInt(item.quantity, 10);  // Store as numbers
    li.dataset.ip = item.ip;
    li.dataset.tags = item.tags;
    li.classList.add("item");

    const wrapper = document.createElement("div");
    wrapper.classList.add(
        "item-wrapper",
        "drop-shadow-md",
        "h-full",
        "w-11/12",
        "md:w-full",
        "mx-auto",
        "p-2",
        "rounded-md",
        "grid",
        "grid-cols-1",
        "gap-2",
        "items-center"
    );
    li.appendChild(wrapper);

    const img = document.createElement("img");
    img.src = item.image;
    img.classList.add("w-32", "h-32", "rounded-lg", "mx-auto", "item-image");//reactive size: "sm:h-24","md:h-32","lg:h-32","xl:h-48","sm:w-24","md:w-32","lg:w-32", "xl:w-48",
    wrapper.appendChild(img);

    const div = document.createElement("div");
    div.classList.add(
        "text-center",
        "text-slate",
        "text-sm",
        "grid",
        "grid-cols-1",
        "gap-2"
    );
    wrapper.appendChild(div);

    const h2 = document.createElement("h2");
    h2.innerText = item.name;
    h2.classList.add(
        "text-lg",
        "text-slate",
        "overflow-hidden",
        "whitespace-nowrap",
        "overflow-ellipsis",
        "hover:whitespace-normal",
    );
    div.appendChild(h2);

    const p = document.createElement("p");
    const a = document.createElement("a");
    a.href = item.link;
    a.target = "_blank";
    a.innerText = "Buy more";
    a.classList.add("hover:font-bold", "hover:underline", "hover:text-blue-700"); // Add hover styles
    p.appendChild(a);
    div.appendChild(p);

    const innerWrapper = document.createElement("div");
    innerWrapper.classList.add("grid", "grid-cols-3", "gap-2");
    div.appendChild(innerWrapper);

    const deleteBtn = createDeleteButton(item);
    innerWrapper.appendChild(deleteBtn);

    const editBtn = createEditButton(item);
    innerWrapper.appendChild(editBtn);

    const locateBtn = createLocateButton(item);
    innerWrapper.appendChild(locateBtn);

    const removeQuantityBtn = createRemoveQuantityButton(item);
    innerWrapper.appendChild(removeQuantityBtn);

    const quantity = document.createElement("span");
    quantity.innerText = item.quantity;
    quantity.classList.add(
        "text-center",
        "text-slate",
        "text-lg",
        "justify-center",
        "items-center",
        "mx-auto",
        "pt-1"
    );
    innerWrapper.appendChild(quantity);

    const addQuantityBtn = createAddQuantityButton(item);
    innerWrapper.appendChild(addQuantityBtn);

    return li;
}

// Load items from server
function loadItems() {
    fetch("/api/items")
        .then((response) => response.json())
        .then((data) => {
            data.forEach((item) => {
                const li = createItemElement(item);
                itemList.appendChild(li);

            });
        })
        .catch((error) => console.error(error));

}

loadItems();


function createCheckboxGrid() {
    const selectEspDropdown = document.getElementById("add_item_esp_select");
    const checkboxGrid = document.getElementById("checkbox-grid");

    const selectedOption = selectEspDropdown.options[selectEspDropdown.selectedIndex];
    const rows = parseInt(selectedOption.dataset.espRows);
    const columns = parseInt(selectedOption.dataset.espColumns);

    // Variables to determine the starting position and serpentine direction
    const startY = selectedOption.dataset.espStartY === 'top';
    const startX = selectedOption.dataset.espStartX === 'left';
    const serpentine = selectedOption.dataset.espSerpentine === 'horizontal';

    checkboxGrid.innerHTML = ""; // Clear previous grid if any

    if (!isNaN(rows) && !isNaN(columns)) {
        const table = document.createElement("table");
        table.style.borderCollapse = "collapse"; // Set border collapse for better table appearance

        let ledNumber = 1; // Start the LED number counter

        for (let i = startY ? 1 : rows; startY ? i <= rows : i > 0; startY ? i++ : i--) {
            const row = document.createElement("tr");

            for (let j = startX ? 1 : columns; startX ? j <= columns : j > 0; startX ? j++ : j--) {
                const cell = document.createElement("td");

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";

                // Calculate the position based on the specified settings
                let rowPosition = startY ? i : rows - i + 1;
                let colPosition = startX ? j : columns - j + 1;

                // Calculate LED number based on serpentine or normal order
                if (serpentine) {
                    let serpentineCol = startX ? colPosition : columns - colPosition + 1;
                    ledNumber = (rowPosition - 1) * columns + serpentineCol;
                } else {
                    ledNumber = (rowPosition - 1) * columns + colPosition;
                }

                checkbox.id = `led${ledNumber}`;

                const checkboxLabel = document.createElement("label");
                checkboxLabel.setAttribute("for", `led${ledNumber}`);
                checkboxLabel.textContent = `led${ledNumber}`;

                cell.appendChild(checkbox);
                cell.appendChild(checkboxLabel);
                row.appendChild(cell);

                ledNumber++; // Increment the LED number for uniqueness
            }

            table.appendChild(row);
        }

        checkboxGrid.appendChild(table);
    }
}


// Event listener for select change
document.getElementById("add_item_esp_select").addEventListener("change", createCheckboxGrid);


function populateEspDropdown() {
    const selectEspDropdown = document.getElementById("add_item_esp_select");
    selectEspDropdown.innerHTML = "";

    // Fetch ESP devices
    fetch("/api/esp")
        .then((response) => response.json())
        .then((data) => {
            if (data.length > 0) {
                // Devices found: Populate dropdown and select the first one
                data.forEach((esp, index) => {
                    const option = document.createElement("option");
                    option.value = esp.id;
                    option.dataset.espRows = esp.rows;
                    option.dataset.espColumns = esp.cols;
                    option.dataset.espStartY = esp.start_y;
                    option.dataset.espStartX = esp.start_x;
                    option.dataset.espSerpentine = esp.serpentine_direction;
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
            createCheckboxGrid();
        })
        .catch((error) => console.error(error));
}


function findIndexByIP(ip) {
    const options = selectEspDropdownIP.options;
    for (let i = 0; i < options.length; i++) {
        const optionValue = options[i].textContent.trim(); // Trim whitespace from option value
        if (optionValue.toLowerCase() === ip.trim().toLowerCase()) { // Case-insensitive comparison
            return i; // Return the index when the IP matches the selected option value.
        }
    }
    return 0; // Return 0 if no match is found.
}

document.getElementById("sort_method").addEventListener("change", sortItems);

// Sorting function
function sortItems() {
    const sortMethod = document.getElementById("sort_method").value;
    updateSortTitle();
    // Get the list of items
    const items = Array.from(itemList.children);
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
    itemList.innerHTML = '';

    // Append the sorted items to the list
    sortedItems.forEach(item => {
        itemList.appendChild(item);
    });
}

function updateSortTitle() {
    var select = document.getElementById("sort_method");
    var selectedOption = select.options[select.selectedIndex];
    var title = document.getElementById("sort_title");

    title.textContent = "Sort by: " + selectedOption.textContent;
}

document.getElementById('add-item-modal').addEventListener('shown.bs.modal', function (event) {
    console.log("Add item modal: 'shown'")
    let inputField = document.getElementById('add_item_name');
    inputField.focus();
    inputField.select();
    populateEspDropdown();
});


function drawGrid() {

    const canvasContainer = document.getElementById('esp-canvas-container');
    const responsiveCanvas = document.getElementById('esp-responsive-canvas');

    // Get the actual pixel width of the canvas container
    const containerStyle = window.getComputedStyle(canvasContainer);
    const containerPadding = parseFloat(containerStyle.paddingLeft) + parseFloat(containerStyle.paddingRight);
    const containerWidth = canvasContainer.clientWidth - containerPadding;
    const containerHeight = canvasContainer.clientHeight;

    responsiveCanvas.width = containerWidth;
    responsiveCanvas.height = containerHeight;

    const rows = parseInt(document.getElementById('esp_rows').value);
    const columns = parseInt(document.getElementById('esp_columns').value);
    const startX = document.getElementById('esp_startx').options[document.getElementById('esp_startx').selectedIndex].getAttribute("data-startx");
    const startY = document.getElementById('esp_starty').options[document.getElementById('esp_starty').selectedIndex].getAttribute("data-starty");
    const serpentineDirection = document.getElementById('esp_serpentine').options[document.getElementById('esp_serpentine').selectedIndex].getAttribute("data-serpentine");


    console.log("startX: " + startX + ", " + "startY: " + startY + ", " + "serpentineDirection: " + serpentineDirection)

    const canvas = document.getElementById('esp-responsive-canvas');

    const ctx = canvas.getContext('2d');

    const lineWidth = 2;
    const boxWidth = (canvas.width - lineWidth) / columns;
    const boxHeight = boxWidth;
    canvas.height = (boxHeight * rows) + lineWidth;
    const lineColour = "#0d6efd";
    const gridColour = "#6c757d";
    var offset = 0;
    var startIndicatorX = 0
    var startIndicatorY = 0
    var endIndicatorX = 0
    var endIndicatorY = 0

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = lineWidth;

    const halfLineWidth = lineWidth / 2;

    // Draw grid
    ctx.strokeStyle = gridColour;
    for (let i = 0; i <= rows; i++) {
        ctx.beginPath();
        const y = i * boxHeight + halfLineWidth; // Add half of the line width
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    for (let j = 0; j <= columns; j++) {
        ctx.beginPath();
        const x = j * boxWidth + halfLineWidth; // Add half of the line width
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    // Draw line
    ctx.strokeStyle = lineColour;
    if (serpentineDirection === "Horizontal") {
        // Draw horizontal lines
        for (let i = 0; i <= rows - 1; i++) {
            ctx.beginPath();
            const y = (i * boxHeight + halfLineWidth) + (boxHeight / 2); // Add half of the line width
            ctx.moveTo(boxWidth / 2, y);
            ctx.lineTo(canvas.width - (boxWidth / 2), y);
            ctx.stroke();
        }
        // Draw vertical lines
        if (columns > 1) {
            ctx.setLineDash([boxHeight]);
        }

        if (startY === "Top") {
            startIndicatorY = 0;
            endIndicatorY = rows - 1;
        } else if (startY === "Bottom") {
            startIndicatorY = rows - 1;
            endIndicatorY = 0;
        }

        if (startX === "Left") {
            offset = startY === "Top" ? boxHeight : (boxHeight * (rows % 2)) + boxHeight;
            startIndicatorX = 0;
            endIndicatorX = rows % 2 ? columns - 1 : 0;
        } else if (startX === "Right") {
            offset = startY === "Top" ? 0 : boxHeight * (rows % 2);
            startIndicatorX = columns - 1;
            endIndicatorX = rows % 2 ? 0 : columns - 1;
        }

        for (let i = 0; i <= columns - 1; i++) {
            if (i === 0) {
                ctx.lineDashOffset = offset;
            } else if (i === columns - 1) {
                ctx.lineDashOffset = offset + boxHeight;
            }

            if (i === 0 || i === columns - 1) {
                ctx.beginPath();
                const x = (i * boxWidth + halfLineWidth) + (boxWidth / 2); // Add half of the line width
                ctx.moveTo(x, boxHeight / 2);
                ctx.lineTo(x, canvas.height - (boxHeight / 2));
                ctx.stroke();
            }

        }
    } else {

        // Draw vertical lines
        for (let i = 0; i <= columns - 1; i++) {
            ctx.beginPath();
            const x = (i * boxWidth + halfLineWidth) + (boxWidth / 2); // Add half of the line width
            ctx.moveTo(x, boxHeight / 2);
            ctx.lineTo(x, canvas.height - (boxHeight / 2));
            ctx.stroke();
        }
        // Draw horizontal lines
        if (rows > 1) {
            ctx.setLineDash([boxWidth]);
        }


        if (startX === "Left" && startY === "Top") {
            offset = boxWidth;
            startIndicatorX = 0;
            startIndicatorY = 0;

            endIndicatorX = columns - 1;
            if (columns % 2) {
                endIndicatorY = rows - 1;
            } else {
                endIndicatorY = 0;
            }

        } else if (startX === "Right" && startY === "Top") {
            offset = (boxWidth * (columns % 2)) + boxWidth;

            startIndicatorX = columns - 1;
            startIndicatorY = 0;

            endIndicatorX = 0;
            if (columns % 2) {
                endIndicatorY = rows - 1;
            } else {
                endIndicatorY = 0;
            }

        }
        if (startX === "Left" && startY === "Bottom") {
            offset = 0;

            startIndicatorY = rows - 1;
            startIndicatorX = 0;

            endIndicatorX = columns - 1;
            if (columns % 2) {
                endIndicatorY = 0;
            } else {
                endIndicatorY = rows - 1;
            }

        } else if (startX === "Right" && startY === "Bottom") {
            offset = boxWidth * (columns % 2);
            startIndicatorY = rows - 1;
            startIndicatorX = columns - 1;

            endIndicatorX = 0;
            if (columns % 2) {
                endIndicatorY = 0;
            } else {
                endIndicatorY = rows - 1;
            }
        }

        for (let i = 0; i <= rows - 1; i++) {
            if (i === 0) {
                ctx.lineDashOffset = offset;
            } else if (i === rows - 1) {
                ctx.lineDashOffset = offset + boxWidth;
            }

            if (i === 0 || i === rows - 1) {
                ctx.beginPath();
                const y = (i * boxHeight + halfLineWidth) + (boxHeight / 2); // Add half of the line width
                ctx.moveTo(boxWidth / 2, y);
                ctx.lineTo(canvas.width - (boxWidth / 2), y);
                ctx.stroke();
            }
        }
    }

    // Draw circles in the middle of each grid square
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < columns; j++) {
            const circleCenterX = j * boxWidth + boxWidth / 2 + halfLineWidth;
            const circleCenterY = i * boxHeight + boxHeight / 2 + halfLineWidth;
            const circleRadius = Math.min(boxWidth, boxHeight) / 15;
            ctx.beginPath();
            ctx.arc(circleCenterX, circleCenterY, circleRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#ffc107';
            ctx.fill();
        }
    }
    const indicatorCircleRadius = Math.min(boxWidth, boxHeight) / 8;

    const startCircleCenterX = startIndicatorX * boxWidth + boxWidth / 2 + halfLineWidth;
    const startCircleCenterY = startIndicatorY * boxHeight + boxHeight / 2 + halfLineWidth;
    console.log(startCircleCenterX + ", " + startCircleCenterY);
    ctx.beginPath();
    ctx.arc(startCircleCenterX, startCircleCenterY, indicatorCircleRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#198754';
    ctx.fill();

    const endCircleCenterX = endIndicatorX * boxWidth + boxWidth / 2 + halfLineWidth;
    const endCircleCenterY = endIndicatorY * boxHeight + boxHeight / 2 + halfLineWidth;
    console.log(endCircleCenterX + ", " + endCircleCenterY);
    ctx.beginPath();
    ctx.arc(endCircleCenterX, endCircleCenterY, indicatorCircleRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#dc3545';
    ctx.fill();

}


document.getElementById('esp_rows').addEventListener('change', function () {
    drawGrid();
});
document.getElementById('esp_columns').addEventListener('change', function () {
    drawGrid();
});
document.getElementById('esp_startx').addEventListener('change', function () {
    drawGrid();
});
document.getElementById('esp_starty').addEventListener('change', function () {
    drawGrid();
});
document.getElementById('esp_serpentine').addEventListener('change', function () {
    drawGrid();
});

