let cropper = null;  // Store Cropper instance globally



async function uploadImage() {
    const formData = new FormData();
    const fileInput = document.getElementById("item_image_upload");
    // Append the file input to the formData
    formData.append('file', fileInput.files[0]);

    // returns undefined if no file is selected
    if (!fileInput.files[0]) {
        console.log('no file uploaded');
        return null;
    }
    try {
        const response = await fetch('/upload', { body: formData, method: 'POST' });
        const imageURL = await response.text();
        return new URL(window.location.href + imageURL);
    } catch (error) {
        console.error('Error uploading file:', error);
        return null;
    }
}



async function processCroppedImage(croppedImageFile, item) {
    const formData = new FormData();
    formData.append('file', croppedImageFile);

    try {
        const response = await fetch('/upload', { body: formData, method: 'POST' });
        const imageURL = await response.text();
        const fullImageUrl = new URL(imageURL, window.location.href).href;
        // Update the database with the new image URL
        document.getElementById("item_image").value = fullImageUrl;
        await handleImageChange(item, imageURL);
        // Update the item image in the UI with the new cropped image URL
        item.image = fullImageUrl;
        const col = document.getElementById('items-container-grid').querySelector(`div[data-id="${item.id}"]`);
        console.log(col);
        const updatedCol = createItem(item);
        document.getElementById('items-container-grid').replaceChild(updatedCol, col);
        lucide.createIcons();
        fetchDataAndLoadTags();


    } catch (error) {
        console.error('Error uploading cropped image:', error);
    }
}


// Function to initialize Cropper.js
function initializeCropper(imageElement) {
    if (cropper) {
        cropper.destroy(); // Destroy the existing Cropper instance if any
    }

    // Initialize Cropper only after the image has fully loaded
    if (imageElement.complete) {
        requestAnimationFrame(() => {
            cropper = new Cropper(imageElement, {
                aspectRatio: 1,  // 1:1 aspect ratio
                viewMode: 1,
                movable: true,
                zoomable: true,
                rotatable: true,
                scalable: true,
            });
        });
    }
}

// Function to handle cropping and saving the image
function handleCropAndSave(item) {
    if (!cropper) return;

    const croppedCanvas = cropper.getCroppedCanvas({
        width: 300,
        height: 300,
    });

    if (!croppedCanvas) {
        console.error('Cropped canvas could not be generated.');
        return;
    }

    croppedCanvas.toBlob(async (blob) => {
        if (!blob) {
            console.error('Failed to create Blob from cropped canvas.');
            return;
        }

        const originalFileName = item.image.split('/').pop();
        let fileExtension = originalFileName.split('.').pop();
        const baseFileName = item.name.trim();
        // Check if the file extension is valid
        const validExtensions = ['png', 'jpeg', 'jpg','webp'];
        if (!validExtensions.includes(fileExtension)) {
            // If the extension is not valid, default to 'jpg'
            fileExtension = 'webp';
        }

        const croppedFileName = `${baseFileName}_cropped.${fileExtension}`;
        const croppedImageFile = new File([blob], croppedFileName, { type: blob.type });

        await processCroppedImage(croppedImageFile, item);
    });
}

// Function to handle crop and save button using dataset values
function onCropAndSave() {
    const cropImageModal = document.getElementById('cropImageModal');

    // Retrieve item details from modal dataset
    const item = JSON.parse(cropImageModal.dataset.item);

    console.log("saving image", item)
    handleCropAndSave(item);
    resetModalAndCropper(cropImageModal);
}

// Function to handle image change in the database
function handleImageChange(item, url) {
    const itemId = item.id;
    console.log(url);

    const updatedItem = { image: url };

    fetch(`/api/items/${itemId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Update-Image': 'true'
        },
        body: JSON.stringify(updatedItem),
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Error updating image:', data.error);
            }
        })
        .catch(error => {
            console.error('Error updating image:', error);
        });
}

// Reset Cropper and close modal
function resetModalAndCropper(modalElement) {
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }

    // Clear the image source
    document.getElementById('imageToCrop').src = '';

    // Clear dataset attributes
    modalElement.dataset.itemName = '';
    modalElement.dataset.itemImage = '';

    // Hide the modal
    const modal = bootstrap.Modal.getInstance(modalElement);
    if(modal) {
        modal.hide();
    } else {
        modalElement.hide();
    }
}

// Function to check if a string is a URL
function isValidUrl(str) {
    try {
        new URL(str);
        return true;
    } catch (e) {
        return false;
    }
}

// Event listener to initialize cropper when the modal is fully shown
$('#cropImageModal').on('shown.bs.modal', function () {
    const imageElement = document.getElementById('imageToCrop');

    // Use requestAnimationFrame to ensure all rendering is complete
    requestAnimationFrame(() => {
        initializeCropper(imageElement);
    });
});