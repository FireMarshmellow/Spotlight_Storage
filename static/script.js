function populateEspDropdown() {
    const selectEspDropdown = document.getElementById("item_esp_select");
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
    console.log("ESP Select changed");
    let selectEspDropdown = document.getElementById('item_esp_select');
    let rows = selectEspDropdown.options[selectEspDropdown.selectedIndex].getAttribute("data-esp-rows");
    let columns = selectEspDropdown.options[selectEspDropdown.selectedIndex].getAttribute("data-esp-columns");
    let startX = selectEspDropdown.options[selectEspDropdown.selectedIndex].getAttribute("data-esp-start-x");
    let startY = selectEspDropdown.options[selectEspDropdown.selectedIndex].getAttribute("data-esp-start-y");
    let serpentineDirection = selectEspDropdown.options[selectEspDropdown.selectedIndex].getAttribute("data-esp-serpentine");
    drawGrid("item", rows, columns, startX, startY, serpentineDirection);
});

function drawGrid(mode, rows, columns, startX, startY, serpentineDirection) {
    console.log("Draw grid running in mode: \"" + mode + "\"")
    var clickedCells = [];
    var canvasContainer = document.getElementById(mode + '-canvas-container');
    var responsiveCanvas = document.getElementById(mode + '-responsive-canvas');
    // Get the actual pixel width of the canvas container
    let containerStyle = window.getComputedStyle(canvasContainer);
    let containerPadding = parseFloat(containerStyle.paddingLeft) + parseFloat(containerStyle.paddingRight);
    let containerWidth = canvasContainer.clientWidth - containerPadding;
    let containerHeight = canvasContainer.clientHeight;
    responsiveCanvas.width = containerWidth;
    responsiveCanvas.height = containerHeight;
    if (mode == "esp") {
        rows = parseInt(document.getElementById('esp_rows').value);
        columns = parseInt(document.getElementById('esp_columns').value);
        startX = document.getElementById('esp_startx').options[document.getElementById('esp_startx').selectedIndex].getAttribute("data-startx");
        startY = document.getElementById('esp_starty').options[document.getElementById('esp_starty').selectedIndex].getAttribute("data-starty");
        serpentineDirection = document.getElementById('esp_serpentine').options[document.getElementById('esp_serpentine').selectedIndex].getAttribute("data-serpentine");
    }
    console.log("startX: " + startX + ", " + "startY: " + startY + ", " + "serpentineDirection: " + serpentineDirection)
    let canvas = document.getElementById(mode + '-responsive-canvas');
    let ctx = canvas.getContext('2d');
    let lineWidth = 2;
    let boxWidth = (canvas.width - lineWidth) / columns;
    let boxHeight = boxWidth;
    canvas.height = (boxHeight * rows) + lineWidth;
    let lineColour = "#0d6efd";
    let gridColour = "#6c757d";
    let offset = 0;
    let startIndicatorX = 0
    let startIndicatorY = 0
    let endIndicatorX = 0
    let endIndicatorY = 0
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = lineWidth;
    let halfLineWidth = lineWidth / 2;
    // Draw grid
    ctx.strokeStyle = gridColour;
    for (let i = 0; i <= rows; i++) {
        ctx.beginPath();
        let y = i * boxHeight + halfLineWidth; // Add half of the line width
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    for (let j = 0; j <= columns; j++) {
        ctx.beginPath();
        let x = j * boxWidth + halfLineWidth; // Add half of the line width
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
                let x = (i * boxWidth + halfLineWidth) + (boxWidth / 2); // Add half of the line width
                ctx.moveTo(x, boxHeight / 2);
                ctx.lineTo(x, canvas.height - (boxHeight / 2));
                ctx.stroke();
            }
        }
    } else {
        // Draw vertical lines
        for (let i = 0; i <= columns - 1; i++) {
            ctx.beginPath();
            let x = (i * boxWidth + halfLineWidth) + (boxWidth / 2); // Add half of the line width
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
                let y = (i * boxHeight + halfLineWidth) + (boxHeight / 2); // Add half of the line width
                ctx.moveTo(boxWidth / 2, y);
                ctx.lineTo(canvas.width - (boxWidth / 2), y);
                ctx.stroke();
            }
        }
    }
    // Draw circles in the middle of each grid square
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < columns; j++) {
            let circleCenterX = j * boxWidth + boxWidth / 2 + halfLineWidth;
            let circleCenterY = i * boxHeight + boxHeight / 2 + halfLineWidth;
            let circleRadius = Math.min(boxWidth, boxHeight) / 15;
            ctx.beginPath();
            ctx.arc(circleCenterX, circleCenterY, circleRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#ffc107';
            ctx.fill();
        }
    }
    let indicatorCircleRadius = Math.min(boxWidth, boxHeight) / 8;
    let startCircleCenterX = startIndicatorX * boxWidth + boxWidth / 2 + halfLineWidth;
    let startCircleCenterY = startIndicatorY * boxHeight + boxHeight / 2 + halfLineWidth;
    console.log(startCircleCenterX + ", " + startCircleCenterY);
    ctx.beginPath();
    ctx.arc(startCircleCenterX, startCircleCenterY, indicatorCircleRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#198754';
    ctx.fill();
    let endCircleCenterX = endIndicatorX * boxWidth + boxWidth / 2 + halfLineWidth;
    let endCircleCenterY = endIndicatorY * boxHeight + boxHeight / 2 + halfLineWidth;
    console.log(endCircleCenterX + ", " + endCircleCenterY);
    ctx.beginPath();
    ctx.arc(endCircleCenterX, endCircleCenterY, indicatorCircleRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#dc3545';
    ctx.fill();

    function handleCellClick(event) {
        console.log("Canvas clicked");
        // Get the size and position of the canvas
        let rect = canvas.getBoundingClientRect();
        // Calculate the x and y coordinates of the click relative to the canvas
        let x = event.clientX - rect.left;
        let y = event.clientY - rect.top;
        // Calculate which row and column was clicked based on the click coordinates
        let clickedRow = Math.floor(y / boxHeight);
        let clickedColumn = Math.floor(x / boxWidth);
        let clickedCell = {
            row: clickedRow,
            column: clickedColumn
        }; // Store clicked cell info
        // Find if the clicked cell is already in the clickedCells array
        let cellIndex = clickedCells.findIndex(cell => cell.row === clickedRow && cell.column === clickedColumn);
        // If the clicked cell is not in the array, add it; otherwise, remove it
        if (cellIndex === -1) {
            clickedCells.push(clickedCell);
        } else {
            clickedCells.splice(cellIndex, 1);
        }
        console.log(clickedCells);
        redrawGrid();
    }

    function redrawGrid() {
        console.log("Rows: " + rows + ", Columns: " + columns);
        // Loop through rows and columns of the grid
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < columns; j++) {
                // Check if the current cell is clicked (present in clickedCells)
                let isClicked = clickedCells.some(cell => cell.row === i && cell.column === j);
                // Calculate the center and radius of the circle to be drawn for each cell
                let circleCenterX = j * boxWidth + boxWidth / 2 + halfLineWidth;
                let circleCenterY = i * boxHeight + boxHeight / 2 + halfLineWidth;
                let circleRadius = Math.min(boxWidth, boxHeight) / 15;
                ctx.beginPath();
                ctx.arc(circleCenterX, circleCenterY, circleRadius, 0, Math.PI * 2);
                ctx.fillStyle = isClicked ? '#17a2b8' : '#ffc107';
                ctx.fill();
            }
        }
    }

    if (mode == "item") {
        // Remove the existing click event listener, if any
        canvas.removeEventListener('click', handleCellClick);
        // Add the click event listener
        canvas.addEventListener('click', handleCellClick);
    }
}

