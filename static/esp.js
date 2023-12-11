

const ESPformContainer = document.getElementById("esp-form");
const selectEspDropdown = document.getElementById("select_esp");
const addEspButton = document.getElementById("add-esp");
const delEspButton = document.getElementById("delete-esp");
const EspButton = document.getElementById("btn-esp");

// Flag to track whether we are editing an existing ESP or adding a new one
let isEditing = false;
let editingEspId = null; // Track the ID of the ESP being edited

function addEsp(event) {
    event.preventDefault();

    const name = document.getElementById("esp_name").value;
    const esp_ip = document.getElementById("esp_ip").value;
    const rows = document.getElementById("rows").value; // Assuming you have an input with id 'rows'
    const cols = document.getElementById("cols").value; // Assuming you have an input with id 'cols'
    const startTop = document.getElementById("start_top").value; // Assuming you have an input with id 'start_top'
    const startLeft = document.getElementById("start_left").value; // Assuming you have an input with id 'start_left'
    const serpentineDirection = document.getElementById("serpentine_direction").value; // Assuming you have an input with id 'serpentine_direction'

    const espItem = { 
        name,
        esp_ip, 
        rows, 
        cols, 
        startTop, 
        startLeft, 
        serpentineDirection,
    };
    // Check if we are editing an existing ESP or adding a new one
    if (isEditing) {
        // We are editing, so send a PUT request to update the existing ESP
        fetch(`/api/esp/${editingEspId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(espItem),
        })
            .then((response) => response.json())
            .then((data) => {
                ESPformContainer.reset();
                populateSelectEspDropdown();
                isEditing = false; // Reset the editing flag
                toggleESPForm();
                addEspButton.innerHTML = "Save Changes"; // Change the button text back to "Add ESP"
            })
            .catch((error) => console.error(error));
    } else {
        // We are adding a new ESP, so send a POST request
        fetch("/api/esp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(espItem),
        })
            .then((response) => response.json())
            .then((data) => {
                console.log("ESP item added:", data);
                ESPformContainer.reset();
                toggleESPForm();
                populateSelectEspDropdown();
            })
            .catch((error) => console.error(error));
    }
}


function toggleESPForm() {
    const formContainer = document.getElementById("esp-container");

    if (formContainer.style.display === "block") {
        formContainer.style.display = "none";
        EspButton.innerHTML = "Add ESP";
    } else {
        formContainer.style.display = "block";
        EspButton.innerHTML = "Close";
    }
}


function resetDropdown () {
    const selectedEspId = selectEspDropdown.value;

    if (selectedEspId !== "add") {
        isEditing = true; // We are editing an existing ESP
        editingEspId = selectedEspId; // Store the ID of the ESP being edited
        addEspButton.innerHTML = "Save Changes"; // Change the button text to "Save"
        delEspButton.style.display = "block"; // Show the "Delete" button

        fetch(`/api/esp/${selectedEspId}`)
            .then((response) => response.json())
            .then((espData) => {
                document.getElementById("esp_name").value = espData.name || '';
                document.getElementById("esp_ip").value = espData.esp_ip || '';
                document.getElementById("rows").value = espData.rows || '';
                document.getElementById("cols").value = espData.cols || '';
                document.getElementById("start_top").value = espData.start_top || '';
                document.getElementById("start_left").value = espData.start_left || '';
                document.getElementById("serpentine_direction").value = espData.serpentine_direction || '';
                // ... any other fields you need to populate
            })
            .catch((error) => console.error(error));
    } else {
        // Clear the input fields when "Add ESP" is selected
        document.getElementById("esp_ip").value = "";
       // updateSegmentSizeOutput();
        isEditing = false; // Reset the editing flag
        addEspButton.innerHTML = "Add"; // Change the button text back to "Add ESP"
        delEspButton.style.display = "none"; // Hide the "Delete" button
    }
}
function populateSelectEspDropdown() {
    const selectEspDropdown = document.getElementById("select_esp");

    // Clear the existing options
    selectEspDropdown.innerHTML = "";

    // Add a default option (e.g., "Select ESP")
    const defaultOption = document.createElement("option");
    defaultOption.value = "add";
    defaultOption.textContent = "Add ESP";
    selectEspDropdown.appendChild(defaultOption);

    // Fetch and populate the ESP options
    fetch("/api/esp")
        .then((response) => response.json())
        .then((data) => {
            data.forEach((esp) => {
                const option = document.createElement("option");
                option.value = esp.id;
                option.textContent = esp.name;
                selectEspDropdown.appendChild(option);
            });
        })
        .catch((error) => console.error(error));
}

// Call the function to populate the "select_esp" dropdown when needed
selectEspDropdown.addEventListener("change", resetDropdown);
populateSelectEspDropdown();
EspButton.addEventListener("click", () => {
    selectEspDropdown.selectedIndex = 0;
    populateSelectEspDropdown();
    //updateSegmentSizeOutput();
    resetDropdown();
    toggleESPForm();
});

addEspButton.addEventListener("click", addEsp);
//document.getElementById("segment_size").addEventListener("input", updateSegmentSizeOutput);
function deleteESP() {
    // Get the selected ESP ID
    const selectedEspIndex = selectEspDropdown.selectedIndex;
    if (selectedEspIndex < 1) {
        // Nothing is selected or "Add ESP" is selected, so we can't delete
        alert("Please select an ESP to delete.");
        return;
    }

    const selectedOption = selectEspDropdown.options[selectedEspIndex];
    const esp_id = selectedOption.value;
    const esp_ip = selectedOption.textContent;

    // Ask for confirmation
    const response = confirm(`Are you sure you want to delete ${esp_ip}?`);
    if (response) {
        // Delete item from the database
        fetch(`/api/esp/${esp_id}`, { method: "DELETE" })
            .then(() => {
                ESPformContainer.reset();
                toggleESPForm();
                populateSelectEspDropdown();
                // Reset the form to "Add ESP" mode
                isEditing = false;
                addEspButton.innerHTML = "Add ESP";
            })
            .catch((error) => console.error(error));
    }
}
delEspButton.addEventListener("click", deleteESP);
