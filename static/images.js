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
// Function to generate a hash for the image
async function generateImageHash(imageBlob) {
    const arrayBuffer = await imageBlob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}


// Function to check if an image exists on the server and is identical
async function doesImageExistAndIsIdentical(imageURL, localImageBlob) {
    try {
        const response = await fetch(`/images/${imageURL}`);

        if (!response.ok) return false;

        const serverImageBlob = await response.blob();
        const serverImageHash = await generateImageHash(serverImageBlob);
        const localImageHash = await generateImageHash(localImageBlob);

        return serverImageHash === localImageHash;
    } catch (error) {
        console.error('Error checking image existence:', error);
        return false;
    }
}

// Function to get the next available filename if the image already exists
async function getNextAvailableFilename(baseName, extension) {
    let index = 1;
    let newFileName = `${baseName} (${index})${extension}`;

    while (await doesImageExist(newFileName)) {
        index++;
        newFileName = `${baseName} (${index})${extension}`;
    }

    return newFileName;
}

// Function to check if an image exists on the server
async function doesImageExist(imageURL) {
    try {
        const response = await fetch(`/images/${imageURL}`);
        if (!response.ok) return false;
    } catch (error) {
        console.error('Error checking image existence:', error);
        return false;
    }
}


// Function to download an image from a URL
async function downloadImage(url) {
    const urlParts = url.split('/');
    let imageName = urlParts[urlParts.length - 1];
    const extensionMatch = imageName.match(/(\.[^.]+)$/);
    const extension = extensionMatch ? extensionMatch[1] : '.jpg';
    let baseName = extensionMatch ? imageName.slice(0, -extension.length) : imageName;
    try {
        const response = await fetch(url);
        const blob = await response.blob();

        // Check if the image already exists on the server and is identical
        if (await doesImageExistAndIsIdentical(imageName, blob)) {
            console.log('Identical image already exists on the server.');
            return /images/${imageName};
        } else if (await doesImageExist(imageName)) {
            console.log('Image with the same name exists but is different.');
            imageName = await getNextAvailableFilename(baseName, extension);
        }

        return new File([blob], imageName, { type: 'image/jpeg' });
    } catch (error) {
        console.error('Error downloading image:', error);
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
        await handleImageChange(item, fullImageUrl);
    } catch (error) {
        console.error('Error uploading cropped image:', error);
    }
}


let cropper = null;  // Store Cropper instance globally

function initializeCropper(imageElement) {
    if (cropper) {
        cropper.destroy();
    }
    cropper = new Cropper(imageElement, {
        aspectRatio: 1,  // 1:1 aspect ratio
        viewMode: 1,
        movable: true,
        zoomable: true,
        rotatable: true,
        scalable: true,
    });
}

function handleCropAndSave(item) {
    if (!cropper) return;

    const croppedCanvas = cropper.getCroppedCanvas({
        width: 300,
        height: 300,
    });

    croppedCanvas.toBlob(async (blob) => {
        const originalFileName = item.image.split('/').pop(); // Get the file name from the URL
        const fileExtension = originalFileName.split('.').pop(); // Extract the file extension
        const baseFileName = originalFileName.substring(0, originalFileName.lastIndexOf('.')); // Extract the file name without extension

        const croppedFileName = `${baseFileName}_cropped.${fileExtension}`;
        const croppedImageFile = new File([blob], croppedFileName, { type: blob.type });

        await processCroppedImage(croppedImageFile, item);
    });
}

function resetModalAndCropper(modalElement) {
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    modalElement.hide();
    document.getElementById('imageToCrop').src = ''; // Clear the image source
}


function handleImageChange(item, url) {
    const itemId = item.id;

    // Create the updated item object
    const updatedItem = { image: url };

    // Make a fetch request to update the quantity in the database
    fetch(`/api/items/${itemId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Update-Image': 'true'  // Custom header to indicate quantity update
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