let clickedCells = [];
let selectedCells = []
let isEventListened = false;
let canvas;
function drawGrid(mode, rows, columns, startX, startY, serpentineDirection) {
    // Convert string values to lowercase
    if (typeof startX === 'string') {
        startX = startX.toLowerCase();
    }
    if (typeof startY === 'string') {
        startY = startY.toLowerCase();
    }
    if (typeof serpentineDirection === 'string') {
        serpentineDirection = serpentineDirection.toLowerCase();
    }

    const canvasContainer = document.getElementById(mode + '-canvas-container');
    const responsiveCanvas = document.getElementById(mode + '-responsive-canvas');
    const theme = localStorage.getItem('theme')

    // Get the actual pixel width of the canvas container
    let containerStyle = window.getComputedStyle(canvasContainer);
    let containerPadding = parseFloat(containerStyle.paddingLeft) + parseFloat(containerStyle.paddingRight);
    let containerWidth = canvasContainer.clientWidth - containerPadding;
    let containerHeight = canvasContainer.clientHeight;
    responsiveCanvas.width = containerWidth;
    responsiveCanvas.height = containerHeight;
    if (mode === "esp") {
        rows = parseInt(document.getElementById('esp_rows').value);
        columns = parseInt(document.getElementById('esp_columns').value);
        startX = document.getElementById('esp_startx').options[document.getElementById('esp_startx').selectedIndex].getAttribute("data-startx").toLowerCase();
        startY = document.getElementById('esp_starty').options[document.getElementById('esp_starty').selectedIndex].getAttribute("data-starty").toLowerCase();
        serpentineDirection = document.getElementById('esp_serpentine').options[document.getElementById('esp_serpentine').selectedIndex].getAttribute("data-serpentine").toLowerCase();

    }else {
        if (startX == 1) {
            startX = "right";
        }

        if (serpentineDirection == 1) {
            serpentineDirection =  "vertical";
        }
    }
    columns = parseInt(columns);
    rows = parseInt(rows);

    const customLayout = mode === "esp"
        ? parseRowLayout(document.getElementById('esp_row_layout').value)
        : getSelectedEspLayout();
    if (customLayout) {
        canvasContainer.style.overflowX = '';
        drawLayoutGrid(mode, customLayout, startX, startY, serpentineDirection);
        if (mode === "item" && !isEventListened) {
            canvas = responsiveCanvas;
            canvas.addEventListener('click', function (event) {
                handleCellClick(event, mode);
            });
            isEventListened = true;
        }
        return;
    }
    layoutCells = null;

    //console.log("startX: " + startX + ", " + "startY: " + startY + ", " + "serpentineDirection: " + serpentineDirection)
    canvas = document.getElementById(mode + '-responsive-canvas');
    let ctx = canvas.getContext('2d');
    let lineWidth = 2;
    let boxSize = (canvas.width - lineWidth) / columns;

    //Overflow detection if canvas is too small for amount of columns
    if (boxSize <= 60) {
        boxSize = 60;
        canvas.width = (boxSize * columns) + lineWidth;
        canvasContainer.style.overflowX = 'scroll';

    }
    canvas.height = (boxSize * rows) + lineWidth;
   
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
        let y = i * boxSize + halfLineWidth; // Add half of the line width
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    for (let j = 0; j <= columns; j++) {
        ctx.beginPath();
        let x = j * boxSize + halfLineWidth; // Add half of the line width
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    // Draw line
    ctx.strokeStyle = lineColour;
    if (serpentineDirection === "horizontal") {
        // Draw horizontal lines
        for (let i = 0; i <= rows - 1; i++) {
            ctx.beginPath();
            const y = (i * boxSize + halfLineWidth) + (boxSize / 2); // Add half of the line width
            ctx.moveTo(boxSize / 2, y);
            ctx.lineTo(canvas.width - (boxSize / 2), y);
            ctx.stroke();
        }
        // Draw vertical lines
        if (columns > 1) {
            ctx.setLineDash([boxSize]);
        }
        if (startY === "top") {
            startIndicatorY = 0;
            endIndicatorY = rows - 1;
        } else if (startY === "bottom") {
            startIndicatorY = rows - 1;
            endIndicatorY = 0;
        }
        if (startX === "left") {
            offset = startY === "top" ? boxSize : (boxSize * (rows % 2)) + boxSize;
            startIndicatorX = 0;
            endIndicatorX = rows % 2 ? columns - 1 : 0;
        } else if (startX === "right") {
            offset = startY === "top" ? 0 : boxSize * (rows % 2);
            startIndicatorX = columns - 1;
            endIndicatorX = rows % 2 ? 0 : columns - 1;
        }
        for (let i = 0; i <= columns - 1; i++) {
            if (i === 0) {
                ctx.lineDashOffset = offset;
            } else if (i === columns - 1) {
                ctx.lineDashOffset = offset + boxSize;
            }
            if (i === 0 || i === columns - 1) {
                ctx.beginPath();
                let x = (i * boxSize + halfLineWidth) + (boxSize / 2); // Add half of the line width
                ctx.moveTo(x, boxSize / 2);
                ctx.lineTo(x, canvas.height - (boxSize / 2));
                ctx.stroke();
            }
        }
    } else {
        // Draw vertical lines
        for (let i = 0; i <= columns - 1; i++) {
            ctx.beginPath();
            let x = (i * boxSize + halfLineWidth) + (boxSize / 2); // Add half of the line width
            ctx.moveTo(x, boxSize / 2);
            ctx.lineTo(x, canvas.height - (boxSize / 2));
            ctx.stroke();
        }
        // Draw horizontal lines
        if (rows > 1) {
            ctx.setLineDash([boxSize]);
        }
        if (startX === "left" && startY === "top") {
            offset = boxSize;
            startIndicatorX = 0;
            startIndicatorY = 0;
            endIndicatorX = columns - 1;
            if (columns % 2) {
                endIndicatorY = rows - 1;
            } else {
                endIndicatorY = 0;
            }
        } else if (startX === "right" && startY === "top") {
            offset = (boxSize * (columns % 2)) + boxSize;
            startIndicatorX = columns - 1;
            startIndicatorY = 0;
            endIndicatorX = 0;
            if (columns % 2) {
                endIndicatorY = rows - 1;
            } else {
                endIndicatorY = 0;
            }
        }
        if (startX === "left" && startY === "bottom") {
            offset = 0;
            startIndicatorY = rows - 1;
            startIndicatorX = 0;
            endIndicatorX = columns - 1;
            if (columns % 2) {
                endIndicatorY = 0;
            } else {
                endIndicatorY = rows - 1;
            }
        } else if (startX === "right" && startY === "bottom") {
            offset = boxSize * (columns % 2);
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
                ctx.lineDashOffset = offset + boxSize;
            }
            if (i === 0 || i === rows - 1) {
                ctx.beginPath();
                let y = (i * boxSize + halfLineWidth) + (boxSize / 2); // Add half of the line width
                ctx.moveTo(boxSize / 2, y);
                ctx.lineTo(canvas.width - (boxSize / 2), y);
                ctx.stroke();
            }
        }
    }

    // Draw circles in the middle of each grid square
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < columns; j++) {
            let circleCenterX = j * boxSize + boxSize / 2 + halfLineWidth;
            let circleCenterY = i * boxSize + boxSize / 2 + halfLineWidth;
            let circleRadius = Math.min(boxSize, boxSize) / 15;
            ctx.beginPath();
            ctx.arc(circleCenterX, circleCenterY, circleRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#ffc107';
            ctx.fill();

            // Draw the cell number

            if (theme === 'dark') {
                ctx.fillStyle = 'white'; // Set text color for dark theme
            } else {
                ctx.fillStyle = 'black'; // Set text color for light theme or other themes
            }
            ctx.font = `${boxSize / 5}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const cellNumber = calculateLedNumber(i, j, startX, startY, serpentineDirection, rows, columns);
            ctx.fillText(cellNumber.toString(), circleCenterX + boxSize/5, circleCenterY - boxSize/5);
        }
    }
    let indicatorCircleRadius = Math.min(boxSize, boxSize) / 8;
    let startCircleCenterX = startIndicatorX * boxSize + boxSize / 2 + halfLineWidth;
    let startCircleCenterY = startIndicatorY * boxSize + boxSize / 2 + halfLineWidth;
    ctx.beginPath();
    ctx.arc(startCircleCenterX, startCircleCenterY, indicatorCircleRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#198754';
    ctx.fill();
    let endCircleCenterX = endIndicatorX * boxSize + boxSize / 2 + halfLineWidth;
    let endCircleCenterY = endIndicatorY * boxSize + boxSize / 2 + halfLineWidth;
    ctx.beginPath();
    ctx.arc(endCircleCenterX, endCircleCenterY, indicatorCircleRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#dc3545';
    ctx.fill();

    if (mode === "item") {
        if (!isEventListened) {

            canvas.addEventListener('click', function (event) {
                handleCellClick(event, mode);
            });

            isEventListened = true;
        }
        if (isEditingItem || isCopyingItem) {
            redrawGrid(rows, columns, "item", startX, startY, serpentineDirection);
        }
    }

}
function handleCellClick(event, mode) {
    const selectEspDropdown = document.getElementById('item_esp_select');
    const rows = parseInt(selectEspDropdown.options[selectEspDropdown.selectedIndex].getAttribute("data-esp-rows"));
    const columns = parseInt(selectEspDropdown.options[selectEspDropdown.selectedIndex].getAttribute("data-esp-columns"));
    let startX = selectEspDropdown.options[selectEspDropdown.selectedIndex].getAttribute("data-esp-start-x").toLowerCase();
    const startY = selectEspDropdown.options[selectEspDropdown.selectedIndex].getAttribute("data-esp-start-y").toLowerCase();
    let serpentineDirection = selectEspDropdown.options[selectEspDropdown.selectedIndex].getAttribute("data-esp-serpentine").toLowerCase();

    if (startX == 1) {
        startX = "right";
    }
    //console.log("Processed StartX:", startX);  // Debugging processed startX
    if (serpentineDirection == 1) {
        serpentineDirection =  "vertical";
    }

    const canvas = document.getElementById(mode + '-responsive-canvas');
    const canvasContainer = document.getElementById(mode + '-canvas-container');

    if (getSelectedEspLayout() && layoutCells) {
        const r = canvas.getBoundingClientRect();
        const px = (event.clientX - r.left) * (canvas.width / r.width);
        const py = (event.clientY - r.top) * (canvas.height / r.height);
        const hit = layoutCells.find(c => px >= c.x && px < c.x + c.w && py >= c.y && py < c.y + c.h);
        if (!hit) return;
        const idx = clickedCells.indexOf(hit.number);
        if (idx === -1) clickedCells.push(hit.number); else clickedCells.splice(idx, 1);
        redrawGrid(rows, columns, "item", startX, startY, serpentineDirection);
        return;
    }
    let lineWidth = 2;
    let boxSize = (canvas.width - lineWidth) / columns;
    if (boxSize <= 60) {
        boxSize = 60;
    }

    // Get the size and position of the canvas
    let rect = canvas.getBoundingClientRect();

    // Calculate the x and y coordinates of the click relative to the canvas
    let offsetX = rect.left + window.scrollX;  // Ensure offsetX accounts for window scroll
    let x = event.clientX - offsetX;
    let y = event.clientY - rect.top ;

    //console.log("Click coordinates relative to canvas - X:", x, "Y:", y);  // Debugging click coordinates

    // Calculate which row and column was clicked based on the click coordinates
    let clickedRow = Math.floor(y / boxSize);
    let clickedColumn = Math.floor(x / boxSize);

    //console.log("ClickedRow:", clickedRow, "ClickedColumn:", clickedColumn);  // Debugging clicked row and column

    const ledNumber = calculateLedNumber(clickedRow, clickedColumn, startX, startY, serpentineDirection, rows, columns);

    // Find if the clicked cell is already in the clickedCells array
    let cellIndex = clickedCells.indexOf(ledNumber);

    // If the clicked cell is not in the array, add it; otherwise, remove it
    if (cellIndex === -1) {
        clickedCells.push(ledNumber);
    } else {
        clickedCells.splice(cellIndex, 1);
    }

    redrawGrid(rows, columns, "item", startX, startY, serpentineDirection);
}


function calculateLedNumber(row, column, startX, startY, serpentineDirection, rows, columns) {
    if (startX === "right") {
        column = columns - column; // Ensure accurate column reversal
    }
        if (startY === "bottom") {
            row = rows - row;
        }

        if (serpentineDirection === "horizontal") {
            row = startY !== "bottom" ? row + 1 : row;
            column = startX !== "left" ? column - 1 : column;
            const isEvenRow = row % 2 === 0;
            return isEvenRow ? row * columns - (columns - (columns - column)) : row * columns - (columns - column) + 1;
        } else {
            column = startX !== "right" ? column + 1 : column;
            row = startY !== "top" ? row - 1 : row;

            const isEvenColumn = column % 2 === 0;
            return isEvenColumn ? column * rows - (rows - (rows - row)) : column * rows - (rows - row) + 1;
        }
}

function redrawGrid(rows, columns, mode, startX, startY, serpentineDirection) {
    if (mode === "item") {
        const customLayout = getSelectedEspLayout();
        if (customLayout) {
            drawLayoutGrid(mode, customLayout, startX, startY, serpentineDirection);
            return;
        }
    }
     canvas = document.getElementById(mode + '-responsive-canvas');

    let ctx = canvas.getContext('2d');
    let lineWidth = 2;
    let boxSize = (canvas.width - lineWidth) / columns;
    if(boxSize <= 60) {
        boxSize = 60;
    }
    ctx.lineWidth = lineWidth;
    let halfLineWidth = lineWidth / 2;
    let circleRadius = Math.min(boxSize, boxSize) / 15;
    let indicatorCircleRadius = Math.min(boxSize, boxSize) / 8;
    // Loop through rows and columns of the grid
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < columns; j++) {
            let cellNumber = calculateLedNumber(i, j, startX, startY, serpentineDirection, rows, columns);
            let isClicked = clickedCells.includes(cellNumber);
            // Check if the current cell is the start or end point
            let isStartPoint = cellNumber === 1
            let isEndPoint = cellNumber === rows*columns ;
            // Calculate the center and radius of the circle to be drawn for each cell
            let circleCenterX = j * boxSize + boxSize / 2 + halfLineWidth;
            let circleCenterY = i * boxSize + boxSize / 2 + halfLineWidth;


            // Draw the cell with the number
            ctx.beginPath();

            // Change color based on the state
            if (isStartPoint && !isClicked) {
                ctx.arc(circleCenterX, circleCenterY, indicatorCircleRadius, 0, Math.PI * 2);
                ctx.fillStyle = '#198754'; // Change color for start point
            } else if (isEndPoint && !isClicked) {
                ctx.arc(circleCenterX, circleCenterY, indicatorCircleRadius, 0, Math.PI * 2);
                ctx.fillStyle = '#dc3545'; // Change color for end point
            } else {
                ctx.arc(circleCenterX, circleCenterY, circleRadius, 0, Math.PI * 2);
                ctx.fillStyle = isClicked ? '#003ef8' : '#ffc107';
            }
            ctx.fill();

        }
    }
}



function TestLights() {
    const selectedEspIndex = selectEspDropdown.selectedIndex;
    const selectedEsp = selectEspDropdown.options[selectedEspIndex];
    if (selectedEsp.disabled) {
        // Nothing is selected or "Please add an ESP device first..." is selected, so we can't proceed
        alert("Please select an ESP to Test.");
        return;
    }
    const ip = selectedEsp.dataset.espIp;
    const data = {};
    data[ip] = clickedCells;
    fetch('/test_lights', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
        .then(response => response.json())
        .then()
        .catch((error) => {
            console.error('Error:', error);
        });
}


function clearAll() {
    clickedCells.length = 0;
    selectedCells.length = 0;
    // Clear the stored data in the 'led_positions' key
    localStorage.removeItem('led_positions');
    const selectEspDropdown = document.getElementById('item_esp_select');
    const rows = selectEspDropdown.options[selectEspDropdown.selectedIndex].getAttribute("data-esp-rows");
    const columns = selectEspDropdown.options[selectEspDropdown.selectedIndex].getAttribute("data-esp-columns");
    let startX = selectEspDropdown.options[selectEspDropdown.selectedIndex].getAttribute("data-esp-start-x").toLowerCase();
    const startY = selectEspDropdown.options[selectEspDropdown.selectedIndex].getAttribute("data-esp-start-y").toLowerCase();
    let serpentineDirection = selectEspDropdown.options[selectEspDropdown.selectedIndex].getAttribute("data-esp-serpentine").toLowerCase();
    if (startX == 1) {
        startX = "right";
    }
    if (serpentineDirection == 1) {
        serpentineDirection =  "vertical";
    }
    redrawGrid(parseInt(rows), parseInt(columns), "item", startX, startY, serpentineDirection);
}

function submitLights() {
    localStorage.removeItem('led_positions');
    // Retrieve existing LED positions from localStorage
    let savedData = JSON.parse(localStorage.getItem('led_positions')) || [];

    // Save LED positions to localStorage
    savedData = savedData.concat(clickedCells.sort());
    // Save updated data back to localStorage
    localStorage.setItem('led_positions', JSON.stringify(savedData));
}

document.getElementById('test_led_button').addEventListener('click',TestLights);
document.getElementById('clear_led_button').addEventListener('click',clearAll);


function convertLedNumber(ledNumber, startX, startY, serpentineDirection, rows, columns) {
    let row, column;

    // Convert LED number to zero-based index
    const index = ledNumber - 1;

    if (serpentineDirection === "horizontal") {
        // Handle horizontal serpentine direction
        row = Math.floor(index / columns);
        column = (row % 2 === 0) ? (index % columns) : (columns - 1 - (index % columns));
    } else { // serpentineDirection === "vertical"
        // Handle vertical serpentine direction
        column = Math.floor(index / rows);
        row = (column % 2 === 0) ? (index % rows) : (rows - 1 - (index % rows));
    }

    // Adjust for starting positions
    if (startX === "right") {
        column = columns - 1 - column;
    }
    if (startY === "bottom") {
        row = rows - 1 - row;
    }
    ledNumber = row * columns + column;

    return  ledNumber;
}




// ---------------------------------------------------------------------------
// Uneven drawer layouts, e.g. a box with 5 rows of 6 drawers and 2 rows of 3.
// A layout is a list of drawer counts per "lane": rows (top to bottom) for
// horizontal serpentine, columns (left to right) for vertical serpentine.
// Each lane is split into equal-width cells, so wider drawers get wider cells.
// Numbers follow the physical strip order, so the backend maps LED n -> n-1.
// ---------------------------------------------------------------------------
let layoutCells = null;

function parseRowLayout(value) {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    if (text === "") return null;
    const parts = text.split(/[,;]/).map(p => p.trim()).filter(p => p !== "");
    if (parts.length === 0) return null;
    const counts = parts.map(Number);
    if (counts.some(n => !Number.isInteger(n) || n <= 0)) return null;
    return counts;
}

function getSelectedEspLayout() {
    const select = document.getElementById('item_esp_select');
    if (!select || select.selectedIndex < 0) return null;
    const option = select.options[select.selectedIndex];
    return option ? parseRowLayout(option.dataset.espLayout) : null;
}

// Returns [{lane, slot, number}] where lane/slot are visual indices
// (lane: row top->bottom or column left->right; slot: position within the lane).
function computeLayoutNumbers(layout, startX, startY, serpentineDirection) {
    const horizontal = serpentineDirection !== "vertical";
    // The first lane visited and the direction of the first lane
    const laneFromEnd = horizontal ? startY === "bottom" : startX === "right";
    const slotFromEnd = horizontal ? startX === "right" : startY === "bottom";
    const laneOrder = layout.map((_, i) => i);
    if (laneFromEnd) laneOrder.reverse();

    const cells = [];
    let number = 1;
    laneOrder.forEach((lane, visit) => {
        const count = layout[lane];
        const reversed = (visit % 2 === 0) ? slotFromEnd : !slotFromEnd;
        for (let k = 0; k < count; k++) {
            const slot = reversed ? count - 1 - k : k;
            cells.push({ lane, slot, number: number++ });
        }
    });
    return cells;
}

function drawLayoutGrid(mode, layout, startX, startY, serpentineDirection) {
    startX = (startX == 1 || startX === "right") ? "right" : String(startX || "left").toLowerCase();
    startY = String(startY || "top").toLowerCase();
    serpentineDirection = (serpentineDirection == 1 || serpentineDirection === "vertical") ? "vertical" : "horizontal";

    const container = document.getElementById(mode + '-canvas-container');
    const cvs = document.getElementById(mode + '-responsive-canvas');
    const ctx = cvs.getContext('2d');
    const theme = localStorage.getItem('theme');
    const lineWidth = 2;
    const horizontal = serpentineDirection === "horizontal";
    const maxCount = Math.max(...layout);
    const lanes = layout.length;

    const style = window.getComputedStyle(container);
    const width = Math.max(container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight), 120);
    // Size so that the smallest cell is at least 40px
    let unit = (width - lineWidth) / (horizontal ? maxCount : lanes);
    unit = Math.max(unit, 40);
    const totalW = unit * (horizontal ? maxCount : lanes);
    const totalH = unit * (horizontal ? lanes : maxCount);
    cvs.width = totalW + lineWidth;
    cvs.height = totalH + lineWidth;
    container.style.overflowX = cvs.width > container.clientWidth ? 'scroll' : '';

    const numbered = computeLayoutNumbers(layout, startX, startY, serpentineDirection);
    const half = lineWidth / 2;
    layoutCells = numbered.map(c => {
        const count = layout[c.lane];
        let x, y, w, h;
        if (horizontal) {
            w = totalW / count; h = unit;
            x = c.slot * w; y = c.lane * unit;
        } else {
            w = unit; h = totalH / count;
            x = c.lane * unit; y = c.slot * h;
        }
        return { ...c, x: x + half, y: y + half, w, h };
    });

    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.setLineDash([]);
    ctx.lineWidth = lineWidth;

    // Cell borders
    ctx.strokeStyle = "#6c757d";
    layoutCells.forEach(c => ctx.strokeRect(c.x, c.y, c.w, c.h));

    // Wiring path in strip order
    const ordered = [...layoutCells].sort((a, b) => a.number - b.number);
    ctx.strokeStyle = "#0d6efd";
    ctx.beginPath();
    ordered.forEach((c, i) => {
        const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
        if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
    });
    ctx.stroke();

    const minSide = Math.min(...layoutCells.map(c => Math.min(c.w, c.h)));
    const dot = minSide / 15;
    const marker = minSide / 8;
    const total = layoutCells.length;
    ctx.font = `${minSide / 5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    layoutCells.forEach(c => {
        const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
        const isClicked = mode === "item" && clickedCells.includes(c.number);
        ctx.beginPath();
        if (c.number === 1 && !isClicked) {
            ctx.arc(cx, cy, marker, 0, Math.PI * 2);
            ctx.fillStyle = '#198754';
        } else if (c.number === total && !isClicked) {
            ctx.arc(cx, cy, marker, 0, Math.PI * 2);
            ctx.fillStyle = '#dc3545';
        } else {
            ctx.arc(cx, cy, isClicked ? marker : dot, 0, Math.PI * 2);
            ctx.fillStyle = isClicked ? '#003ef8' : '#ffc107';
        }
        ctx.fill();
        ctx.fillStyle = theme === 'dark' ? 'white' : 'black';
        ctx.fillText(String(c.number), cx + minSide / 5, cy - minSide / 5);
    });
}
