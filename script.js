// DOM elements
const video = document.getElementById('video');
const captureBtn = document.getElementById('captureBtn');
const photosContainer = document.getElementById('photosContainer');
const notification = document.getElementById('notification');
const borderOverlay = document.getElementById('borderOverlay');
const hiddenCanvas = document.getElementById('hiddenCanvas');
const hiddenCtx = hiddenCanvas.getContext('2d');
const photoCounter = document.getElementById('currentCount');
const exportBtn = document.getElementById('exportBtn');
const collagePreview = document.getElementById('collagePreview');

// File upload input
const borderUpload = document.getElementById('borderUpload');
const borderPreview = document.getElementById('borderPreview');
const borderStatus = document.getElementById('borderStatus');
const customUploadContainer = document.getElementById('customUploadContainer');
const frameOptions = document.querySelectorAll('.frame-option');

// Gallery slots
const gallerySlots = document.getElementById('gallerySlots');
const slot1Badge = document.getElementById('slot1Badge');
const slot2Badge = document.getElementById('slot2Badge');
const slot3Badge = document.getElementById('slot3Badge');

// Store loaded border image
let loadedBorder = null;
let borderFileData = null;
let currentFrame = 'default'; // Track current selected frame

// State variables
let photos = []; // Array for permanent gallery
let temporaryPhotos = [null, null, null]; // Array for 3 temporary slots
let currentSlot = 1; // Track which slot to fill next
let photoCount = 0; // Count of photos taken
let isLoading = false;
let isFrontCamera = true; // Track if we're using front camera
let isRetaking = false; // Track if retaking a photo
let retakeSlot = null; // Which slot is being retaken

// Store image objects for collage
let photoImages = [null, null, null]; // Store actual Image objects for collage

// Predefined frames with fallback generators
const predefinedFrames = {
    'default': createDefaultFrame, // Transparent default frame
    'border1.png': 'border1.png', // Your local frame
    'frame2': createHeartFrame,
    'frame3': createStarFrame,
    'frame4': createSquareFrame,
    'custom': null // Will be set from uploaded image
};

// Initialize webcam with 4:3 aspect ratio
async function initCamera() {
    try {
        const constraints = {
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 960 }, // 1280x960 = 4:3 ratio
                aspectRatio: { ideal: 4/3 }, // Enforce 4:3 ratio
                facingMode: 'user' // Use front camera by default
            } 
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        showNotification("Camera connected successfully! Using 4:3 aspect ratio.");
        
        // Set to front camera mode
        isFrontCamera = true;
        
        // Load previously saved custom border from localStorage
        loadSavedBorder();
        
        // Load the default frame initially
        loadFrame('default');
        
        // Setup gallery slot click events
        setupGallerySlots();
        
        // Setup export button
        exportBtn.addEventListener('click', exportCollage);
        
        // Setup capture button
        captureBtn.addEventListener('click', capturePhoto);
        
    } catch (err) {
        console.error("Error accessing the camera: ", err);
        showNotification("Unable to access camera. Please check permissions.", true);
    }
}

// Load saved custom border from localStorage
function loadSavedBorder() {
    try {
        const savedData = localStorage.getItem('border_custom');
        if (savedData) {
            const data = JSON.parse(savedData);
            borderFileData = data;
            showPreview(data.url);
        }
    } catch (error) {
        console.error("Error loading saved border:", error);
    }
}

// Handle frame selection
function setupFrameSelection() {
    frameOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove active class from all options
            frameOptions.forEach(opt => opt.classList.remove('active'));
            
            // Add active class to clicked option
            this.classList.add('active');
            
            // Get frame type
            const frameType = this.getAttribute('data-frame');
            currentFrame = frameType;
            
            // Show/hide custom upload container
            if (frameType === 'custom') {
                customUploadContainer.style.display = 'block';
                // Load saved custom border if exists
                if (borderFileData) {
                    loadFrame('custom', borderFileData.url);
                } else {
                    borderOverlay.style.backgroundImage = 'none';
                    borderOverlay.style.backgroundColor = 'transparent';
                    loadedBorder = null;
                    updateBorderStatus(false);
                }
            } else {
                customUploadContainer.style.display = 'none';
                loadFrame(frameType);
            }
        });
    });
}

