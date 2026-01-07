/* ========================================
   Sandro Sandri - The Atlas of Memories (Standalone Page)
   ======================================== */

class AtlasOfMemoriesStandalone {
    constructor() {
        this.storageKey = 'sandroSandri_atlasMemories';
        this.chaptersKey = 'sandroSandri_atlasChapters';
        this.chapters = {
            1: {
                destinations: ['isole-cayman', 'isola-di-necker', 'sardinia'],
                launched: true
            }
        };
        this.userEmail = null;
        this.syncInProgress = false;
        this.pendingSync = false;
        this.init();
    }

    init() {
        // Wait for AuthSystem to initialize
        const checkAuth = () => {
            // Check if user is logged in
            if (!this.isUserLoggedIn()) {
                this.showLoginPrompt();
                return;
            }

            // Get user email
            this.userEmail = this.getUserEmail();
            if (!this.userEmail) {
                // Try again after a short delay
                setTimeout(checkAuth, 500);
                return;
            }

            // Show content, hide login prompt
            this.showContent();
            
            // Continue with initialization
            this.continueInit();
        };

        // Wait a bit for AuthSystem to initialize
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(checkAuth, 500);
            });
        } else {
            setTimeout(checkAuth, 500);
        }
    }

    continueInit() {

        // Listen for atlas sync events from userSync
        window.addEventListener('atlasSynced', (e) => {
            console.log('Atlas synced event received from userSync');
            const atlasData = e.detail;
            if (atlasData) {
                const memories = atlasData.memories || {};
                this.chapters = atlasData.chapters || this.chapters;
                localStorage.setItem(this.storageKey, JSON.stringify(memories));
                localStorage.setItem(this.chaptersKey, JSON.stringify(this.chapters));
                console.log('Rendering synced memories:', Object.keys(memories).length, 'destinations');
                this.renderAndPopulate(memories);
            }
        });

        // ALWAYS load from server first - server is the source of truth
        // Wait for load to complete before initializing listeners
        this.loadMemories(true).then(() => {
            // Initialize event listeners after data is loaded
            this.initImageUploads();
            this.initDateInputs();
            this.initCaptionInputs();
            this.initImageRemoval();
            this.initSaveButtons();
        }).catch(err => {
            console.error('Error loading memories:', err);
            // Still initialize listeners even if load fails
            this.initImageUploads();
            this.initDateInputs();
            this.initCaptionInputs();
            this.initImageRemoval();
        });
        
        // Expose launchChapter method globally for admin use
        window.launchAtlasChapter = (chapterNum, destinations) => {
            this.launchChapter(chapterNum, destinations);
        };

        // Set up periodic sync (every 30 seconds) and visibility change sync
        this.setupAutoSync();
        
        // Store instance globally for sync system
        window.atlasStandaloneInstance = this;
    }

    setupAutoSync() {
        // Sync when page becomes visible (user switches back to tab)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.userEmail) {
                console.log('Page visible, loading memories from server...');
                // Force load from API when page becomes visible
                this.loadMemories(true);
            }
        });

        // Periodic sync every 10 seconds (more frequent for better sync)
        setInterval(() => {
            if (!document.hidden && this.userEmail && !this.syncInProgress) {
                console.log('Periodic sync: loading memories from server...');
                this.loadMemories(true);
            }
        }, 10000);
        
        // Also listen for userSync load events
        window.addEventListener('atlasSynced', (e) => {
            console.log('Atlas synced event received');
            const atlasData = e.detail;
            if (atlasData) {
                const memories = atlasData.memories || {};
                this.chapters = atlasData.chapters || this.chapters;
                localStorage.setItem(this.storageKey, JSON.stringify(memories));
                localStorage.setItem(this.chaptersKey, JSON.stringify(this.chapters));
                this.renderAndPopulate(memories);
            }
        });
    }

    getUserEmail() {
        if (window.AuthSystem && window.AuthSystem.currentUser) {
            return window.AuthSystem.currentUser.email;
        }
        // Fallback: check localStorage
        const userData = localStorage.getItem('sandroSandri_user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                return user.email;
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    isUserLoggedIn() {
        // First check AuthSystem if available
        if (window.AuthSystem) {
            // Make sure AuthSystem is initialized
            if (window.AuthSystem.init && !window.AuthSystem.currentUser) {
                window.AuthSystem.init();
            }
            if (window.AuthSystem.isLoggedIn && window.AuthSystem.isLoggedIn()) {
                return true;
            }
            // Also check currentUser directly
            if (window.AuthSystem.currentUser && window.AuthSystem.currentUser.email) {
                return true;
            }
        }
        // Fallback: check localStorage
        const userData = localStorage.getItem('sandroSandri_user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                // Check if session is still valid
                if (user.expiresAt && new Date(user.expiresAt) > new Date()) {
                    return true;
                }
            } catch (e) {
                // Invalid data
            }
        }
        return false;
    }

    showLoginPrompt() {
        const loginPrompt = document.getElementById('atlas-login-prompt');
        const content = document.getElementById('atlas-content');
        if (loginPrompt) loginPrompt.style.display = 'block';
        if (content) content.style.display = 'none';
    }

    showContent() {
        const loginPrompt = document.getElementById('atlas-login-prompt');
        const content = document.getElementById('atlas-content');
        if (loginPrompt) loginPrompt.style.display = 'none';
        if (content) content.style.display = 'block';
    }

    async loadMemories(forceFromServer = false) {
        if (this.syncInProgress && !forceFromServer) {
            console.log('Load already in progress, skipping');
            return;
        }
        
        this.syncInProgress = true;
        console.log('🔄 Loading memories for email:', this.userEmail, '(Force from server:', forceFromServer, ')');
        
        // ALWAYS load from server first - server is the source of truth
        try {
            const response = await fetch(`/api/atlas/load?email=${encodeURIComponent(this.userEmail)}`);
            console.log('📡 API load response status:', response.status);
            
            if (response.ok) {
                const result = await response.json();
                console.log('📦 API load result - success:', result.success);
                
                if (result.success && result.data) {
                    const apiMemories = result.data.memories || {};
                    const apiChapters = result.data.chapters || {};
                    
                    console.log('📸 Memory destinations from server:', Object.keys(apiMemories));
                    // Log which destinations have images
                    Object.keys(apiMemories).forEach(key => {
                        const memory = apiMemories[key];
                        const hasImage = !!(memory.image && memory.image.length > 0 && memory.image !== 'null');
                        console.log(`  📍 ${key}:`, {
                            hasImage: hasImage,
                            imageSize: hasImage ? Math.round(memory.image.length / 1024) + 'KB' : 'none',
                            hasDate: !!memory.date,
                            hasCaption: !!memory.caption
                        });
                    });
                    
                    // ALWAYS use server data - it's the source of truth
                    // But preserve any images that exist in server data
                    const memories = {};
                    Object.keys(apiMemories).forEach(key => {
                        memories[key] = { ...apiMemories[key] };
                        // Ensure image is preserved if it exists
                        if (memories[key].image && memories[key].image.length > 0 && memories[key].image !== 'null') {
                            // Image is valid, keep it
                        } else {
                            // No valid image, set to null
                            memories[key].image = null;
                        }
                    });
                    this.chapters = { ...this.chapters, ...apiChapters };
                    
                    console.log('💾 Saving to localStorage (metadata only):', Object.keys(memories).length, 'destinations');
                    
                    // Save to localStorage WITHOUT images (images are too large for localStorage)
                    // Only save metadata to localStorage, images stay on server
                    const memoriesForLocalStorage = {};
                    Object.keys(memories).forEach(key => {
                        memoriesForLocalStorage[key] = {
                            date: memories[key].date || null,
                            caption: memories[key].caption || null,
                            updatedAt: memories[key].updatedAt || null
                            // Image is NOT stored in localStorage
                        };
                    });
                    
                    try {
                        localStorage.setItem(this.storageKey, JSON.stringify(memoriesForLocalStorage));
                        localStorage.setItem(this.chaptersKey, JSON.stringify(this.chapters));
                    } catch (error) {
                        if (error.name === 'QuotaExceededError') {
                            console.warn('⚠️ localStorage quota exceeded, skipping local save');
                        } else {
                            console.error('Error saving to localStorage:', error);
                        }
                    }
                    
                    // Render and populate
                    console.log('🎨 Rendering memories...');
                    this.renderAndPopulate(memories);
                    this.syncInProgress = false;
                    return;
                } else {
                    console.warn('⚠️ API returned success but no data');
                }
            } else {
                const errorText = await response.text();
                console.error('API load failed:', response.status, errorText);
            }
        } catch (error) {
            console.error('Error loading from API, using localStorage:', error);
        }
        
        // Fallback: Try to load from localStorage (metadata only)
        // But we MUST load images from server, so try API again
        console.log('⚠️ API load failed, retrying...');
        try {
            const retryResponse = await fetch(`/api/atlas/load?email=${encodeURIComponent(this.userEmail)}`);
            if (retryResponse.ok) {
                const retryResult = await retryResponse.json();
                if (retryResult.success && retryResult.data) {
                    const apiMemories = retryResult.data.memories || {};
                    const apiChapters = retryResult.data.chapters || {};
                    const memories = { ...apiMemories };
                    this.chapters = { ...this.chapters, ...apiChapters };
                    this.renderAndPopulate(memories);
                    this.syncInProgress = false;
                    return;
                }
            }
        } catch (retryError) {
            console.error('Retry also failed:', retryError);
        }
        
        // Last resort: Load metadata from localStorage (no images)
        const saved = localStorage.getItem(this.storageKey);
        const memoriesMetadata = saved ? JSON.parse(saved) : {};
        console.log('⚠️ Using localStorage metadata only (no images):', Object.keys(memoriesMetadata).length, 'destinations');
        
        // Load chapter configuration
        const savedChapters = localStorage.getItem(this.chaptersKey);
        if (savedChapters) {
            this.chapters = JSON.parse(savedChapters);
        }

        // Render with metadata only (images will be missing, but that's okay)
        this.renderAndPopulate(memoriesMetadata);
    }

    renderAndPopulate(memories) {
        console.log('🎨 renderAndPopulate called with', Object.keys(memories).length, 'memories');
        console.log('📋 Memory keys:', Object.keys(memories));
        
        // Render all launched chapters
        this.renderChapters();

        // Load memories for all destinations in all launched chapters
        Object.keys(this.chapters).forEach(chapterNum => {
            const chapter = this.chapters[chapterNum];
            if (chapter.launched) {
                chapter.destinations.forEach(destination => {
                    const memory = memories[destination] || {};
                    
                    console.log(`  📍 Processing destination: ${destination}`);
                    console.log(`     Memory data:`, {
                        hasImage: !!memory.image,
                        imageLength: memory.image ? memory.image.length : 0,
                        date: memory.date || 'none',
                        caption: memory.caption || 'none'
                    });
                    
                    // Load image - CRITICAL: Always check and set image
                    const hasValidImage = !!(memory.image && 
                                           memory.image.length > 0 && 
                                           memory.image !== 'null' && 
                                           memory.image !== 'undefined' &&
                                           memory.image.trim().length > 0);
                    
                    if (hasValidImage) {
                        console.log(`    ✅ Setting image for ${destination}`);
                        console.log(`       Image size: ${Math.round(memory.image.length / 1024)}KB`);
                        console.log(`       Image preview: ${memory.image.substring(0, 50)}...`);
                        this.setDestinationImage(destination, memory.image);
                    } else {
                        console.log(`    ❌ No valid image for ${destination} in server data`);
                        console.log(`       Image value:`, memory.image ? `exists but invalid (length: ${memory.image.length})` : 'null/undefined');
                        
                        // DON'T clear the image if there's already one displayed (might be a timing issue)
                        const card = document.querySelector(`[data-destination="${destination}"]`);
                        if (card) {
                            const preview = card.querySelector('.destination-image-preview');
                            const hasDisplayedImage = preview && preview.src && preview.style.display !== 'none';
                            
                            if (hasDisplayedImage) {
                                console.log(`    ⚠️ Keeping existing displayed image (might be unsaved or server sync pending)`);
                            } else {
                                // Only clear if there's no displayed image
                                const placeholder = card.querySelector('.destination-image-placeholder');
                                const removeBtn = card.querySelector('.destination-image-remove');
                                if (placeholder) placeholder.style.display = 'flex';
                                if (preview) {
                                    preview.src = '';
                                    preview.style.display = 'none';
                                }
                                if (removeBtn) removeBtn.style.display = 'none';
                            }
                        }
                    }

                    // Load date
                    const dateInput = document.getElementById(`${destination}-date`);
                    if (dateInput) {
                        if (memory.date) {
                            dateInput.value = memory.date;
                            console.log(`    ✅ Set date for ${destination}: ${memory.date}`);
                        } else {
                            dateInput.value = '';
                        }
                    }

                    // Load caption
                    const captionInput = document.getElementById(`${destination}-caption`);
                    if (captionInput) {
                        if (memory.caption) {
                            captionInput.value = memory.caption;
                            console.log(`    ✅ Set caption for ${destination}: ${memory.caption}`);
                        } else {
                            captionInput.value = '';
                        }
                    }
                });
            }
        });
        
        console.log('✅ renderAndPopulate completed');
    }

    renderChapters() {
        const container = document.getElementById('atlas-chapters-container');
        if (!container) return;

        // Clear existing chapters (except Chapter I which is in HTML)
        const existingChapters = container.querySelectorAll('.atlas-chapter[data-chapter]:not([data-chapter="1"])');
        existingChapters.forEach(ch => ch.remove());

        // Render additional chapters (2, 3, etc.)
        Object.keys(this.chapters).forEach(chapterNum => {
            const chapterNumInt = parseInt(chapterNum);
            if (chapterNumInt > 1 && this.chapters[chapterNum].launched) {
                this.renderChapter(chapterNumInt, this.chapters[chapterNum].destinations);
            }
        });
    }

    renderChapter(chapterNum, destinations) {
        const container = document.getElementById('atlas-chapters-container');
        if (!container) return;

        const chapterDiv = document.createElement('div');
        chapterDiv.className = 'atlas-chapter';
        chapterDiv.setAttribute('data-chapter', chapterNum);

        const chapterTitle = document.createElement('h3');
        chapterTitle.className = 'chapter-title';
        chapterTitle.textContent = `Chapter ${this.getRomanNumeral(chapterNum)}`;
        chapterDiv.appendChild(chapterTitle);

        const destinationsDiv = document.createElement('div');
        destinationsDiv.className = 'atlas-destinations';

        // Render destination cards (same structure as Chapter I)
        destinations.forEach((destination, index) => {
            const destinationData = this.getDestinationData(destination);
            const card = this.createDestinationCard(destination, destinationData.name);
            destinationsDiv.appendChild(card);
        });

        chapterDiv.appendChild(destinationsDiv);
        container.appendChild(chapterDiv);
    }

    getRomanNumeral(num) {
        const romanNumerals = {
            1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V',
            6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X'
        };
        return romanNumerals[num] || num.toString();
    }

    getDestinationData(destination) {
        const destinations = {
            'isole-cayman': { name: 'Isole Cayman' },
            'isola-di-necker': { name: 'Isola di Necker' },
            'sardinia': { name: 'Sardinia' }
        };
        return destinations[destination] || { name: destination };
    }

    createDestinationCard(destination, destinationName) {
        const card = document.createElement('div');
        card.className = 'destination-card';
        card.setAttribute('data-destination', destination);

        card.innerHTML = `
            <div class="destination-image-upload">
                <input type="file" class="destination-image-input" accept="image/*" data-destination="${destination}">
                <div class="destination-image-placeholder">
                    <p class="placeholder-text">This destination will wait for you.</p>
                </div>
                <img class="destination-image-preview" src="" alt="${destinationName}" style="display: none;">
                <button class="destination-image-remove" style="display: none;" aria-label="Remove image">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <h3 class="destination-name">${destinationName}</h3>
            <div class="destination-form">
                <div class="destination-field">
                    <label for="${destination}-date" class="destination-label">Date of visit</label>
                    <input type="month" id="${destination}-date" class="destination-date-input" data-destination="${destination}">
                </div>
                <div class="destination-field">
                    <input type="text" id="${destination}-caption" class="destination-caption-input" placeholder="A quiet moment worth remembering" maxlength="80" data-destination="${destination}">
                </div>
                <button type="button" class="destination-save-btn" data-destination="${destination}">Save</button>
            </div>
        `;

        return card;
    }

    launchChapter(chapterNum, destinations) {
        if (!this.chapters[chapterNum]) {
            this.chapters[chapterNum] = {
                destinations: destinations,
                launched: true
            };
            this.saveChapters();
            this.renderChapters();
            // Re-initialize event listeners for new cards
            this.initImageUploads();
            this.initDateInputs();
            this.initCaptionInputs();
            this.initImageRemoval();
        }
    }

    saveChapters() {
        localStorage.setItem(this.chaptersKey, JSON.stringify(this.chapters));
        // Sync to server via unified sync
        if (window.userSync) {
            window.userSync.forceSync();
        } else {
            // Fallback to old method
            this.syncToAPI();
        }
    }

    async saveMemory(destination, data) {
        const saved = localStorage.getItem(this.storageKey);
        const memories = saved ? JSON.parse(saved) : {};
        
        memories[destination] = {
            ...memories[destination],
            ...data,
            updatedAt: new Date().toISOString()
        };

        // Save to localStorage immediately (for fast UI updates)
        localStorage.setItem(this.storageKey, JSON.stringify(memories));

        // Sync to server IMMEDIATELY - don't wait, but ensure it happens
        console.log('Saving memory for:', destination, 'Data keys:', Object.keys(data));
        
        if (window.userSync && window.userSync.userEmail) {
            console.log('Syncing memory to server via userSync:', destination);
            // Use forceSync to ensure immediate save
            window.userSync.forceSync().catch(err => {
                console.error('Error syncing via userSync, trying direct API:', err);
                // Fallback to direct API if userSync fails
                this.syncToAPI();
            });
        } else {
            // Fallback to direct API method
            console.log('Using direct API sync (userSync not available)');
            await this.syncToAPI();
        }
    }

    async syncToAPI() {
        if (!this.userEmail) {
            console.error('Cannot sync: no user email');
            return;
        }

        // Debounce: wait 500ms before syncing to avoid too many API calls
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
        }

        this.syncTimeout = setTimeout(async () => {
            if (this.syncInProgress) {
                this.pendingSync = true;
                return;
            }

            this.syncInProgress = true;
            this.pendingSync = false;

            try {
                const memories = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
                const chaptersData = localStorage.getItem(this.chaptersKey);
                const chapters = chaptersData ? JSON.parse(chaptersData) : this.chapters;

                console.log('Syncing to API - Email:', this.userEmail, 'Memories:', Object.keys(memories).length);

                const response = await fetch('/api/atlas/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: this.userEmail,
                        memories: memories,
                        chapters: chapters
                    })
                });

                console.log('Sync response status:', response.status);

                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        console.log('Atlas data synced to server successfully');
                    } else {
                        console.error('Sync failed:', result);
                    }
                } else {
                    const errorText = await response.text();
                    console.error('Failed to sync atlas data to server:', response.status, errorText);
                }
            } catch (error) {
                console.error('Error syncing atlas data:', error);
            } finally {
                this.syncInProgress = false;
                
                // If there was a pending sync, do it now
                if (this.pendingSync) {
                    this.syncToAPI();
                }
            }
        }, 500);
    }

    initImageUploads() {
        document.querySelectorAll('.destination-image-input').forEach(input => {
            // Remove existing listeners to avoid duplicates
            const newInput = input.cloneNode(true);
            input.parentNode.replaceChild(newInput, input);
            
            newInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                // Validate file type
                if (!file.type.startsWith('image/')) {
                    alert('Please select an image file');
                    return;
                }

                // Validate file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    alert('Image size must be less than 5MB');
                    return;
                }

                const destination = newInput.dataset.destination;
                this.handleImageUpload(destination, file);
            });
        });

        // Make image upload area clickable
        document.querySelectorAll('.destination-image-upload').forEach(uploadArea => {
            uploadArea.addEventListener('click', (e) => {
                // Don't trigger if clicking on remove button or preview image
                if (e.target.closest('.destination-image-remove') || e.target.classList.contains('destination-image-preview')) {
                    return;
                }
                const input = uploadArea.querySelector('.destination-image-input');
                if (input) {
                    e.stopPropagation();
                    input.click();
                }
            });
        });
    }

    handleImageUpload(destination, file) {
        // Compress image before converting to base64
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Create canvas to compress image - MORE AGGRESSIVE COMPRESSION
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;  // Reduced from 1200
                const MAX_HEIGHT = 800;  // Reduced from 1200
                const QUALITY = 0.6;     // Reduced from 0.8 to 60% quality
                
                let width = img.width;
                let height = img.height;
                
                // Calculate new dimensions
                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height = (height * MAX_WIDTH) / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width = (width * MAX_HEIGHT) / height;
                        height = MAX_HEIGHT;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to base64 with compression - try different quality levels if too large
                let compressedDataUrl = canvas.toDataURL('image/jpeg', QUALITY);
                let quality = QUALITY;
                
                // If still too large, reduce quality further
                while (compressedDataUrl.length > 1500000 && quality > 0.3) { // ~1.5MB limit
                    quality -= 0.1;
                    compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                }
                
                // If still too large, reduce dimensions
                if (compressedDataUrl.length > 1500000) {
                    const smallerWidth = Math.round(width * 0.7);
                    const smallerHeight = Math.round(height * 0.7);
                    canvas.width = smallerWidth;
                    canvas.height = smallerHeight;
                    ctx.drawImage(img, 0, 0, smallerWidth, smallerHeight);
                    compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5);
                }
                
                console.log('📸 Image compressed:', {
                    original: Math.round(file.size / 1024) + 'KB',
                    compressed: Math.round(compressedDataUrl.length / 1024) + 'KB',
                    reduction: Math.round((1 - compressedDataUrl.length / file.size) * 100) + '%',
                    finalQuality: quality
                });
                
                // Show the compressed image preview
                this.setDestinationImage(destination, compressedDataUrl);
                this.showNotification('Image ready - click Save to save');
            };
            
            img.onerror = () => {
                alert('Error processing image file');
            };
            
            img.src = e.target.result;
        };

        reader.onerror = () => {
            alert('Error reading image file');
        };

        reader.readAsDataURL(file);
    }

    async forceSync() {
        // Clear any pending debounce
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
        }

        if (this.syncInProgress) {
            this.pendingSync = true;
            return;
        }

        this.syncInProgress = true;
        this.pendingSync = false;

        try {
            const memories = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
            const chaptersData = localStorage.getItem(this.chaptersKey);
            const chapters = chaptersData ? JSON.parse(chaptersData) : this.chapters;

            console.log('Force syncing to API - Email:', this.userEmail);

            const response = await fetch('/api/atlas/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: this.userEmail,
                    memories: memories,
                    chapters: chapters
                })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    console.log('Force sync successful');
                }
            } else {
                const errorText = await response.text();
                console.error('Force sync failed:', response.status, errorText);
            }
        } catch (error) {
            console.error('Error in force sync:', error);
        } finally {
            this.syncInProgress = false;
            
            if (this.pendingSync) {
                this.forceSync();
            }
        }
    }

    setDestinationImage(destination, imageDataUrl) {
        const card = document.querySelector(`[data-destination="${destination}"]`);
        if (!card) return;

        const placeholder = card.querySelector('.destination-image-placeholder');
        const preview = card.querySelector('.destination-image-preview');
        const removeBtn = card.querySelector('.destination-image-remove');

        if (placeholder) placeholder.style.display = 'none';
        if (preview) {
            preview.src = imageDataUrl;
            preview.style.display = 'block';
        }
        if (removeBtn) removeBtn.style.display = 'block';
    }

    initImageRemoval() {
        document.querySelectorAll('.destination-image-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = btn.closest('.destination-card');
                const destination = card.dataset.destination;
                this.removeDestinationImage(destination);
            });
        });
    }

    async removeDestinationImage(destination) {
        const card = document.querySelector(`[data-destination="${destination}"]`);
        if (!card) return;

        const placeholder = card.querySelector('.destination-image-placeholder');
        const preview = card.querySelector('.destination-image-preview');
        const removeBtn = card.querySelector('.destination-image-remove');
        const input = card.querySelector('.destination-image-input');

        if (placeholder) placeholder.style.display = 'flex';
        if (preview) {
            preview.src = '';
            preview.style.display = 'none';
        }
        if (removeBtn) removeBtn.style.display = 'none';
        if (input) input.value = '';

        // Remove image immediately and save
        await this.saveMemory(destination, { image: null });
        
        // Force immediate sync to server
        if (window.userSync && window.userSync.userEmail) {
            await window.userSync.forceSync();
        } else {
            await this.forceSync();
        }
        
        this.showNotification('Image removed');
    }

    initDateInputs() {
        // Date inputs no longer auto-save - they wait for Save button
        // Just remove any auto-save behavior
        document.querySelectorAll('.destination-date-input').forEach(input => {
            // No event listener - data is saved when Save button is clicked
        });
    }

    initCaptionInputs() {
        // Caption inputs no longer auto-save - they wait for Save button
        // Just remove any auto-save behavior
        document.querySelectorAll('.destination-caption-input').forEach(input => {
            // No event listener - data is saved when Save button is clicked
        });
    }

    initSaveButtons() {
        document.querySelectorAll('.destination-save-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const destination = button.dataset.destination;
                if (!destination) return;

                // Disable button while saving
                button.disabled = true;
                button.textContent = 'Saving...';

                try {
                    // Get all current data for this destination
                    const card = document.querySelector(`[data-destination="${destination}"]`);
                    if (!card) {
                        console.error('Card not found for destination:', destination);
                        button.disabled = false;
                        button.textContent = 'Save';
                        return;
                    }

                    // Get image (if uploaded)
                    const imagePreview = card.querySelector('.destination-image-preview');
                    const imageDataUrl = imagePreview && imagePreview.style.display !== 'none' && imagePreview.src
                        ? imagePreview.src 
                        : null;

                    // Get date
                    const dateInput = document.getElementById(`${destination}-date`);
                    const dateValue = dateInput ? dateInput.value : null;

                    // Get caption
                    const captionInput = document.getElementById(`${destination}-caption`);
                    const captionValue = captionInput ? captionInput.value.trim() : null;

                    // Prepare data to save - include all fields
                    const dataToSave = {
                        image: imageDataUrl || null,
                        date: dateValue || null,
                        caption: captionValue || null
                    };

                    const imageSizeKB = imageDataUrl ? Math.round(imageDataUrl.length / 1024) : 0;
                    console.log('💾 Saving destination:', destination);
                    console.log('   Image:', imageDataUrl ? `Yes (${imageSizeKB}KB)` : 'No');
                    console.log('   Date:', dateValue || 'None');
                    console.log('   Caption:', captionValue || 'None');
                    
                    // Check if image is too large (Vercel limit is ~4.5MB, but we'll be conservative)
                    if (imageSizeKB > 2000) {
                        console.error('❌ Image too large:', imageSizeKB, 'KB (max ~2000KB)');
                        this.showNotification('Image too large. Please use a smaller image or try again (it will compress more).');
                        button.disabled = false;
                        button.textContent = 'Save';
                        return;
                    }

                    // Prepare data to save - images are too large for localStorage
                    const saved = localStorage.getItem(this.storageKey);
                    const memories = saved ? JSON.parse(saved) : {};
                    
                    // Update memory with new data
                    memories[destination] = {
                        ...memories[destination],
                        ...dataToSave,
                        updatedAt: new Date().toISOString()
                    };

                    // Save to localStorage WITHOUT images (images are too large)
                    // Only save metadata (date, caption) to localStorage
                    const memoriesForLocalStorage = {};
                    Object.keys(memories).forEach(key => {
                        memoriesForLocalStorage[key] = {
                            date: memories[key].date || null,
                            caption: memories[key].caption || null,
                            updatedAt: memories[key].updatedAt || null
                            // Image is NOT stored in localStorage - only on server
                        };
                    });
                    
                    try {
                        localStorage.setItem(this.storageKey, JSON.stringify(memoriesForLocalStorage));
                        localStorage.setItem(this.chaptersKey, JSON.stringify(this.chapters));
                        console.log('✅ Saved metadata to localStorage (images excluded)');
                    } catch (error) {
                        if (error.name === 'QuotaExceededError') {
                            console.warn('⚠️ localStorage quota exceeded, skipping local save');
                        } else {
                            console.error('Error saving to localStorage:', error);
                        }
                    }

                    // Now sync to server using direct API call (more reliable)
                    // Server gets the FULL data including images
                    console.log('🔄 Saving to server (with images)...');
                    const payloadSize = JSON.stringify(memories).length;
                    console.log('   Total payload size:', Math.round(payloadSize / 1024), 'KB');
                    console.log('   Memories being saved:', Object.keys(memories));
                    
                    // Log what we're about to save
                    Object.keys(memories).forEach(key => {
                        const mem = memories[key];
                        console.log(`   📍 ${key}:`, {
                            hasImage: !!(mem.image && mem.image.length > 0),
                            imageSize: mem.image ? Math.round(mem.image.length / 1024) + 'KB' : 'none',
                            hasDate: !!mem.date,
                            hasCaption: !!mem.caption
                        });
                    });
                    
                    const syncSuccess = await this.saveToServerDirectly(memories, this.chapters);
                    
                    if (syncSuccess) {
                        console.log('✅ Saved to server successfully - data persisted!');
                        this.showNotification('Saved successfully');
                        
                        // Wait a bit longer before reloading to ensure KV has time to persist
                        console.log('⏳ Waiting 2 seconds before reloading to verify save...');
                        setTimeout(async () => {
                            console.log('🔄 Reloading from server to verify...');
                            await this.loadMemories(true);
                        }, 2000);
                    } else {
                        console.error('❌ Failed to save to server');
                        console.error('   Check Vercel function logs for details');
                        this.showNotification('Failed to save. Check console for details.');
                    }

                    // Re-enable button
                    button.disabled = false;
                    button.textContent = 'Save';

                } catch (error) {
                    console.error('❌ Error saving destination:', error);
                    this.showNotification('Error saving. Please try again.');
                    
                    // Re-enable button
                    button.disabled = false;
                    button.textContent = 'Save';
                }
            });
        });
    }

    async saveToServerDirectly(memories, chapters) {
        if (!this.userEmail) {
            console.error('No user email for saving');
            return false;
        }

        try {
            const payload = {
                email: this.userEmail,
                memories: memories,
                chapters: chapters
            };
            
            const payloadSize = JSON.stringify(payload).length;
            const payloadSizeKB = Math.round(payloadSize / 1024);
            
            console.log('🔄 Syncing to server directly...');
            console.log('   Email:', this.userEmail);
            console.log('   Memories to save:', Object.keys(memories).length);
            console.log('   Memory keys:', Object.keys(memories));
            console.log('   Total payload size:', payloadSizeKB, 'KB');
            
            // Log each memory being saved
            Object.keys(memories).forEach(key => {
                const mem = memories[key];
                const hasImage = !!(mem.image && mem.image.length > 0);
                console.log(`   📍 ${key}:`, {
                    hasImage: hasImage,
                    imageSize: hasImage ? Math.round(mem.image.length / 1024) + 'KB' : 'none',
                    hasDate: !!mem.date,
                    hasCaption: !!mem.caption
                });
            });
            
            // Check payload size before sending (Vercel limit is ~4.5MB, be conservative)
            if (payloadSizeKB > 2500) {
                console.error('❌ Payload too large:', payloadSizeKB, 'KB (max ~2500KB)');
                console.error('   Try reducing image size or removing other memories');
                return false;
            }
            
            console.log('📤 Sending POST request to /api/atlas/save...');
            const response = await fetch('/api/atlas/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            console.log('📡 Server response status:', response.status);

            if (response.ok) {
                const result = await response.json();
                console.log('📦 Server response body:', result);
                
                if (result.success) {
                    console.log('✅ Server save successful - data persisted!');
                    
                    // Immediately verify by loading back
                    console.log('🔍 Verifying save by loading data back in 2 seconds...');
                    setTimeout(async () => {
                        console.log('🔍 Loading data to verify save...');
                        const verifyResponse = await fetch(`/api/atlas/load?email=${encodeURIComponent(this.userEmail)}`);
                        if (verifyResponse.ok) {
                            const verifyResult = await verifyResponse.json();
                            const loadedMemories = verifyResult.data?.memories || {};
                            console.log('🔍 Verification load result:');
                            console.log('   Loaded memories count:', Object.keys(loadedMemories).length);
                            console.log('   Loaded memory keys:', Object.keys(loadedMemories));
                            
                            if (Object.keys(loadedMemories).length === 0) {
                                console.error('❌ VERIFICATION FAILED: No memories loaded back from server!');
                                console.error('   This means the save did not persist. Check Vercel function logs.');
                                console.error('   Most likely: KV/Redis is not configured or not working.');
                            } else {
                                console.log('✅ Verification successful: Memories were saved and can be loaded back!');
                                Object.keys(loadedMemories).forEach(key => {
                                    const mem = loadedMemories[key];
                                    const hasImage = !!(mem.image && mem.image.length > 0);
                                    console.log(`   📍 ${key}:`, {
                                        hasImage: hasImage,
                                        imageSize: hasImage ? Math.round(mem.image.length / 1024) + 'KB' : 'none'
                                    });
                                });
                            }
                        } else {
                            console.error('❌ Verification load failed:', verifyResponse.status);
                        }
                    }, 2000);
                    
                    return true;
                } else {
                    console.error('❌ Server returned error:', result);
                    return false;
                }
            } else {
                const errorText = await response.text();
                console.error('❌ Server save failed:', response.status);
                console.error('   Error response:', errorText);
                
                if (response.status === 413) {
                    console.error('❌ Payload too large! Image needs to be smaller.');
                } else if (response.status === 500) {
                    console.error('❌ Server error! Check Vercel function logs for details.');
                }
                
                return false;
            }
        } catch (error) {
            console.error('❌ Error syncing to server:', error);
            return false;
        }
    }

    showNotification(message) {
        // Use existing notification system if available
        if (window.showNotification) {
            window.showNotification(message);
            return;
        }

        // Fallback notification
        const existingToast = document.querySelector('.atlas-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'atlas-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('visible');
        });

        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
}

// Initialize Atlas of Memories when DOM is ready
function initAtlasOfMemoriesStandalone() {
    // Wait a bit for auth.js to initialize if needed
    setTimeout(() => {
        if (!window.atlasStandaloneInstance) {
            try {
                window.atlasStandaloneInstance = new AtlasOfMemoriesStandalone();
                window.AtlasOfMemoriesStandalone = AtlasOfMemoriesStandalone;
            } catch (error) {
                console.error('Error initializing Atlas of Memories:', error);
            }
        }
    }, 200);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAtlasOfMemoriesStandalone);
} else {
    // DOM is already ready
    initAtlasOfMemoriesStandalone();
}

