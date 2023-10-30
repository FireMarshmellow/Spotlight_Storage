const itemList = document.getElementById("item-list");

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

// Edit item
function editItem(item) {
  const name = prompt("Enter a new name:", item.name) ?? item.name;
  const link = prompt("Enter a new link:", item.link) ?? item.link;
  const image = prompt("Enter a new image URL:", item.image) ?? item.image;
  const position = prompt("Enter a new position:", item.position) ?? item.position;
  const quantity = prompt("Enter a new quantity:", item.quantity) ?? item.quantity;
  const ip = prompt("Enter a new quantity:", item.ip) ?? item.ip;

  const updatedItem = { ...item, name, link, image, position, quantity, ip };

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
  editBtn.addEventListener("click", () => editItem(item));
  return editBtn;
}

// Locate item
function locateItem(item) {
  console.log(`Position of ${item.name}: ${item.position}`);
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
  removeQuantityBtn.addEventListener("click", () => {
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
  a.innerText = "Buy More";
  p.appendChild(a);
  div.appendChild(p);

  const span = document.createElement("span");
  const positionLabel = document.createElement("strong");
  positionLabel.innerText = "Position: ";
  span.appendChild(positionLabel);
  span.append(item.position);
  div.appendChild(span);

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
