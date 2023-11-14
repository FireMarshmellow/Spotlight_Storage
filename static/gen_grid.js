
document.getElementById("generate_pos").addEventListener("click", generateGrid);
function generateGrid() {
    const selectedEspIndex = selectEspDropdownIP.selectedIndex;
    if (selectedEspIndex < 1) {
        // Nothing is selected or "Add ESP" is selected, so we can't delete
        alert("Please select an ESP");
        return;
    }
    var espId = document.getElementById("ip").value; // Get the selected ESP ID from the dropdown
    fetch(`/api/esp/${espId}`)
        .then(response => response.json())
        .then(data => {
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
                    if (serpentine) {////////////Calculate horizontal serpentine Position
                        if (isEvenRow) {
                            ledNumber = row * cols - (cols - (cols - col)) + 1;
                        } else {
                            ledNumber = row * cols - (cols - col);
                        }
                    } else { ////////////Calculate vertical serpentine Position
                        if (isEvenColumn) {
                            ledNumber = (col) * rows - (rows - (rows - row)) + 1;
                        } else {
                            ledNumber = (col) * rows - (rows - row);
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
            document.getElementById("select_led_container").style.display = "block"; // Show select_led_container
        })
        .catch((error) => {
            console.error('Error fetching ESP data:', error);
        });
}
function submitLights() {

}


function TestLights() {
    const selectedEspIndex = selectEspDropdownIP.selectedIndex;
    if (selectedEspIndex < 1) {
        // Nothing is selected or "Add ESP" is selected, so we can't delete
        alert("Please select an ESP to Test.");
        return;
    }
    const selectedOption = selectEspDropdownIP.options[selectedEspIndex];
    const ip = selectedOption.textContent;
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

function submitLights() {
    var checkboxes = document.querySelectorAll('input[name="ledPositions"]:checked');
    var positions = Array.from(checkboxes).map(cb => parseInt(cb.value, 10));

    // Retrieve existing LED positions from localStorage
    var savedData = JSON.parse(localStorage.getItem('led_positions')) || [];

    // Save LED positions to localStorage
    savedData = savedData.concat(positions);

    // Save updated data back to localStorage
    localStorage.setItem('led_positions', JSON.stringify(savedData));

    console.log("Saved Data:", savedData);
    document.getElementById("select_led_container").style.display = "none"; // Close select_led_container
}

