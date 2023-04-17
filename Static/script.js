const form = document.getElementById("add-form");
const itemList = document.getElementById("item-list");

// Add item to list
function addItem(event) {
  event.preventDefault();

  const name = document.getElementById("name").value;
  const link = document.getElementById("link").value;
  const image = document.getElementById("image").value;
  const position = document.getElementById("position").value;

  const item = { name, link, image, position };

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
    })
    .catch((error) => console.error(error));
}

// Edit item
function editItem(item) {
  const name = prompt("Enter a new name:", item.name);
  const link = prompt("Enter a new link:", item.link);
  const image = prompt("Enter a new image URL:", item.image);
  const position = prompt("Enter a new position:", item.position);

  const updatedItem = { ...item, name, link, image, position };

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
  locateBtn.addEventListener("click", () => {
    fetch(`/api/items/${item.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ action: "locate" }),
    }).catch((error) => console.error(error));
  });
  return locateBtn;
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

  const img = document.createElement("img");
  img.src = item.image;
  li.appendChild(img);

  const div = document.createElement("div");
  li.appendChild(div);

  const h2 = document.createElement("h2");
  h2.innerText = item.name;
  div.appendChild(h2);

  const p = document.createElement("p");
  const a = document.createElement("a");
  a.href = item.link;
  a.target = "_blank";
  a.innerText = "Visit Website";
  p.appendChild(a);
  div.appendChild(p);

  const span = document.createElement("span");
  const positionLabel = document.createElement("strong");
  positionLabel.innerText = "Position: ";
  span.appendChild(positionLabel);
  span.append(item.position);
  div.appendChild(span);

  const deleteButton = document.createElement('button');
  deleteBtn.innerText = "Delete";
  deleteBtn.addEventListener("click", () => deleteItem(item.id));
  div.appendChild(deleteBtn);

  const editBtn = createEditButton(item);
  div.appendChild(editBtn);

  const locateBtn = createLocateButton(item);
  div.appendChild(locateBtn);

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

// Delete item from server and list
function deleteItem(id) {
  fetch(`/api/items/${id}`, { method: "DELETE" })
    .then(() => {
      const li = itemList.querySelector(`li[data-id="${id}"]`);
      li.parentNode.removeChild(li);
    })
    .catch((error) => console.error(error));
}

form.addEventListener("submit", addItem);
loadItems();
