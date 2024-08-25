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
        document.getElementById("item_image").value = fullImageUrl;

        // Update the item image in the UI with the new cropped image URL
        item.image = fullImageUrl;
        const col = document.getElementById('items-container-grid').querySelector(`div[data-id="${item.id}"]`);
        const updatedCol = createItem(item);
        document.getElementById('items-container-grid').replaceChild(updatedCol, col);
        lucide.createIcons();
        fetchDataAndLoadTags();

        // Update the database with the new image URL
        await handleImageChange(item, imageURL);
    } catch (error) {
        console.error('Error uploading cropped image:', error);
    }
}


let cropper = null;  // Store Cropper instance globally

// Function to initialize Cropper.js
function initializeCropper(imageElement) {
    if (cropper) {
        cropper.destroy(); // Destroy the existing Cropper instance if any
    }

    if (imageElement.complete) { // Ensure the image has loaded
        cropper = new Cropper(imageElement, {
            aspectRatio: 1,  // 1:1 aspect ratio
            viewMode: 1,
            movable: true,
            zoomable: true,
            rotatable: true,
            scalable: true,
        });
    } else {
        imageElement.onload = () => {
            cropper = new Cropper(imageElement, {
                aspectRatio: 1,
                viewMode: 1,
                movable: true,
                zoomable: true,
                rotatable: true,
                scalable: true,
            });
        };
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
        const fileExtension = originalFileName.split('.').pop();
        const baseFileName = originalFileName.substring(0, originalFileName.lastIndexOf('.'));

        const croppedFileName = `${baseFileName}_cropped.${fileExtension}`;
        const croppedImageFile = new File([blob], croppedFileName, { type: blob.type });

        await processCroppedImage(croppedImageFile, item);
    });
}

// Event handler for crop and save button
function onCropAndSave(item, cropImageModal) {
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
    modalElement.hide();
    document.getElementById('imageToCrop').src = ''; // Clear the image source
}