// Define an array to store fetched items
let fetchedItems = [];

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

function generateItemsGrid() {
    const itemsContainer = document.getElementById('items-container-grid');

    // Clear previous content in the container if needed
    itemsContainer.innerHTML = '';

    fetchedItems.forEach((item) => {
        const col = document.createElement('div');
        col.classList.add('col-6', 'col-sm-4', 'col-md-3', 'col-lg-2', 'mb-3');

        const template = `
        <div class="card overflow-hidden position-relative">
            <div class="overflow-hidden">
                <img src="${item.image}" class="card-img-top" alt="${item.name}">
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

        col.innerHTML = template;
        itemsContainer.appendChild(col);
    });
    initialiseTooltips();

    const locateButtons = document.querySelectorAll('.locate-btn');
    locateButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const itemId = button.getAttribute('data-item-id');
            console.log("Locate button '" + itemId + "' pressed.");
            fetch(`/api/items/${itemId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ action: 'locate' }),
            }).catch((error) => console.error(error));
        });
    });

    const minusButtons = document.querySelectorAll('.minus-btn');
    minusButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const itemId = button.getAttribute('data-item-id');
            console.log("Minus button '" + itemId + "' pressed.");
            const item = fetchedItems.find((item) => item.id === itemId);
            if (item && item.quantity > 0) {
                const updatedItem = { ...item, quantity: item.quantity - 1 };
                fetch(`/api/items/${itemId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedItem),
                })
                    .then(() => {
                        const quantityElement = document.getElementById(`quantity-${itemId}`);
                        if (quantityElement) {
                            quantityElement.textContent = updatedItem.quantity;
                        }
                    })
                    .catch((error) => console.error(error));
            }
        });
    });

    const plusButtons = document.querySelectorAll('.plus-btn');
    plusButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const itemId = button.getAttribute('data-item-id');
            console.log("Plus button '" + itemId + "' pressed.");
            const item = fetchedItems.find((item) => item.id === itemId);
            if (item) {
                const updatedItem = { ...item, quantity: item.quantity + 1 };
                fetch(`/api/items/${itemId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedItem),
                })
                    .then(() => {
                        // Handle UI update if needed
                    })
                    .catch((error) => console.error(error));
            }
        });
    });
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
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

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

loadItems();