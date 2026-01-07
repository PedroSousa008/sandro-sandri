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
        // Check if user is logged in
        if (!this.isUserLoggedIn()) {
            this.showLoginPrompt();
            return;
        }

        // Get user email
        this.userEmail = this.getUserEmail();
        if (!this.userEmail) {
            this.showLoginPrompt();
            return;
        }

        // Show content, hide login prompt
        this.showContent();

        // Load saved memories from API (with localStorage fallback)
        // Wait for load to complete before initializing listeners
        this.loadMemories().then(() => {
            // Initialize event listeners after data is loaded
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
    }

    setupAutoSync() {
        // Sync when page becomes visible (user switches back to tab)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.userEmail) {
                // Reload from API when page becomes visible
                this.loadMemories();
            }
        });

        // Periodic sync every 30 seconds (in case user has page open on multiple devices)
        setInterval(() => {
            if (!document.hidden && this.userEmail && !this.syncInProgress) {
                this.loadMemories();
            }
        }, 30000);
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
        // Check if user is logged in via AuthSystem
        if (window.AuthSystem && window.AuthSystem.isLoggedIn()) {
            return true;
        }
        // Fallback: check localStorage
        const user = localStorage.getItem('sandroSandri_user');
        return user !== null;
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

    async loadMemories() {
        console.log('Loading memories for email:', this.userEmail);
        
        // Check localStorage first to see if there's local data
        const localMemories = localStorage.getItem(this.storageKey);
        const localChapters = localStorage.getItem(this.chaptersKey);
        const hasLocalData = localMemories && JSON.parse(localMemories) && Object.keys(JSON.parse(localMemories)).length > 0;
        
        // First, try to load from API
        try {
            const response = await fetch(`/api/atlas/load?email=${encodeURIComponent(this.userEmail)}`);
            console.log('API load response status:', response.status);
            
            if (response.ok) {
                const result = await response.json();
                console.log('API load result:', result);
                
                if (result.success && result.data) {
                    const apiMemories = result.data.memories || {};
                    const apiChapters = result.data.chapters || {};
                    
                    // If we have local data but API is empty, sync local to API
                    if (hasLocalData && Object.keys(apiMemories).length === 0) {
                        console.log('Local data exists but API is empty, syncing local to API...');
                        await this.forceSync();
                        // After sync, use local data
                        const memories = JSON.parse(localMemories);
                        this.chapters = localChapters ? JSON.parse(localChapters) : this.chapters;
                        localStorage.setItem(this.storageKey, JSON.stringify(memories));
                        localStorage.setItem(this.chaptersKey, JSON.stringify(this.chapters));
                        this.renderAndPopulate(memories);
                        return;
                    }
                    
                    // Use data from API (merge with local if API has less data)
                    const localMemoriesObj = localMemories ? JSON.parse(localMemories) : {};
                    const memories = { ...localMemoriesObj, ...apiMemories }; // API takes precedence
                    this.chapters = { ...this.chapters, ...apiChapters };
                    
                    console.log('Loaded memories from API:', Object.keys(memories).length, 'destinations');
                    
                    // Save to localStorage as cache
                    localStorage.setItem(this.storageKey, JSON.stringify(memories));
                    localStorage.setItem(this.chaptersKey, JSON.stringify(this.chapters));
                    
                    // Render and populate
                    this.renderAndPopulate(memories);
                    return;
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
        // Render all launched chapters
        this.renderChapters();

        // Load memories for all destinations in all launched chapters
        Object.keys(this.chapters).forEach(chapterNum => {
            const chapter = this.chapters[chapterNum];
            if (chapter.launched) {
                chapter.destinations.forEach(destination => {
                    const memory = memories[destination] || {};
                    
                    // Load image
                    if (memory.image) {
                        this.setDestinationImage(destination, memory.image);
                    }

                    // Load date
                    if (memory.date) {
                        const dateInput = document.getElementById(`${destination}-date`);
                        if (dateInput) {
                            dateInput.value = memory.date;
                        }
                    }

                    // Load caption
                    if (memory.caption) {
                        const captionInput = document.getElementById(`${destination}-caption`);
                        if (captionInput) {
                            captionInput.value = memory.caption;
                        }
                    }
                });
            }
        });
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
        // Sync to API
        this.syncToAPI();
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

        // Sync to API (debounced)
        this.syncToAPI();
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
        
        reader.onload = async (e) => {
            const imageDataUrl = e.target.result;
            this.setDestinationImage(destination, imageDataUrl);
            await this.saveMemory(destination, { image: imageDataUrl });
            this.showNotification('Image saved');
            // Force immediate sync for images
            await this.forceSync();
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

        await this.saveMemory(destination, { image: null });
        this.showNotification('Image removed');
        await this.forceSync();
    }

    initDateInputs() {
        document.querySelectorAll('.destination-date-input').forEach(input => {
            input.addEventListener('change', async (e) => {
                const destination = input.dataset.destination;
                const dateValue = e.target.value;
                
                if (dateValue) {
                    await this.saveMemory(destination, { date: dateValue });
                    this.showNotification('Date saved');
                    await this.forceSync();
                } else {
                    await this.saveMemory(destination, { date: null });
                    await this.forceSync();
                }
            });
        });
    }

    initCaptionInputs() {
        document.querySelectorAll('.destination-caption-input').forEach(input => {
            // Save on blur (when user finishes typing)
            input.addEventListener('blur', async (e) => {
                const destination = input.dataset.destination;
                const caption = e.target.value.trim();
                
                await this.saveMemory(destination, { caption: caption || null });
                if (caption) {
                    this.showNotification('Caption saved');
                }
                await this.forceSync();
            });

            // Character counter (optional, subtle)
            input.addEventListener('input', (e) => {
                const length = e.target.value.length;
                const maxLength = 80;
                // Could add a subtle character counter here if needed
            });
        });
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

