// DOM elements
const video = document.getElementById('video');
const captureBtn = document.getElementById('captureBtn');
const photosContainer = document.getElementById('photosContainer');
const notification = document.getElementById('notification');
const borderOverlay = document.getElementById('borderOverlay');
const hiddenCanvas = document.getElementById('hiddenCanvas');
const hiddenCtx = hiddenCanvas.getContext('2d');

// File upload input
const borderUpload = document.getElementById('borderUpload');
const borderPreview = document.getElementById('borderPreview');
const borderStatus = document.getElementById('borderStatus');
const customUploadContainer = document.getElementById('customUploadContainer');
const frameOptions = document.querySelectorAll('.frame-option');

// Store loaded border image
let loadedBorder = null;
let borderFileData = null;
let currentFrame = 'default'; // Track current selected frame

// State variables
let photos = [];
let isLoading = false;
let isFrontCamera = true; // Track if we're using front camera

// Predefined frames with fallback generators - UPDATED TO border1.png
const predefinedFrames = {
    'default': createDefaultFrame, // Transparent default frame
    'border1.png': 'border1.png', // Your local frame - CHANGED TO border1.png
    'frame2': createHeartFrame,
    'frame3': createStarFrame,
    'frame4': createSquareFrame,
    'custom': null // Will be set from uploaded image
};

// Initialize webcam
async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user' // Use front camera by default
            } 
        });
        video.srcObject = stream;
        showNotification("Camera connected successfully!");
        
        // Set to front camera mode
        isFrontCamera = true;
        
        // Load previously saved custom border from localStorage
        loadSavedBorder();
        
        // Load the default frame initially
        loadFrame('default');
        
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

// Load a frame
function loadFrame(frameType, customUrl = null) {
    console.log(`Loading frame: ${frameType}`);
    
    if (frameType === 'default') {
        // Use transparent default frame
        loadedBorder = createDefaultFrame();
        applyPngBorder();
        updateBorderStatus(true, 'Default frame');
    } 
    else if (frameType === 'border1.png') { // CHANGED TO border1.png
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

// Load local frame (border1.png) - UPDATED FUNCTION NAME IN COMMENTS
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

// Create a transparent default frame (only border, no background)
function createDefaultFrame() {
    const canvas = document.createElement('canvas');
    // Use common webcam aspect ratio (16:9)
    canvas.width = 1280;
    canvas.height = 720;
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
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    
    // Start with COMPLETELY transparent canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw heart border (semitransparent)
    ctx.strokeStyle = 'rgba(255, 105, 180, 0.7)'; // Hot pink with transparency
    ctx.lineWidth = 8;
    
    // Draw heart shapes around the border (transparent fill)
    for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const x = canvas.width/2 + Math.cos(angle) * 550;
        const y = canvas.height/2 + Math.sin(angle) * 300;
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
    canvas.width = 1280;
    canvas.height = 720;
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
        const x = canvas.width/2 + Math.cos(angle) * 500;
        const y = canvas.height/2 + Math.sin(angle) * 250;
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
    canvas.width = 1280;
    canvas.height = 720;
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

// Capture photo with border - FIXED VERSION
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
        
        // Create canvas for final image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Use video dimensions for canvas, not border dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        console.log("Canvas size:", canvas.width, "x", canvas.height);
        console.log("Border size:", loadedBorder.width, "x", loadedBorder.height);
        
        // Clear canvas with transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw the video frame first (as background)
        if (isFrontCamera) {
            // Save the current context state
            ctx.save();
            
            // Flip the context horizontally for front camera
            ctx.scale(-1, 1);
            ctx.translate(-canvas.width, 0);
            
            // Draw the video frame (flipped)
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Restore the context state
            ctx.restore();
        } else {
            // For rear camera, draw normally without flipping
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
        
        // Calculate border position and size to fit on video
        // We want to scale the border to fit the video dimensions
        const borderRatio = loadedBorder.width / loadedBorder.height;
        const videoRatio = canvas.width / canvas.height;
        
        let borderWidth, borderHeight, borderX, borderY;
        
        // Scale border to fit while maintaining aspect ratio
        if (borderRatio > videoRatio) {
            // Border is wider than video - fit to width
            borderWidth = canvas.width;
            borderHeight = canvas.width / borderRatio;
            borderX = 0;
            borderY = (canvas.height - borderHeight) / 2;
        } else {
            // Border is taller than video - fit to height
            borderHeight = canvas.height;
            borderWidth = canvas.height * borderRatio;
            borderX = (canvas.width - borderWidth) / 2;
            borderY = 0;
        }
        
        console.log("Drawing border at:", borderX, borderY, borderWidth, borderHeight);
        
        // Draw border image on top (transparent frame)
        ctx.drawImage(loadedBorder, borderX, borderY, borderWidth, borderHeight);
        
        // Create image data URL
        const imageData = canvas.toDataURL('image/png');
        
        // Add photo to gallery
        addPhotoToGallery(imageData);
        
        // Show notification
        showNotification("Photo captured successfully!");
        
    } catch (error) {
        console.error("Error capturing photo:", error);
        showNotification("Error capturing photo. Please try again.", true);
    } finally {
        isLoading = false;
        captureBtn.disabled = false;
        captureBtn.innerHTML = '<i class="fas fa-camera"></i>';
    }
}

// Add photo to gallery
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

// Download photo
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
    captureBtn.addEventListener('click', capturePhoto);
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