
var currentCompartment = 1; // Default compartment ID
var compartment_count = 4; // Default Compartment Count
function generateGrid() {
    var rows = parseInt(localStorage.getItem("esp_rows"));
    var cols = parseInt(localStorage.getItem('esp_cols'));
    var startTop = localStorage.getItem('esp_startTop')=== 'top';
    var startLeft = localStorage.getItem('esp_startLeft')=== 'left';
    var serpentine = localStorage.getItem('serpentine_direction')=== 'horizontal';
    var gridContainer = document.getElementById('gridContainer') ?? 4;
    console.log("ESP Rows:", rows);
    console.log("ESP Columns:", cols);
    console.log("ESP Start Top:", startTop);
    console.log("ESP Start Left:", startLeft);
    console.log("Serpentine Direction:", serpentine);
    gridContainer.innerHTML = ''; // Clear existing grid

    gridContainer.style.gridTemplateColumns = `repeat(${cols}, 30px)`; // Adjust column size
    // Generate checkboxes with alternating patterns
    for (var row = startTop ? 1 : rows; startTop ? row <= rows : row > 0; startTop ? row++ : row--) {
        for (var colt = startLeft ? 0 : cols-1; startLeft ? colt < cols : colt >= 0; startLeft ? colt++ : colt--) {
            // Calculate LED number based on row and column
            var col = colt +1
            var isEvenColumn = col % 2 === 0;
            var isEvenRow = row % 2 === 0;
            var ledNumber;
            if(serpentine){////////////Calculate horizontal serpentine Position
                if (isEvenRow) {
                    ledNumber = row * cols - (cols - (cols - col)) + 1;
                } else {
                    ledNumber = row * cols - (cols - col);
                }
            }
            else { ////////////Calculate vertical serpentine Position
                if (isEvenColumn) {
                    ledNumber = (col) * rows - (rows - (rows - row)) + 1;

                } else {
                    ledNumber = (col) * rows - (rows - row) ;
                }
            }
            var checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = 'led' + ledNumber;
            checkbox.name = 'ledPositions';
            checkbox.value = ledNumber;
            var cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.appendChild(checkbox);
            gridContainer.appendChild(cell);
        }
    }
    loadLEDPositions();
}

// Function to load LED positions for the current compartment from localStorage
function loadLEDPositions() {
    var savedData = JSON.parse(localStorage.getItem('led_positions')) || {};
    var positions = savedData[currentCompartment] || [];

    // Check the checkboxes based on the loaded positions
    positions.forEach(ledNumber => {
        var checkbox = document.getElementById('led' + ledNumber);
        if (checkbox) {
            checkbox.checked = true;
        }
    });
}


function submitLights() {
    var checkboxes = document.querySelectorAll('input[name="ledPositions"]:checked');
    var positions = Array.from(checkboxes).map(cb => parseInt(cb.value, 10));

    var data = {
        compartment_id: currentCompartment,
        led_positions: positions
    };

    fetch('/control_lights', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
        .then(response => response.json())
        .then(responseData => {
        })
        .catch((error) => {
            console.error('Error:', error);
        });
}

function TestLights() {
    var ip = localStorage.getItem('esp_ip');
    var checkboxes = document.querySelectorAll('input[name="ledPositions"]:checked');
    var positions = Array.from(checkboxes).map(cb => parseInt(cb.value, 10));

    var data = {};
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
        });
}

function clearAll() {
    var checkboxes = document.querySelectorAll('input[name="ledPositions"]');
    checkboxes.forEach(cb => cb.checked = false);
}
function populatepos() {
    compartment_count = parseInt(document.getElementById("compartment_count").value) || 4;
    var selectElement = document.getElementById("position_map");

    // Clear previous options
    selectElement.innerHTML = "";

    // Populate the dropdown with options
    for (var i = 1; i <= compartment_count; i++) {
        var option = document.createElement("option");
        option.value = i;
        option.text = "Compartment " + i;
        selectElement.appendChild(option);
    }
}

// Function to save LED positions to localStorage
function saveLEDPositions() {
    var checkboxes = document.querySelectorAll('input[name="ledPositions"]:checked');
    var positions = Array.from(checkboxes).map(cb => parseInt(cb.value, 10));

    // Save LED positions for the current compartment to localStorage
    var savedData = JSON.parse(localStorage.getItem('led_positions')) || {};
    savedData[currentCompartment] = positions;
    localStorage.setItem('led_positions', JSON.stringify(savedData));
}

// Function to handle compartment change and update the grid
function updateCompartment() {
    saveLEDPositions(); // Save LED positions before changing compartment
    currentCompartment = parseInt(document.getElementById("position_map").value, 10);
    clearAll();
    generateGrid(); // Generate the grid for the new compartment
}
