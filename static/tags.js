const input = document.getElementById('item_tags');
const maxSelectedTags  = 10
const sortTagsDropdown = document.getElementById('sort_tags');
let tags = [];

const tagify = new Tagify(input, {
    whitelist: [],
    dropdown: {
        enabled: 0
    },
    duplicates: true, // Allow duplicate tags
    maxTags: maxSelectedTags // Set a maximum limit for tags (adjust as needed)
});

tagify.on('add', onTagAdded);

function onTagAdded(e) {

    const tagsArray = tagify.value.map(tagData => tagData.value);
    localStorage.removeItem('item_tags');
    // Save the tags to localStorage
    localStorage.setItem('item_tags', JSON.stringify(tagsArray));
    console.log(localStorage.getItem('item_tags'));
}

function filterItemsByTags(items, filter){
    Array.from(items).forEach((item) => {
        const itemTags = item.dataset.tags;
        const cleanedTags = itemTags.replace(/[\[\]'"`]/g, ''); // Remove square brackets, single quotes, double quotes, and backticks
        const itemTagsArray = cleanedTags.split(',');
        let shouldDisplay = true;
        if (filter.length > 0) {
            // Check if all filters are present in itemTagsArray
            filter.forEach(searchText => {
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
                TagData.forEach(({ tag, count }) => {
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

    Array.from(items).forEach((item) => {
        const itemTags = item.dataset.tags;
        const cleanedTags = itemTags.replace(/[\[\]'"`]/g, ''); // Remove square brackets, single quotes, double quotes, and backticks
        const itemTagsArray = cleanedTags.split(',');
        let shouldDisplay = true;
        const searchTextLower = filter.toLowerCase();
        shouldDisplay = itemTagsArray.some(itemTag => itemTag.toLowerCase().includes(searchTextLower));
        if (shouldDisplay) {
            item.style.display = "flex";
        } else {
            item.style.display = "none";
        }
    });

}
function populateSortTagsMenu(tagDataArray) {
    const sortTagsMenu = document.getElementById('sort_tags');

    // Clear existing menu items
    sortTagsMenu.innerHTML = '';
    const listItem = document.createElement('li');
    const anchor = document.createElement('a');
    anchor.classList.add('dropdown-item');
    anchor.href = '#';
    anchor.innerText = "Clear Tags";
    anchor.onclick = function () {
        // Handle the click event for sorting by tag
        sortItemsByTag("");
    };
    listItem.appendChild(anchor);
    sortTagsMenu.appendChild(listItem);
    // Create and append menu items for each tag
    tagDataArray.forEach(({ tag }) => {
        const listItem = document.createElement('li');
        const anchor = document.createElement('a');
        anchor.classList.add('dropdown-item');
        anchor.href = '#';
        anchor.innerText = tag;
        anchor.onclick = function () {
            // Handle the click event for sorting by tag
            sortItemsByTag(tag);
        };

        listItem.appendChild(anchor);
        sortTagsMenu.appendChild(listItem);
    });
}


sortTagsDropdown.addEventListener('change', function() {
    const selectedOptions = Array.from(this.selectedOptions).map(option => option.value);
    // Call your sort function with the selected options
    sortItemsByTag(selectedOptions);
});
fetchDataAndLoadTags();
