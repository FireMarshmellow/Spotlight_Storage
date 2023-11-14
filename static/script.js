const form = document.getElementById("add-form");
const itemList = document.getElementById("item-list");
const selectEspDropdownIP = document.getElementById("ip");
let isEditingItem = false;
let editingItemId = null; // Track the ID of the item being edited
// Add item to list
function addItem(event) {
  event.preventDefault();

  const name = document.getElementById("name").value;
  const link = document.getElementById("link").value;
  const image = document.getElementById("image").value;
  const position = localStorage.getItem('led_positions');
  const quantity = document.getElementById("quantity").value;
  const selectedEspDropdown = document.getElementById("ip"); // Get the selected ESP dropdown

  const selectedEspValue = selectedEspDropdown.value;
  console.log("Selected LEDS:", position); // Get the selected value from the dropdown
  if (selectedEspValue === "select") {
    // Check if the user has not selected anything
    alert("Please select an ESP.");
    return;
  }

  // Fetch the IP associated with the selected ESP
  fetch(`/api/esp/${selectedEspValue}`)
      .then((response) => response.json())
      .then((espData) => {
        const ip = espData.esp_ip;
        const item = {
          name,
          link,
          image,
          position,
          quantity,
          ip, // Set the IP as the IP of the selected ESP
        };

        if (isEditingItem) {
          // We are editing, so send a PUT request to update the existing item
          fetch(`/api/items/${editingItemId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
          })
              .then((response) => response.json())
              .then((data) => {
                const li = itemList.querySelector(`li[data-id="${editingItemId}"]`);
                const updatedLi = createItemElement(data);
                itemList.replaceChild(updatedLi, li);
                form.reset();
                toggleAddForm();
                isEditingItem = false; // Reset the editing flag
                document.getElementById("btn-add").innerHTML = "Add item"; // Change the button text back to "Add item"
              })
              .catch((error) => console.error(error));
        } else {
          // Add the item with the correct IP
          fetch("/api/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
          })
              .then((response) => response.json())
              .then((data) => {
                const li = createItemElement(data);
                itemList.appendChild(li);
                form.reset();
                toggleAddForm();
              })
              .catch((error) => console.error(error));
        }
      })
      .catch((error) => console.error(error));
}




function toggleAddForm() {
  const btn = document.getElementById("btn-add");
  const container = document.getElementById("form-container");
  if (container.style.display === "block") {
    container.style.display = "none";
    btn.innerHTML = "Add item";
  } else {
    container.style.display = "block";
    btn.innerHTML = "Close";
  }
}

// Delete item
function deleteItem(item) {
  const response = confirm(`Are you sure you want to delete ${item.name}?`);
  const id = item.id;
  if (response) {
    // Delete item from database
    fetch(`/api/items/${id}`, { method: "DELETE" })
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
  deleteBtn.classList.add(
      "bg-red-500",
      "hover:bg-red-700",
      "h-8",
      "w-full",
      "rounded-md",
      "text-white",
      "text-xs",
      "justify-center",
      "items-center",
      "mx-auto"
  );
  deleteBtn.addEventListener("click", () => deleteItem(item));
  return deleteBtn;
}

// Create edit button
function createEditButton(item) {
  const editBtn = document.createElement("button");
  editBtn.innerText = "Edit";
  editBtn.classList.add(
      "bg-blue-500",
      "hover:bg-blue-700",
      "h-8",
      "w-full",
      "rounded-md",
      "text-white",
      "text-xs",
      "justify-center",
      "items-center",
      "mx-auto"
  );
  editBtn.addEventListener("click", () => {

    document.getElementById("name").value = item.name;
    document.getElementById("link").value = item.link;
    document.getElementById("image").value = item.image;
    document.getElementById("quantity").value = item.quantity;
    const selectedValue = item.ip; // The IP to select
    selectEspDropdownIP.selectedIndex = findIndexByIP(selectedValue);
    toggleAddForm();

    isEditingItem = true;
    editingItemId = item.id;
    document.getElementById("save-item").innerHTML = "Save Changes";
  });

  return editBtn;
}
// Create locate button
function createLocateButton(item) {
  const locateBtn = document.createElement("button");
  locateBtn.innerText = "Locate";
  locateBtn.classList.add(
      "bg-blue-500",
      "hover:bg-blue-700",
      "h-8",
      "w-full",
      "rounded-md",
      "text-white",
      "text-xs",
      "justify-center",
      "items-center",
      "mx-auto"
  );
  locateBtn.addEventListener("click", () => {
    fetch(`/api/items/${item.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ action: "locate" }),
    }).catch((error) => console.error(error));
  });
  return locateBtn;
}

// add quantity
function addQuantity(item) {
  console.log(`Quantity of ${item.name}: ${item.quantity}`);
}

// Create add quantity button
function createAddQuantityButton(item) {
  const addQuantityBtn = document.createElement("button");
  addQuantityBtn.innerText = "+";
  addQuantityBtn.classList.add(
      "bg-blue-500",
      "hover:bg-blue-700",
      "h-8",
      "w-8",
      "rounded-full",
      "text-white",
      "text-lg",
      "font-bold",
      "flex",
      "justify-center",
      "items-center",
      "mx-auto"
  );
  addQuantityBtn.addEventListener("click", () => {
    updatedItem = { ...item, quantity: item.quantity + 1 };
    fetch(`/api/items/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
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
  removeQuantityBtn.innerText = "-";
  removeQuantityBtn.classList.add(
      "bg-blue-500",
      "hover:bg-red-700",
      "h-8",
      "w-8",
      "rounded-full",
      "text-white",
      "text-lg",
      "font-bold",
      "flex",
      "justify-center",
      "items-center",
      "mx-auto"
  );
  removeQuantityBtn.addEventListener("click", () => {
    if (item.quantity > 0) {
      updatedItem = { ...item, quantity: item.quantity - 1 };
      fetch(`/api/items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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

search.addEventListener("input", filterItems);

// Create item element
function createItemElement(item) {
  const li = document.createElement("li");
  li.dataset.id = item.id;
  li.classList.add("item");

  const wrapper = document.createElement("div");
  wrapper.classList.add(
      "bg-gray-100",
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
  img.classList.add("h-32", "w-32", "rounded-lg", "mx-auto");
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
  h2.classList.add("text-lg", "text-slate");
  div.appendChild(h2);

  const p = document.createElement("p");
  const a = document.createElement("a");
  a.href = item.link;
  a.target = "_blank";
  a.innerText = "Nachschub besorgen";
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


document.getElementById("save-item").addEventListener("click", addItem);
document.getElementById("btn-add").addEventListener("click", toggleAddForm);
document.getElementById("btn-add").addEventListener("click", populateEspDropdown);
//Function to Ad ESPs
// Function to add an ESP item

function populateEspDropdown() {
  selectEspDropdownIP.innerHTML = "";
  // Add "Add ESP" option at the first position
  const addEspOption = document.createElement("option");
  addEspOption.value = "select";
  addEspOption.textContent = "Select ESP";
  selectEspDropdownIP.appendChild(addEspOption);
  // Fetch and populate the rest of the options
  fetch("/api/esp")
      .then((response) => response.json())
      .then((data) => {
        data.forEach((esp) => {
          const option = document.createElement("option");
          option.value = esp.id;
          option.textContent = esp.esp_ip;
          selectEspDropdownIP.appendChild(option);
        });
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


// Define a function to populate the "select_esp" dropdown
populateEspDropdown();


