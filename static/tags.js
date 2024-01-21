const input = document.getElementById('item_tags');
const maxSelectedTags  = 10
const sortTagsDropdown = document.getElementById('sort_tags');
let tags = [];
let filterTags = []
const tagify = new Tagify(input, {
    whitelist: [],
    dropdown: {
        enabled: 0
    },
    duplicates: true, // Allow duplicate tags
    maxTags: maxSelectedTags // Set a maximum limit for tags (adjust as needed)
});

tagify.on('add', SubmitTags);

function SubmitTags() {
    const tagsArray = tagify.value.map(tagData => tagData.value);
    localStorage.removeItem('item_tags');
    // Save the tags to localStorage
    localStorage.setItem('item_tags', JSON.stringify(tagsArray));
}

function fetchDataAndLoadTags() {
    // Fetch the settings from the server
    fetch("/api/tags")
        .then((response) => response.json())
        .then((TagData) => {
            // Check if the tags have changed
            if (!areTagsEqual(TagData)) {
                // Reset tags and local storage
                removeAllTags();
                localStorage.removeItem('item_tags');
                // Create and display new tags
                TagData.forEach(({ tag }) => {
                    tags.push(tag);

                });
                populateSortTagsMenu(TagData);
                tagify.settings.whitelist = tags.map(tag => ({ value: tag }));
                tagify.dropdown.show.call(tagify, input);
            }
        })
        .catch((error) => console.error(error));
}

function loadTagsIntoTagify() {
    const tagObjects = tags.map(tag => ({ value: tag }));
    tagify.loadOriginalValues(tagObjects);
}



// Function to check if the tags are equal
function areTagsEqual(newTags) {
    // Check if lengths are different
    if (tags.length !== newTags.length) {
        return false;
    }

    // Check if each tag is the same
    for (let i = 0; i < tags.length; i++) {
        if (tags[i] !== newTags[i].tag) {
            return false;
        }
    }

    // Tags are equal
    return true;
}

function removeAllTags(){
    tags = [];
}

function sortItemsByTag(filter) {
    const itemsContainer = document.getElementById('items-container-grid');
    const items = Array.from(itemsContainer.children);
    if(filter === ""){
        filterTags = [];
    }else{
        if (!filterTags.includes(filter)){
            filterTags.push(filter);
        }
        else{
            filterTags.splice(filterTags.indexOf(filter), 1);
        }
    }
    toggleSelectedClass();
    Array.from(items).forEach((item) => {
        const itemTags = item.dataset.tags;
        const cleanedTags = itemTags.replace(/[\[\]'"`]/g, ''); // Remove square brackets, single quotes, double quotes, and backticks
        const itemTagsArray = cleanedTags.split(',');
        let shouldDisplay = true;
        if (filterTags.length > 0) {
            // Check if all filters are present in itemTagsArray
            filterTags.forEach(searchText => {
                const searchTextLower = searchText.toLowerCase();

                if (!itemTagsArray.some(itemTag => itemTag.toLowerCase().includes(searchTextLower))) {
                    shouldDisplay = false;
                }
            });
        }
        if (shouldDisplay) {
            item.style.display = "flex";
        } else {
            item.style.display = "none";
        }
    });

}
function createSortMenuItem(text, onClickHandler, count) {
    const listItem = document.createElement('li');
    const anchor = document.createElement('a');
    const div = document.createElement('div');
    anchor.dataset.filter = text;
    anchor.classList.add('dropdown-item');
    anchor.href = '#';
    if (text === "Clear Tags") {
        anchor.innerHTML = '<span class="icon-n4px"><i data-lucide="x" class="me-2"></i>Clear Tags</span>';
        anchor.classList.add('disabled')
    } else {
        anchor.innerHTML = `${text} <span class="tag-count" style="color: #888;">(${count})</span>`;
    }
    div.classList.add('dropdown-divider');
    anchor.onclick = onClickHandler;
    listItem.appendChild(anchor);
    if( text === "Clear Tags") {
        listItem.appendChild(div);
    }
    return listItem;
}

function populateSortTagsMenu(tagDataArray) {
    const sortTagsMenu = document.getElementById('sort_tags');

    // Clear existing menu items
    sortTagsMenu.innerHTML = '';
    // Add "Clear Tags" menu item
    sortTagsMenu.appendChild(createSortMenuItem("Clear Tags", () => sortItemsByTag("")));

    // Create and append menu items for each tag
    tagDataArray.forEach(({ tag, count }) => {
        sortTagsMenu.appendChild(createSortMenuItem(tag, () => sortItemsByTag(tag), count));
    });
}



// Function to toggle a class on selected options
function toggleSelectedClass() {

    // Get all list items under sortTagsDropdown
    const listItems = Array.from(sortTagsDropdown.querySelectorAll('li'));

    // Remove the "active" class from all options
    listItems.forEach(li => {
        const anchor = li.querySelector('a');
        anchor.classList.remove('active');
    });

    // Find the tags whose text is in the filterTags array and add the "active" class
    listItems.forEach(li => {
        const anchor = li.querySelector('a');
        const anchorText = anchor.getAttribute('data-filter');

        if (filterTags.includes(anchorText) && anchorText !== "Clear Tags") {
            anchor.classList.add('active');
        }
        if (anchorText === "Clear Tags") {
            const shouldDisable = filterTags.length === 0;
            anchor.classList.toggle('disabled', shouldDisable);
        }
    });

}


fetchDataAndLoadTags();





