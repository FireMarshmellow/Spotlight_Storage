const AddTagIcon = document.getElementById('add_form_tag_toggle');
const filterIcon = document.getElementById('filter_tag_toggle');
const tagContainer = document.getElementById('add_form_tag_container');
const tagContainerOverflow = document.getElementById('add_form_tag_container_overflow');
const FilterTagContainerOverflow = document.getElementById('filter_tag_container_overflow');
const FilterTagContainer = document.getElementById('filter_tag_container');
const input = document.getElementById('tag-input');

 const maxSelTags = 10
 const OverflowSizeTags = 6
let tags = [];
tagContainer.addEventListener('click', (event) => {
    const tagElement = event.target.closest('.tag');
    if (tagElement) {
        let selectedTags = applyTagFilter(tagContainer);

        if(selectedTags.length <=maxSelTags || tagElement.classList.contains('selected')){
        // Toggle the 'selected' class for the clicked tag
         tagElement.classList.toggle('selected');
         selectedTags= applyTagFilter(tagContainer);
        localStorage.setItem('item_tags', JSON.stringify(selectedTags));
        }
        else{
            alert("Maximum of selected tags reached.");
        }
    }
});
FilterTagContainer.addEventListener('click', (event) => {
    localStorage.removeItem('item_tags');
    const tagElement = event.target;

    if (tagElement.classList.contains('tag')) {
        // Toggle the 'selected' class for the clicked tag
        tagElement.classList.toggle('selected');
        const filter = applyTagFilter(FilterTagContainer);
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
    const allTags = Array.from(tagContainer.getElementsByClassName('tag'));
    allTags.forEach(tagElement => {
            const tag = tagElement.innerHTML;
            // Check if the tag is in itemTagsArray
            if (itemTagsArray.includes(tag)) {
                tagElement.classList.add('selected');
                const selectedTags = applyTagFilter(tagContainer);

                if(selectedTags.length>=OverflowSizeTags){
                    const computedStyle = window.getComputedStyle(tagContainerOverflow);
                    if (computedStyle.display === "none") {
                        tagContainerOverflow.classList.toggle('hidden');
                        AddTagIcon.innerHTML = 'filter_list_off';
                    }

                }

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
    localStorage.removeItem('item_tags');
    localStorage.setItem('item_tags', JSON.stringify(selectedTags));
    return selectedTags


}
function loadTags() {
    resetTags();
    localStorage.removeItem('item_tags');
    // Fetch the settings from the server
    fetch("/api/tags")
        .then((response) => response.json())
        .then((TagData) => {
            TagData.forEach(({ tag, count }) => {
                createTag(tag, count);
                tags.push(tag);

            });

        })
        .catch((error) => console.error(error));

}
function createTag(tag, count){
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
    if(tags.length >= OverflowSizeTags+1) {
        FilterTagContainerOverflow.appendChild(FilterTag);
        tagContainerOverflow.appendChild(div);

    }else{
        FilterTagContainer.appendChild(FilterTag);
        tagContainer.appendChild(div);}


}
function resetTags(){
    document.querySelectorAll('.tag').forEach(function (tag)
    {
        tag.parentElement.removeChild(tag);
    })
    tags = [];
}
function addTags(tagData){
         createTag(tagData, 1);}
input.addEventListener('keyup', function (e){
    if (e.key === 'Enter' && input.value !=='') {
        const computedStyle = window.getComputedStyle(tagContainerOverflow);
        if (computedStyle.display === "none" && tags.length >= OverflowSizeTags) {
            // Toggle the visibility of the tag container
            tagContainerOverflow.classList.toggle('hidden');
        }
        const newTag = input.value;
        tags.push(newTag);
        addTags(newTag)
        input.value = '';
    }
})
loadTags();
AddTagIcon.addEventListener('click', function () {
    const computedStyle = window.getComputedStyle(tagContainerOverflow);
    if (computedStyle.display === "none") {
        tagContainerOverflow.classList.toggle('hidden');
        AddTagIcon.innerHTML = 'filter_list_off';
    }
    else{
        tagContainerOverflow.classList.toggle('hidden');
        AddTagIcon.innerHTML ='filter_list';
        if(!isEditingItem){
            loadTags();
        }
    }
});

filterIcon.addEventListener('click', function () {
    const computedStyle = window.getComputedStyle(FilterTagContainerOverflow);
    if (computedStyle.display === "none") {
        if(!isEditingItem){
            loadTags();
        }
        FilterTagContainerOverflow.classList.toggle('hidden');
        filterIcon.innerHTML = 'filter_list_off';
    }
    else{
        FilterTagContainerOverflow.classList.toggle('hidden');
        filterIcon.innerHTML ='filter_list';
    }
});