let isLoadingTags = false;
const tagList = document.getElementById('tag-list');
const AddTagIcon = document.getElementById('add_form_tag_toggle');
const filterIcon = document.getElementById('filter_tag_toggle');
const tagContainer = document.getElementById('add_form_tag_container');
const FilterTagContainer = document.getElementById('filter_tag_container');
const input = document.getElementById('tag-input');

let tags = [];
tagContainer.addEventListener('click', (event) => {
    const tagElement = event.target.closest('.tag');

    if (tagElement) {
        // Toggle the 'selected' class for the clicked tag
        tagElement.classList.toggle('selected');
         const selectedTags = applyTagFilter(tagContainer);
        localStorage.setItem('item_tags', JSON.stringify(selectedTags));
    }
});
tagList.addEventListener('click', (event) => {
    localStorage.removeItem('item_tags');
    const tagElement = event.target;

    if (tagElement.classList.contains('tag')) {
        // Toggle the 'selected' class for the clicked tag
        tagElement.classList.toggle('selected');
        const filter = applyTagFilter(tagList);
        const items = Array.from(itemList.children);

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
});
function resetTagSelection() {
    const allTags = tagContainer.querySelectorAll('.tag');
    allTags.forEach((tag) => {
        tag.classList.remove('selected');
    });
    applyTagFilter(tagContainer)
}
function PopulateTagSelection(itemTagsArray){
    const allTags = tagContainer.querySelectorAll('.tag');
    console.log('itemTagsArray', itemTagsArray)
    console.log('allTags', allTags)
    allTags.forEach(tagElement => {
            const tag = tagElement.querySelector('i').getAttribute('data-item');
            console.log('tag', tag)
            // Check if the tag is in itemTagsArray
            if (itemTagsArray.includes(tag)) {
                tagElement.classList.add('selected');
                applyTagFilter(tagContainer);
            }
    });
}
// Updated applyTagFilter to log immediately after tag click
function applyTagFilter(container) {
    const allTags = Array.from(container.getElementsByClassName('tag'));
    const selectedTags = [];
    let tag = "";
    // Iterate through all tags
    allTags.forEach(tagElement => {
        if (container === tagContainer){
             tag = tagElement.querySelector('i').getAttribute('data-item')
        }
        else {
             tag = tagElement.innerHTML;
        }
        // Check if the tag is selected
        if (tagElement.classList.contains('selected') && tag !== 'add_tag') {
            selectedTags.push(tag);

            tagElement.style.backgroundColor = '#1D4ED8FF'; // Dark blue background color for selected tags
        } else {
            tagElement.style.backgroundColor = ''; // Reset background color for unselected tags
        }
    });
    console.log('selectedTags', selectedTags);
    return selectedTags


}
function loadTags() {
    resetTags();
    localStorage.removeItem('item_tags');
    // Fetch the settings from the server
    fetch("/api/tags")
        .then((response) => response.json())
        .then((tags) => {

            // Ensure that tags is an array or convert it to an array
            const tagsArray = Array.isArray(tags) ? tags : [tags];
            tags = tagsArray;
            console.log('Current tags array:', tags);
            tagsArray.forEach((tagData) => {
                isLoadingTags = true
                const  input = createTag(tagData);
                tagContainer.append(input)
                isLoadingTags = false
                tags.push(tagData)
            });

        })
        .catch((error) => console.error(error));

}
function createTag(tagData){
    const { id, tag } = tagData;
    const newTagElement = document.createElement('span');
    newTagElement.classList.add('tag');
    newTagElement.innerHTML = tag;
    newTagElement.id = id;
    tagList.appendChild(newTagElement);
    const div = document.createElement('div');
    div.setAttribute('class', 'tag');
    div.id = id;
    const span = document.createElement('span');
    span.innerHTML = tag;
    const closeBtn = document.createElement('i');
    closeBtn.setAttribute('class', 'material-symbols-outlined');
    closeBtn.setAttribute('data-item', tag);
    closeBtn.setAttribute('data-id', id); // Adding id attribute
    closeBtn.innerHTML = 'close';

    closeBtn.addEventListener('click', function() {
        removeTag(div);
        newTagElement.remove();
    });

    div.appendChild(span);
    tagList.appendChild(div);
    div.appendChild(closeBtn);
    // Save Tag to DB
    if(!isLoadingTags) {
        // Update the tag_save object to use the correct property name
        const tag_save = { tag: tag };
        console.log('save tag:', tag_save);

        fetch("/api/tags", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(tag_save),
        })
            .then((response) => response.json())
            .then((data) => {
                console.log("Tag added:", data);
            })
            .catch((error) => console.error(error));
    }

    return div;
}
function removeTag(tagElement) {
    const id = tagElement.id;
    tagElement.remove();
    tags = tags.filter(tag => tag.id !== id);

    // Delete item from database
    fetch(`/api/tag/${id}`, { method: "DELETE" })
        .then(() => {
            // The tag has been successfully removed from the server
            // Apply any additional logic if needed
        })
        .catch((error) => console.error(error));
}

function resetTags(){
    document.querySelectorAll('.tag').forEach(function (tag)
    {
        tag.parentElement.removeChild(tag);
    })
}
function addTags(tagData){
        const  input = createTag(tagData);
        tagContainer.append(input)
}
input.addEventListener('keyup', function (e){
    if (e.key === 'Enter' && input.value !=='') {
        const computedStyle = window.getComputedStyle(tagContainer);
        if (computedStyle.display === "none") {
            // Toggle the visibility of the tag container
            tagContainer.classList.toggle('hidden');
        }
        const newId = tags.length + 1;
        const newTag = { id: newId, tag: input.value };
        tags.push(newTag);
        addTags(newTag)
        input.value = '';
    }
})
loadTags();
AddTagIcon.addEventListener('click', function () {
    const computedStyle = window.getComputedStyle(tagContainer);
    if (computedStyle.display === "none") {
        tagContainer.classList.toggle('hidden');
        AddTagIcon.innerHTML = 'filter_list_off';
    }
    else{
        tagContainer.classList.toggle('hidden');
        AddTagIcon.innerHTML ='filter_list';
    }
});

filterIcon.addEventListener('click', function () {
    const computedStyle = window.getComputedStyle(FilterTagContainer);
    if (computedStyle.display === "none") {
        FilterTagContainer.classList.toggle('hidden');
        filterIcon.innerHTML = 'filter_list_off';
    }
    else{
        FilterTagContainer.classList.toggle('hidden');
        filterIcon.innerHTML ='filter_list';
    }

});