// Setup gallery slot click events
function setupGallerySlots() {
    const slots = document.querySelectorAll('.gallery-slot');
    slots.forEach(slot => {
        slot.addEventListener('click', function() {
            const slotNumber = parseInt(this.getAttribute('data-slot'));
            
            // If slot already has a photo, allow retaking
            if (temporaryPhotos[slotNumber - 1]) {
                isRetaking = true;
                retakeSlot = slotNumber;
                showNotification(`Retaking photo for Slot ${slotNumber}. Press capture button.`);
                
                // Enable capture button for retaking
                captureBtn.disabled = false;
                captureBtn.title = `Retake photo for Slot ${slotNumber}`;
            }
        });
    });
}

// Load a frame
function loadFrame(frameType, customUrl = null) {
    console.log(`Loading frame: ${frameType}`);
    
    if (frameType === 'default') {
        // Use transparent default frame
        loadedBorder = createDefaultFrame();
        applyPngBorder();
        updateBorderStatus(true, 'Default frame');
    } 
    else if (frameType === 'border1.png') {
        // Load your local border1.png
        loadLocalFrame('border1.png');
    }
    else if (frameType === 'custom' && customUrl) {
        // Load custom uploaded frame
        loadCustomFrame(customUrl);
    }
    else if (predefinedFrames[frameType] && typeof predefinedFrames[frameType] === 'function') {
        // Generate predefined frame
        loadedBorder = predefinedFrames[frameType]();
        applyPngBorder();
        updateBorderStatus(true, frameType.charAt(0).toUpperCase() + frameType.slice(1) + ' frame');
    }
    else {
        // Fallback to default
        loadedBorder = createDefaultFrame();
        applyPngBorder();
        updateBorderStatus(true, 'Default frame');
    }
    
    // Ensure border is on top
    borderOverlay.style.zIndex = '100';
}

// Load local frame (border1.png)
function loadLocalFrame(filename) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = function() {
        loadedBorder = img;
        console.log("Local frame loaded successfully");
        applyPngBorder();
        updateBorderStatus(true, 'Frame 1');
        borderOverlay.style.zIndex = '100';
    };
    
    img.onerror = function() {
        console.error(`Failed to load ${filename}, using fallback`);
        loadedBorder = createDefaultFrame();
        applyPngBorder();
        updateBorderStatus(true, 'Default (fallback)');
        borderOverlay.style.zIndex = '100';
    };
    
    img.src = filename;
}

// Load custom uploaded frame
function loadCustomFrame(imageUrl) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = function() {
        loadedBorder = img;
        console.log("Custom frame loaded successfully");
        applyPngBorder();
        updateBorderStatus(true, 'Custom frame');
        borderOverlay.style.zIndex = '100';
    };
    
    img.onerror = function() {
        console.error("Failed to load custom frame");
        loadedBorder = createDefaultFrame();
        applyPngBorder();
        updateBorderStatus(true, 'Default (fallback)');
        borderOverlay.style.zIndex = '100';
    };
    
    img.src = imageUrl;
}

// Handle file upload for custom frames
function setupFileUpload() {
    borderUpload.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.type.match('image.*')) {
            showNotification("Please upload an image file (PNG, JPG, JPEG)", true);
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const imageUrl = e.target.result;
            
            // Save to localStorage
            const borderData = {
                name: file.name,
                type: file.type,
                size: file.size,
                url: imageUrl,
                uploaded: new Date().toISOString()
            };
            
            try {
                localStorage.setItem('border_custom', JSON.stringify(borderData));
                borderFileData = borderData;
                showNotification("Custom frame uploaded successfully!");
            } catch (error) {
                console.error("Error saving to localStorage:", error);
                showNotification("Failed to save frame. Local storage might be full.", true);
            }
            
            // Show preview
            showPreview(imageUrl);
            
            // Load the frame
            loadFrame('custom', imageUrl);
        };
        
        reader.onerror = function() {
            showNotification("Error reading file. Please try again.", true);
        };
        
        reader.readAsDataURL(file);
    });
}

// Show preview image
function showPreview(imageUrl) {
    if (borderPreview) {
        borderPreview.src = imageUrl;
        borderPreview.style.display = 'block';
    }
}

// Update border status indicator
function updateBorderStatus(hasBorder, frameName = '') {
    if (borderStatus) {
        if (hasBorder) {
            borderStatus.textContent = `${frameName} loaded`;
            borderStatus.className = 'border-status loaded';
        } else {
            borderStatus.textContent = 'No frame selected';
            borderStatus.className = 'border-status';
        }
    }
}

