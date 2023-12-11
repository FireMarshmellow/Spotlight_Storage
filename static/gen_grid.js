
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

    var positionArray = [];

    // Get the selected ESP ID from the dropdown
    const espId = document.getElementById("ip").value;

    // Fetch both sets of data concurrently
    Promise.all([
        // Fetch data from the API using editingItemId
        editingItemId !== null && isEditingItem ?
            fetch(`/api/items/${editingItemId}`)
                .then(response => response.json())
                .then(data => {
                    var positionString = data.position;
                    positionString = positionString.replace('[', '').replace(']', '');
                    positionArray = positionString.split(',').map(Number).filter(num => !isNaN(num));
                }) :
            Promise.resolve(), // Resolve immediately if no editingItemId

        // Fetch ESP data
        fetch(`/api/esp/${espId}`)
            .then(response => response.json())
            .then(data => {
                // Process ESP data and generate the grid
                var rows = parseInt(data.rows);
                var cols = parseInt(data.cols);
                var startTop = data.start_top === 'top';
                var startLeft = data.start_left === 'left';
                var serpentine = data.serpentine_direction === 'horizontal';
                var gridContainer = document.getElementById('gridContainer') ?? 4;
                gridContainer.innerHTML = ''; // Clear existing grid

                gridContainer.style.gridTemplateColumns = `repeat(${cols}, 30px)`; // Adjust column size

                // Generate checkboxes with alternating patterns
                for (var row = startTop ? 1 : rows; startTop ? row <= rows : row > 0; startTop ? row++ : row--) {
                    for (var colt = startLeft ? 0 : cols - 1; startLeft ? colt < cols : colt >= 0; startLeft ? colt++ : colt--) {
                        // Calculate LED number based on row and column
                        var col = colt + 1
                        var isEvenColumn = col % 2 === 0;
                        var isEvenRow = row % 2 === 0;
                        var ledNumber;
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

function togglegrid() {

    const container = document.getElementById("select_led_container");
    const btn = document.getElementById("generate_pos");
    if (container.style.display === "block") {
        container.style.display = "none";
        btn.innerHTML = "Select LEDS";
        submitLights();
    } else {
        container.style.display = "block";
        btn.innerHTML = "Close Selection";
    }
}
