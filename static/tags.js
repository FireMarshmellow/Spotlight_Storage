const addTagIcon  = document.getElementById('add_form_tag_toggle');
const filterIcon = document.getElementById('filter_tag_toggle');
const clearFilter = document.getElementById('filter_tag_clear');
const tagContainer = document.getElementById('add_form_tag_container');
const tagContainerOverflow = document.getElementById('add_form_tag_container_overflow');
const filterTagContainerOverflow = document.getElementById('filter_tag_container_overflow');
const filterTagContainer = document.getElementById('filter_tag_container');
const input = document.getElementById('tag-input');
const maxSelectedTags  = 10
const overflowSizeTags  = 6
let tags = [];



function resetTagSelection(container) {
    const allTags = container.querySelectorAll('.tag');
    allTags.forEach((tag) => {
        tag.classList.remove('selected');
    });
    updateTagSelection(container)
}

function loadTagSelection(itemTagsArray){

    const allTags = Array.from(tagContainer.getElementsByClassName('tag'));
    allTags.forEach(tagElement => {
        const tag = tagElement.innerHTML;
        // Check if the tag is in itemTagsArray
        if (itemTagsArray.includes(tag)) {
            tagElement.classList.add('selected');
            const selectedTags = updateTagSelection(tagContainer);
            if(selectedTags.length>=overflowSizeTags ){
                const computedStyle = window.getComputedStyle(tagContainerOverflow);
                if (computedStyle.display === "none") {
                    tagContainerOverflow.classList.toggle('hidden');
                    addTagIcon .innerHTML = 'filter_list_off';
                }

            }

        }
    });
}


function updateTagSelection(container) {
    const allTags = Array.from(container.getElementsByClassName('tag'));
    const selectedTags = [];
    let tag = "";
    // Iterate through all tags
    allTags.forEach(tagElement => {
        if(container === tagContainer){
            tag = tagElement.innerHTML;}else{
            tag = tagElement.querySelector('span').getAttribute('data-item')
        }
        // Check if the tag is selected
        if (tagElement.classList.contains('selected')) {
            selectedTags.push(tag);

            tagElement.style.backgroundColor = '#006e11'; // Dark blue background color for selected tags
        } else {
            tagElement.style.backgroundColor = ''; // Reset background color for unselected tags
        }
    });

    if(selectedTags.length > 0 && container === filterTagContainer){
        clearFilter.style.display = "block";
    }if(selectedTags.length <= 0 && container === filterTagContainer)
    {
        clearFilter.style.display = "none";
    }
    localStorage.removeItem('item_tags');
    localStorage.setItem('item_tags', JSON.stringify(selectedTags));
    return selectedTags


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
                    createAndAppendTag(tag, count);
                    tags.push(tag);
                });
            }
        })
        .catch((error) => console.error(error));
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


function createAndAppendTag(tag, count){
    const FilterTag = document.createElement('div');
    FilterTag.classList.add('tag');
    FilterTag.innerHTML = tag;
    const div = document.createElement('div');
    div.classList.add('tag');
    div.innerHTML = tag;
    const TagCount = document.createElement('span');
    TagCount.setAttribute('data-item', tag);
    TagCount.innerHTML = count;
    TagCount.classList.add("text-stone-900")
    TagCount.style.marginLeft = '10px';
    FilterTag.appendChild(TagCount);
    if(tags.length >= overflowSizeTags +1) {
        filterTagContainerOverflow.appendChild(FilterTag);
        tagContainerOverflow.appendChild(div);

    }else{
        filterTagContainer.appendChild(FilterTag);
        tagContainer.appendChild(div);}

    if (filterTagContainerOverflow.childElementCount > 0) {
        filterTagContainer.appendChild(filterTagContainerOverflow);
    }
    if (tagContainerOverflow.childElementCount >0) {
        tagContainer.appendChild(tagContainerOverflow);
    }


}

function removeAllTags(){
    document.querySelectorAll('.tag').forEach(function (tag)
    {
        tag.parentElement.removeChild(tag);
    })
    tags = [];
}

tagContainer.addEventListener('click', (event) => {
    const tagElement = event.target.closest('.tag');
    if (tagElement) {
        let selectedTags = updateTagSelection(tagContainer);

        if(selectedTags.length <=maxSelectedTags  || tagElement.classList.contains('selected')){
            // Toggle the 'selected' class for the clicked tag
            tagElement.classList.toggle('selected');
            selectedTags= updateTagSelection(tagContainer);
            localStorage.setItem('item_tags', JSON.stringify(selectedTags));
        }
        else{
            alert("Maximum of selected tags reached.");
        }
    }
});

filterTagContainer.addEventListener('click', (event) => {
    localStorage.removeItem('item_tags');
    const tagElement = event.target;

    if (tagElement.classList.contains('tag')) {
        // Toggle the 'selected' class for the clicked tag
        tagElement.classList.toggle('selected');
        const filter = updateTagSelection(filterTagContainer);
        const items = Array.from(itemList.children);
        filterItemsByTags(items,filter);
    }
});


input.addEventListener('keyup', function (e){
    if (e.key === 'Enter' && input.value !=='') {
        const computedStyle = window.getComputedStyle(tagContainerOverflow);
        if (computedStyle.display === "none" && tags.length >= overflowSizeTags ) {
            // Toggle the visibility of the tag container
            tagContainerOverflow.classList.toggle('hidden');
        }
        const newTag = input.value;
        tags.push(newTag);
        createAndAppendTag(newTag, 1);
        const newTagElement = tagContainer.querySelector('.tag:last-child'); // Assuming this selects the newly created tag
        newTagElement.classList.toggle('selected');
        const selectedTags = updateTagSelection(tagContainer);
        localStorage.setItem('item_tags', JSON.stringify(selectedTags));
        input.value = '';
    }
})


fetchDataAndLoadTags();


addTagIcon .addEventListener('click', function () {
    const computedStyle = window.getComputedStyle(tagContainerOverflow);
    if (computedStyle.display === "none") {
        tagContainerOverflow.classList.toggle('hidden');
        addTagIcon .innerHTML = 'filter_list_off';
    }
    else{
        tagContainerOverflow.classList.toggle('hidden');
        addTagIcon .innerHTML ='filter_list';
    }
});

filterIcon.addEventListener('click', function () {
    const computedStyle = window.getComputedStyle(filterTagContainerOverflow);
    if (computedStyle.display === "none") {
        filterTagContainerOverflow.classList.toggle('hidden');
        filterIcon.innerHTML = 'filter_list_off';
    }
    else{
        filterTagContainerOverflow.classList.toggle('hidden');
        filterIcon.innerHTML ='filter_list';
    }
});

clearFilter.addEventListener('click', function (){
    resetTagSelection(filterTagContainer)
    const filter = updateTagSelection(filterTagContainer);
    const items = Array.from(itemList.children);
    filterItemsByTags(items,filter);
})