// Update photo counter and UI
function updatePhotoCounter() {
    photoCounter.textContent = photoCount;
    
    // Update slot badges
    slot1Badge.className = temporaryPhotos[0] ? 'slot-badge filled' : 'slot-badge';
    slot2Badge.className = temporaryPhotos[1] ? 'slot-badge filled' : 'slot-badge';
    slot3Badge.className = temporaryPhotos[2] ? 'slot-badge filled' : 'slot-badge';
    
    // Enable/disable capture button based on photo count
    if (photoCount >= 3 && !isRetaking) {
        captureBtn.disabled = true;
        captureBtn.title = "Maximum 3 photos reached. Click on a slot to retake.";
    } else {
        captureBtn.disabled = false;
        captureBtn.title = "Capture photo";
    }
    
    // Enable/disable export button
    if (photoCount === 3 && temporaryPhotos.every(photo => photo !== null)) {
        exportBtn.disabled = false;
        exportBtn.classList.add('active');
        updateCollagePreview();
    } else {
        exportBtn.disabled = true;
        exportBtn.classList.remove('active');
    }
}

// Load image for collage
function loadImageForCollage(imageData, index) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            photoImages[index] = img;
            resolve(img);
        };
        img.onerror = reject;
        img.src = imageData;
    });
}

// Update collage preview
async function updateCollagePreview() {
    if (photoCount < 3) {
        return;
    }
    
    try {
        // Clear previous preview
        collagePreview.innerHTML = '';
        
        // Load all images first
        const loadPromises = [];
        for (let i = 0; i < 3; i++) {
            if (temporaryPhotos[i] && !photoImages[i]) {
                loadPromises.push(loadImageForCollage(temporaryPhotos[i], i));
            }
        }
        
        // Wait for all images to load
        if (loadPromises.length > 0) {
            await Promise.all(loadPromises);
        }
        
        // Create canvas for preview
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Create collage
        createCollage(ctx, true);
        
        // Create image from canvas
        const img = document.createElement('img');
        img.src = canvas.toDataURL('image/png');
        img.className = 'collage-canvas';
        collagePreview.appendChild(img);
        
    } catch (error) {
        console.error("Error updating collage preview:", error);
        collagePreview.innerHTML = `
            <div class="collage-placeholder">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading collage preview</p>
            </div>
        `;
    }
}

// Create a transparent default frame (only border, no background)
function createDefaultFrame() {
    const canvas = document.createElement('canvas');
    // Use 4:3 aspect ratio
    canvas.width = 1200;
    canvas.height = 900; // 4:3 ratio
    const ctx = canvas.getContext('2d');
    
    // Start with COMPLETELY transparent canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw ONLY a border (semitransparent)
    ctx.strokeStyle = 'rgba(138, 138, 138, 0.7)';
    ctx.lineWidth = 30;
    ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);
    
    // Add a second inner border
    ctx.strokeStyle = 'rgba(51, 51, 51, 0.5)';
    ctx.lineWidth = 15;
    ctx.strokeRect(85, 85, canvas.width - 170, canvas.height - 170);
    
    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
}

// Create transparent heart frame
function createHeartFrame() {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 900; // 4:3 ratio
    const ctx = canvas.getContext('2d');
    
    // Start with COMPLETELY transparent canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw heart border (semitransparent)
    ctx.strokeStyle = 'rgba(255, 105, 180, 0.7)'; // Hot pink with transparency
    ctx.lineWidth = 8;
    
    // Draw heart shapes around the border (transparent fill)
    for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const x = canvas.width/2 + Math.cos(angle) * 500;
        const y = canvas.height/2 + Math.sin(angle) * 350;
        drawHeart(ctx, x, y, 25, 'rgba(255, 105, 180, 0.7)');
    }
    
    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
}

// Helper function to draw a heart
function drawHeart(ctx, x, y, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI);
    ctx.scale(size, size);
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0.7);
    ctx.bezierCurveTo(0, 0.3, -0.6, -0.1, 0, -0.5);
    ctx.bezierCurveTo(0.6, -0.1, 0, 0.3, 0, 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
}

