
document.getElementById("generate_pos").addEventListener("click", generateGrid);
document.getElementById("select_led_container").style.display = "none";
document.getElementById("generate_pos").innerHTML = "Select LEDS";
function generateGrid() {
    const selectedEspIndex = selectEspDropdownIP.selectedIndex;
    if (selectedEspIndex < 1) {
        // Nothing is selected or "Add ESP" is selected, so we can't delete
        alert("Please select an ESP");
        return;
    }

    let positionArray = [];

    // Get the selected ESP ID from the dropdown
    const espId = document.getElementById("ip").value;

    // Fetch both sets of data concurrently
    Promise.all([
        // Fetch data from the API using editingItemId
        editingItemId !== null && isEditingItem ?
            fetch(`/api/items/${editingItemId}`)
                .then(response => response.json())
                .then(data => {
                    let positionString = data.position;
                    positionString = positionString.replace('[', '').replace(']', '');
                    positionArray = positionString.split(',').map(Number).filter(num => !isNaN(num));
                }) :
            Promise.resolve(), // Resolve immediately if no editingItemId

        // Fetch ESP data
        fetch(`/api/esp/${espId}`)
            .then(response => response.json())
            .then(data => {
                // Process ESP data and generate the grid
                const rows = parseInt(data.rows);
                const cols = parseInt(data.cols);
                const startY = data.start_y === 'top';
                const startX = data.start_x === 'left';
                const serpentine = data.serpentine_direction === 'horizontal';
                const gridContainer = document.getElementById('gridContainer') ?? 4;

                if(JSON.parse(localStorage.getItem('led_positions'))){
                    positionArray = JSON.parse(localStorage.getItem('led_positions'))
                }
                gridContainer.innerHTML = ''; // Clear existing grid
                gridContainer.style.gridTemplateColumns = `repeat(${cols}, 30px)`; // Adjust column size

                // Generate checkboxes with alternating patterns
                for (let row = startY ? 1 : rows; startY ? row <= rows : row > 0; startY ? row++ : row--) {
                    for (let colum = startX ? 0 : cols - 1; startX ? colum < cols : colum >= 0; startX ? colum++ : colum--) {
                        // Calculate LED number based on row and column
                        const col = colum + 1;
                        const isEvenColumn = col % 2 === 0;
                        const isEvenRow = row % 2 === 0;
                        let ledNumber;
                        if (serpentine) {
                            if (isEvenRow) {
                                ledNumber = row * cols - (cols - (cols - col)) + 1;
                            } else {
                                ledNumber = row * cols - (cols - col);
                            }
                        } else {
                            if (isEvenColumn) {
                                ledNumber = (col) * rows - (rows - (rows - row)) + 1;
                            } else {
                                ledNumber = (col) * rows - (rows - row);
                            }
                        }
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.id = 'led' + ledNumber;
                        checkbox.name = 'ledPositions';
                        checkbox.value = ledNumber;
                        checkbox.classList.add('bigger-checkbox');
                        if (isEditing === false && positionArray.includes(ledNumber)) {
                            checkbox.checked = true;
                        }
                        const cell = document.createElement('div');
                        cell.className = 'grid-cell';
                        cell.appendChild(checkbox);
                        gridContainer.appendChild(cell);
                    }
                }

            })
            .catch((error) => {
                console.error('Error fetching ESP data:', error);
            })
    ]);
}

function TestLights() {
    const selectedEspIndex = selectEspDropdownIP.selectedIndex;
    if (selectedEspIndex < 1) {
        // Nothing is selected or "Add ESP" is selected, so we can't delete
        alert("Please select an ESP to Test.");
        return;
    }
    fetch(`/api/esp/${selectedEspIndex}`)
        .then((response) => response.json())
        .then((espData) => {
            console.log(espData);
            const ip = espData.esp_ip;
    const checkboxes = document.querySelectorAll('input[name="ledPositions"]:checked');
    const positions = Array.from(checkboxes).map(cb => parseInt(cb.value, 10));
    const data = {};
    data[ip] = positions;

    fetch('/test_lights', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
        .then(response => response.json())
        .then(data => {
            console.log('Success:', data);
            // Removed alert for success message
        })
        .catch((error) => {
            console.error('Error:', error);
        });});
}

function clearAll() {
    const checkboxes = document.querySelectorAll('input[name="ledPositions"]');
    checkboxes.forEach(cb => cb.checked = false);
    // Clear the stored data in the 'led_positions' key
    localStorage.removeItem('led_positions');
}

function submitLights() {
    const checkboxes = document.querySelectorAll('input[name="ledPositions"]:checked');
    const positions = Array.from(checkboxes).map(cb => parseInt(cb.value, 10));
    localStorage.removeItem('led_positions');
    // Retrieve existing LED positions from localStorage
    let savedData = JSON.parse(localStorage.getItem('led_positions')) || [];

    // Save LED positions to localStorage
    savedData = savedData.concat(positions);
    console.log("savedData LEDS:", savedData); // Get the selected value from the dropdown
    // Save updated data back to localStorage
    localStorage.setItem('led_positions', JSON.stringify(savedData));

    //console.log("Saved Data:", savedData);
    document.getElementById("select_led_container").style.display = "none";
    document.getElementById("generate_pos").innerHTML = "Select LEDS";
}

function toggleGrid() {
    const selectedEspIndex = selectEspDropdownIP.selectedIndex;
    const container = document.getElementById("select_led_container");
    const btn = document.getElementById("generate_pos");
    const checkboxes = document.querySelectorAll('input[name="ledPositions"]:checked');
    const positions = Array.from(checkboxes).map(cb => parseInt(cb.value, 10));
    if (container.style.display === "block") {
        if(positions.length >0) {
            submitLights();
        }
        container.style.display = "none";
        btn.innerHTML = "Select LEDS";
    } else {
        if (selectedEspIndex < 1) {
            return;
        }
        generateGrid();
        container.style.display = "block";
        btn.innerHTML = "Close Selection";
    }
}
