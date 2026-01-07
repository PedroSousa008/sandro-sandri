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
                        console.log(`  📍 ${key}:`, {
                            hasImage: !!memory.image,
                            hasDate: !!memory.date,
                            hasCaption: !!memory.caption
                        });
                    });
                    
                    // ALWAYS use server data - it's the source of truth
                    const memories = { ...apiMemories };
                    this.chapters = { ...this.chapters, ...apiChapters };
                    
                    console.log('💾 Saving to localStorage:', Object.keys(memories).length, 'destinations');
                    
                    // Save to localStorage as cache
                    localStorage.setItem(this.storageKey, JSON.stringify(memories));
                    localStorage.setItem(this.chaptersKey, JSON.stringify(this.chapters));
                    
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
        
        // Fallback to localStorage
        const saved = localStorage.getItem(this.storageKey);
        const memories = saved ? JSON.parse(saved) : {};
        console.log('Loaded memories from localStorage:', Object.keys(memories).length, 'destinations');
        
        // Load chapter configuration
        const savedChapters = localStorage.getItem(this.chaptersKey);
        if (savedChapters) {
            this.chapters = JSON.parse(savedChapters);
        }

        // If we have local data, sync it to API
        if (hasLocalData) {
            console.log('Syncing local data to API...');
            await this.forceSync();
        }

        // Render and populate
        this.renderAndPopulate(memories);
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
                    if (memory.image && memory.image.length > 0) {
                        console.log(`    ✅ Setting image for ${destination} (${memory.image.substring(0, 50)}...)`);
                        this.setDestinationImage(destination, memory.image);
                    } else {
                        console.log(`    ❌ No image for ${destination}`);
                        // Clear image if it was removed
                        const card = document.querySelector(`[data-destination="${destination}"]`);
                        if (card) {
                            const placeholder = card.querySelector('.destination-image-placeholder');
                            const preview = card.querySelector('.destination-image-preview');
                            const removeBtn = card.querySelector('.destination-image-remove');
                            if (placeholder) placeholder.style.display = 'flex';
                            if (preview) {
                                preview.src = '';
                                preview.style.display = 'none';
                            }
                            if (removeBtn) removeBtn.style.display = 'none';
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
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const imageDataUrl = e.target.result;
            // Just show the image preview - don't save yet
            this.setDestinationImage(destination, imageDataUrl);
            this.showNotification('Image ready - click Save to save');
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

                    console.log('💾 Saving destination:', destination);
                    console.log('   Image:', imageDataUrl ? 'Yes' : 'No');
                    console.log('   Date:', dateValue || 'None');
                    console.log('   Caption:', captionValue || 'None');

                    // Save to localStorage first
                    const saved = localStorage.getItem(this.storageKey);
                    const memories = saved ? JSON.parse(saved) : {};
                    memories[destination] = {
                        ...memories[destination],
                        ...dataToSave,
                        updatedAt: new Date().toISOString()
                    };
                    localStorage.setItem(this.storageKey, JSON.stringify(memories));

                    // Save chapters too
                    localStorage.setItem(this.chaptersKey, JSON.stringify(this.chapters));

                    console.log('✅ Saved to localStorage');

                    // Now sync to server using direct API call (more reliable)
                    const syncSuccess = await this.saveToServerDirectly(memories, this.chapters);
                    
                    if (syncSuccess) {
                        console.log('✅ Saved to server successfully');
                        this.showNotification('Saved successfully');
                    } else {
                        console.error('❌ Failed to save to server');
                        this.showNotification('Saved locally, but sync failed. Please try again.');
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
            console.log('🔄 Syncing to server directly...');
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
                    console.log('✅ Server save successful');
                    return true;
                } else {
                    console.error('❌ Server returned error:', result);
                    return false;
                }
            } else {
                const errorText = await response.text();
                console.error('❌ Server save failed:', response.status, errorText);
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