// Create transparent star frame
function createStarFrame() {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 900; // 4:3 ratio
    const ctx = canvas.getContext('2d');
    
    // Start with COMPLETELY transparent canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw star border (semitransparent)
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.7)'; // Gold with transparency
    ctx.lineWidth = 8;
    ctx.strokeRect(100, 100, canvas.width - 200, canvas.height - 200);
    
    // Draw stars around the border (transparent fill)
    ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
    for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const x = canvas.width/2 + Math.cos(angle) * 450;
        const y = canvas.height/2 + Math.sin(angle) * 300;
        drawStar(ctx, x, y, 5, 20, 8);
    }
    
    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
}

// Helper function to draw a star
function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
}

// Create transparent square frame
function createSquareFrame() {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 900; // 4:3 ratio
    const ctx = canvas.getContext('2d');
    
    // Start with COMPLETELY transparent canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw square pattern border (semitransparent)
    ctx.strokeStyle = 'rgba(46, 139, 87, 0.7)'; // Sea green with transparency
    ctx.lineWidth = 15;
    ctx.setLineDash([20, 10]);
    ctx.strokeRect(80, 80, canvas.width - 160, canvas.height - 160);
    ctx.setLineDash([]);
    
    // Add corner decorations (transparent)
    ctx.fillStyle = 'rgba(46, 139, 87, 0.7)';
    
    // Top-left corner
    ctx.fillRect(80, 80, 40, 40);
    // Top-right corner
    ctx.fillRect(canvas.width - 120, 80, 40, 40);
    // Bottom-left corner
    ctx.fillRect(80, canvas.height - 120, 40, 40);
    // Bottom-right corner
    ctx.fillRect(canvas.width - 120, canvas.height - 120, 40, 40);
    
    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
}

// Apply PNG border image
function applyPngBorder() {
    if (loadedBorder && loadedBorder.src) {
        // Use loaded border
        borderOverlay.style.backgroundImage = `url('${loadedBorder.src}')`;
        borderOverlay.style.backgroundColor = 'transparent';
        borderOverlay.style.opacity = '1';
    } else {
        // No border loaded
        borderOverlay.style.backgroundImage = 'none';
        borderOverlay.style.backgroundColor = 'transparent';
    }
    
    // Ensure border is always on top
    borderOverlay.style.zIndex = '100';
}

// Capture photo with border - ENFORCING 4:3 RATIO
async function capturePhoto() {
    if (isLoading) return;
    
    // Check if frame is loaded
    if (!loadedBorder) {
        showNotification("Please select a frame first", true);
        return;
    }
    
    try {
        isLoading = true;
        captureBtn.disabled = true;
        captureBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        // Determine which slot to use
        let targetSlot;
        if (isRetaking && retakeSlot) {
            targetSlot = retakeSlot;
            console.log(`Retaking photo for slot ${targetSlot}`);
        } else {
            // Check if we can take a new photo
            if (photoCount >= 3) {
                showNotification("Maximum 3 photos reached. Click on a slot to retake.", true);
                return;
            }
            
            // Find next empty slot
            for (let i = 0; i < 3; i++) {
                if (temporaryPhotos[i] === null) {
                    targetSlot = i + 1;
                    break;
                }
            }
        }
        
        if (!targetSlot) {
            showNotification("All slots are full. Click on a slot to retake.", true);
            return;
        }
        
        // Create canvas for final image with 4:3 ratio
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Use 4:3 aspect ratio for output
        const outputWidth = 1200; // Base width for 4:3
        const outputHeight = 900; // 4:3 ratio (1200x900)
        canvas.width = outputWidth;
        canvas.height = outputHeight;
        
        console.log("Output canvas size (4:3):", canvas.width, "x", canvas.height);
        
        // Clear canvas with transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Calculate video dimensions to fit 4:3 canvas
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        const videoRatio = videoWidth / videoHeight;
        
        let sourceX = 0, sourceY = 0, sourceWidth = videoWidth, sourceHeight = videoHeight;
        
        // Crop video to 4:3 if needed
        if (videoRatio > 4/3) {
            // Video is wider than 4:3 - crop width
            sourceWidth = videoHeight * (4/3);
            sourceX = (videoWidth - sourceWidth) / 2;
        } else if (videoRatio < 4/3) {
            // Video is taller than 4:3 - crop height
            sourceHeight = videoWidth * (3/4);
            sourceY = (videoHeight - sourceHeight) / 2;
        }
        
        // Draw the video frame (cropped to 4:3)
        if (isFrontCamera) {
            // Save the current context state
            ctx.save();
            
            // Flip the context horizontally for front camera
            ctx.scale(-1, 1);
            ctx.translate(-canvas.width, 0);
            
            // Draw the cropped video frame (flipped)
            ctx.drawImage(video, 
                sourceX, sourceY, sourceWidth, sourceHeight, // Source rectangle
                0, 0, canvas.width, canvas.height // Destination rectangle
            );
            
            // Restore the context state
            ctx.restore();
        } else {
            // For rear camera, draw normally without flipping
            ctx.drawImage(video, 
                sourceX, sourceY, sourceWidth, sourceHeight, // Source rectangle
                0, 0, canvas.width, canvas.height // Destination rectangle
            );
        }
        
        // Draw border image on top (transparent frame)
        if (loadedBorder && loadedBorder.complete) {
            ctx.drawImage(loadedBorder, 0, 0, canvas.width, canvas.height);
        }
        
        // Create image data URL
        const imageData = canvas.toDataURL('image/png');
        
        // Store in temporary gallery
        temporaryPhotos[targetSlot - 1] = imageData;
        
        // Clear the Image object for this slot so it will be reloaded
        photoImages[targetSlot - 1] = null;
        
        // Update slot display
        updateSlotDisplay(targetSlot, imageData);
        
        // Update counts
        if (!isRetaking) {
            photoCount++;
        }
        
        // Update UI
        updatePhotoCounter();
        
        // Add to permanent gallery
        addPhotoToGallery(imageData);
        
        // Show notification
        if (isRetaking) {
            showNotification(`Photo retaken for Slot ${targetSlot}!`);
            isRetaking = false;
            retakeSlot = null;
        } else {
            showNotification(`Photo captured for Slot ${targetSlot}! (${photoCount}/3)`);
        }
        
    } catch (error) {
        console.error("Error capturing photo:", error);
        showNotification("Error capturing photo. Please try again.", true);
    } finally {
        isLoading = false;
        updatePhotoCounter(); // Update button state
        captureBtn.innerHTML = '<i class="fas fa-camera"></i>';
    }
}

// Update slot display
function updateSlotDisplay(slotNumber, imageData) {
    const slotElement = document.getElementById(`slot${slotNumber}`);
    const slotImage = slotElement.querySelector('.slot-image');
    const slotPlaceholder = slotElement.querySelector('.slot-placeholder');
    
    // Update image
    slotImage.src = imageData;
    
    // Update UI state
    slotElement.classList.add('filled');
    slotPlaceholder.style.display = 'none';
    slotImage.style.display = 'block';
}

// Create collage (vertical photo strip) - DYNAMIC HEIGHT based on photos
async function createCollage(ctx, isPreview = false) {
    // Count how many photos we have
    const photoCount = temporaryPhotos.filter(photo => photo !== null).length;
    
    if (photoCount === 0) {
        // No photos, draw placeholder
        ctx.canvas.width = isPreview ? 300 : 1200;
        ctx.canvas.height = 200;
        
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        ctx.fillStyle = '#6c757d';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No photos yet', ctx.canvas.width/2, ctx.canvas.height/2);
        return;
    }
    
    // Collage dimensions - DYNAMIC based on photo count
    const collageWidth = isPreview ? 300 : 1200;
    
    // Calculate dynamic height based on photo count
    // Each photo takes: photoHeight + spacing + label
    const photoWidth = collageWidth - 60; // Padding
    const photoHeight = photoWidth * (3/4); // 4:3 ratio
    const photoSpacing = 20;
    const photoLabelHeight = 15;
    const headerHeight = 45;
    const footerHeight = 20;
    
    // Dynamic height calculation
    let collageHeight = headerHeight;
    collageHeight += (photoCount * (photoHeight + photoSpacing + photoLabelHeight));
    collageHeight += footerHeight;
    
    // Ensure minimum height
    collageHeight = Math.max(collageHeight, 300);
    
    // Set canvas size
    ctx.canvas.width = collageWidth;
    ctx.canvas.height = collageHeight;
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, collageWidth, collageHeight);
    gradient.addColorStop(0, '#f8f9fa');
    gradient.addColorStop(1, '#e9ecef');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, collageWidth, collageHeight);
    
    // Add decorative header (dynamic based on photo count)
    ctx.fillStyle = '#6c757d';
    ctx.fillRect(0, 0, collageWidth, 35);
    
    // Add title with photo count
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`PHOTO STRIP (${photoCount}/3)`, collageWidth/2, 23);
    
    const startY = 45; // Start below header
    
    // Draw each available photo
    let photosDrawn = 0;
    for (let index = 0; index < 3; index++) {
        const photoData = temporaryPhotos[index];
        if (!photoData) continue;
        
        photosDrawn++;
        const photoY = startY + ((photosDrawn - 1) * (photoHeight + photoSpacing + photoLabelHeight));
        
        // White frame for photo
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;
        ctx.fillRect(30, photoY, photoWidth, photoHeight);
        ctx.shadowColor = 'transparent'; // Reset shadow
        
        try {
            // Load the image for this slot if not already loaded
            if (!photoImages[index] || photoImages[index].src !== photoData) {
                await loadImageForCollage(photoData, index);
            }
            
            // Draw the actual photo
            if (photoImages[index]) {
                // Calculate dimensions to fit within the white frame with small padding
                const padding = 3;
                const drawX = 30 + padding;
                const drawY = photoY + padding;
                const drawWidth = photoWidth - (padding * 2);
                const drawHeight = photoHeight - (padding * 2);
                
                ctx.drawImage(photoImages[index], drawX, drawY, drawWidth, drawHeight);
            }
        } catch (error) {
            console.error(`Error drawing photo ${index + 1}:`, error);
            // Draw placeholder if image fails to load
            ctx.fillStyle = '#e9ecef';
            ctx.fillRect(33, photoY + 3, photoWidth - 6, photoHeight - 6);
            
            ctx.fillStyle = '#6c757d';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Photo ${index + 1}`, 30 + photoWidth/2, photoY + photoHeight/2);
        }
        
        // Add photo border
        ctx.strokeStyle = '#dee2e6';
        ctx.lineWidth = 1;
        ctx.strokeRect(30, photoY, photoWidth, photoHeight);
        
        // Add photo number and slot info
        ctx.fillStyle = '#495057';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Slot ${index + 1}`, collageWidth/2, photoY + photoHeight + 12);
    }
    
    // Add status indicator based on photo count
    const footerY = startY + (photosDrawn * (photoHeight + photoSpacing + photoLabelHeight)) + 5;
    
    // Add status line
    ctx.strokeStyle = '#adb5bd';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(40, footerY);
    ctx.lineTo(collageWidth - 40, footerY);
    ctx.stroke();
    
    // Add status text
    ctx.fillStyle = '#6c757d';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    
    let statusText = '';
    if (photoCount === 1) {
        statusText = '1 photo - Add 2 more for complete strip';
    } else if (photoCount === 2) {
        statusText = '2 photos - Add 1 more for complete strip';
    } else if (photoCount === 3) {
        statusText = 'Complete photo strip (3/3)';
    }
    
    ctx.fillText(`${statusText} • ${new Date().toLocaleDateString()}`, collageWidth/2, footerY + 12);
}

// Update collage preview to handle dynamic heights
async function updateCollagePreview() {
    if (photoCount < 1) {
        // Show placeholder when no photos
        collagePreview.innerHTML = `
            <div class="collage-placeholder">
                <i class="fas fa-images"></i>
                <p>Take photos to see preview</p>
            </div>
        `;
        return;
    }
    
    try {
        // Clear previous preview
        collagePreview.innerHTML = '';
        
        // Load all images first
        const loadPromises = [];
        for (let i = 0; i < 3; i++) {
            if (temporaryPhotos[i] && !photoImages[i]) {
                loadPromises.push(loadImageForCollage(temporaryPhotos[i], i));
            }
        }
        
        // Wait for all images to load
        if (loadPromises.length > 0) {
            await Promise.all(loadPromises);
        }
        
        // Create canvas for preview
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Create collage with dynamic height
        await createCollage(ctx, true);
        
        // Create image from canvas
        const img = document.createElement('img');
        img.src = canvas.toDataURL('image/png');
        img.className = 'collage-canvas';
        collagePreview.appendChild(img);
        
        // Adjust preview container height based on photo count
        const photoCount = temporaryPhotos.filter(photo => photo !== null).length;
        if (photoCount === 1) {
            collagePreview.style.height = '120px';
        } else if (photoCount === 2) {
            collagePreview.style.height = '200px';
        } else if (photoCount === 3) {
            collagePreview.style.height = '280px';
        }
        
    } catch (error) {
        console.error("Error updating collage preview:", error);
        collagePreview.innerHTML = `
            <div class="collage-placeholder">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading collage preview</p>
            </div>
        `;
    }
}

// Also update the exportCollage function to handle dynamic heights
async function exportCollage() {
    const photoCount = temporaryPhotos.filter(photo => photo !== null).length;
    
    if (photoCount < 1) {
        showNotification("No photos to export", true);
        return;
    }
    
    try {
        // Create canvas for collage
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Create full size collage with dynamic height
        await createCollage(ctx, false);
        
        // Create download link
        const imageData = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = imageData;
        
        // Dynamic filename based on photo count
        let filename = '';
        if (photoCount === 1) {
            filename = `single-photo-${Date.now()}.png`;
        } else if (photoCount === 2) {
            filename = `double-photo-strip-${Date.now()}.png`;
        } else if (photoCount === 3) {
            filename = `complete-photo-strip-${Date.now()}.png`;
        }
        
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification(`Exported ${photoCount} photo${photoCount > 1 ? 's' : ''} successfully!`);
        
    } catch (error) {
        console.error("Error exporting collage:", error);
        showNotification("Error exporting collage. Please try again.", true);
    }
}

// Add photo to permanent gallery
function addPhotoToGallery(imageData) {
    // Create photo item
    const photoItem = document.createElement('div');
    photoItem.className = 'photo-item';
    
    // Create image
    const img = document.createElement('img');
    img.src = imageData;
    img.alt = `Captured photo ${photos.length + 1}`;
    
    // Create download overlay
    const downloadOverlay = document.createElement('div');
    downloadOverlay.className = 'photo-download';
    downloadOverlay.textContent = 'Click to download';
    
    // Add click event to download photo
    photoItem.addEventListener('click', () => {
        downloadPhoto(imageData, `webcam-photo-${photos.length + 1}.png`);
    });
    
    // Assemble photo item
    photoItem.appendChild(img);
    photoItem.appendChild(downloadOverlay);
    
    // Add to photos container (at the beginning)
    photosContainer.prepend(photoItem);
    
    // Store in photos array
    photos.push({
        id: Date.now(),
        data: imageData
    });
    
    // Remove the "no photos" message if it exists
    const noPhotosMsg = photosContainer.querySelector('.no-photos-message');
    if (noPhotosMsg) {
        noPhotosMsg.remove();
    }
    
    // Limit to 12 photos
    if (photos.length > 12) {
        // Remove the last photo item
        const lastPhotoItem = photosContainer.lastElementChild;
        if (lastPhotoItem) {
            photosContainer.removeChild(lastPhotoItem);
        }
        // Remove from array
        photos.shift();
    }
}

// Download single photo
function downloadPhoto(imageData, filename) {
    const link = document.createElement('a');
    link.href = imageData;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification("Download started!");
}

// Show notification
function showNotification(message, isError = false) {
    notification.textContent = message;
    notification.style.backgroundColor = isError ? 'rgba(180, 40, 40, 0.95)' : 'rgba(40, 40, 40, 0.95)';
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Initialize event listeners
function initEventListeners() {
    setupFileUpload();
    setupFrameSelection();
    
    // Ensure border stays on top when page loads
    window.addEventListener('load', function() {
        borderOverlay.style.zIndex = '100';
    });
}

// Initialize app
window.addEventListener('DOMContentLoaded', () => {
    initCamera();
    initEventListeners();
    
    // Add a message about taking photos
    const message = document.createElement('div');
    message.className = 'no-photos-message';
    message.style.gridColumn = '1 / span 2';
    message.style.textAlign = 'center';
    message.style.padding = '15px';
    message.style.color = '#888';
    message.innerHTML = '<i class="fas fa-camera" style="font-size: 1.5rem; margin-bottom: 8px; display: block;"></i><p>Your captured photos will appear here</p>';
    photosContainer.appendChild(message);
    
    // Ensure border overlay is on top initially
    setTimeout(() => {
        borderOverlay.style.zIndex = '100';
    }, 100);
});
