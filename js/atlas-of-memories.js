/* ========================================
   Sandro Sandri - The Atlas of Memories
   ======================================== */

class AtlasOfMemories {
    constructor() {
        this.storageKey = 'sandroSandri_atlasMemories';
        this.destinations = ['isole-cayman', 'isola-di-necker', 'sardinia'];
        this.init();
    }

    init() {
        // Check if user is logged in
        if (!this.isUserLoggedIn()) {
            this.showLoginPrompt();
            return;
        }

        // Load saved memories
        this.loadMemories();

        // Initialize event listeners
        this.initImageUploads();
        this.initDateInputs();
        this.initCaptionInputs();
        this.initImageRemoval();
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
        const overviewTab = document.getElementById('overview-tab');
        if (overviewTab) {
            overviewTab.innerHTML = `
                <div class="atlas-login-prompt">
                    <h2 class="atlas-title">The Atlas of Memories</h2>
                    <p class="atlas-subtitle">Please log in to document your travel memories</p>
                    <a href="login.html" class="cta-button">Login</a>
                </div>
            `;
        }
    }

    loadMemories() {
        const saved = localStorage.getItem(this.storageKey);
        const memories = saved ? JSON.parse(saved) : {};

        this.destinations.forEach(destination => {
            const memory = memories[destination] || {};
            
            // Load image
            if (memory.image) {
                this.setDestinationImage(destination, memory.image);
            }

            // Load date
            if (memory.date) {
                // Map destination IDs to actual input IDs
                const dateInputId = destination === 'isole-cayman' ? 'isole-cayman-date' :
                                  destination === 'isola-di-necker' ? 'isola-di-necker-date' :
                                  'sardinia-date';
                const dateInput = document.getElementById(dateInputId);
                if (dateInput) {
                    dateInput.value = memory.date;
                }
            }

            // Load caption
            if (memory.caption) {
                // Map destination IDs to actual input IDs
                const captionInputId = destination === 'isole-cayman' ? 'isole-cayman-caption' :
                                     destination === 'isola-di-necker' ? 'isola-di-necker-caption' :
                                     'sardinia-caption';
                const captionInput = document.getElementById(captionInputId);
                if (captionInput) {
                    captionInput.value = memory.caption;
                }
            }
        });
    }

    saveMemory(destination, data) {
        const saved = localStorage.getItem(this.storageKey);
        const memories = saved ? JSON.parse(saved) : {};
        
        memories[destination] = {
            ...memories[destination],
            ...data,
            updatedAt: new Date().toISOString()
        };

        localStorage.setItem(this.storageKey, JSON.stringify(memories));
    }

    initImageUploads() {
        document.querySelectorAll('.destination-image-input').forEach(input => {
            input.addEventListener('change', (e) => {
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

                const destination = input.dataset.destination;
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
                    input.click();
                }
            });
        });
    }

    handleImageUpload(destination, file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const imageDataUrl = e.target.result;
            this.setDestinationImage(destination, imageDataUrl);
            this.saveMemory(destination, { image: imageDataUrl });
            this.showNotification('Image saved');
        };

        reader.onerror = () => {
            alert('Error reading image file');
        };

        reader.readAsDataURL(file);
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

    removeDestinationImage(destination) {
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

        this.saveMemory(destination, { image: null });
        this.showNotification('Image removed');
    }

    initDateInputs() {
        document.querySelectorAll('.destination-date-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const destination = input.dataset.destination;
                const dateValue = e.target.value;
                
                if (dateValue) {
                    this.saveMemory(destination, { date: dateValue });
                    this.showNotification('Date saved');
                } else {
                    this.saveMemory(destination, { date: null });
                }
            });
        });
    }

    initCaptionInputs() {
        document.querySelectorAll('.destination-caption-input').forEach(input => {
            // Save on blur (when user finishes typing)
            input.addEventListener('blur', (e) => {
                const destination = input.dataset.destination;
                const caption = e.target.value.trim();
                
                this.saveMemory(destination, { caption: caption || null });
                if (caption) {
                    this.showNotification('Caption saved');
                }
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on the profile page and overview tab exists
    if (document.getElementById('overview-tab')) {
        // Wait a bit for auth.js to initialize if needed
        setTimeout(() => {
            if (!window.AtlasOfMemories || !window.atlasInstance) {
                window.atlasInstance = new AtlasOfMemories();
                window.AtlasOfMemories = AtlasOfMemories; // Also expose the class
            }
        }, 100);
    }
});

// Also initialize when tab is switched to overview (in case it's not active on load)
document.addEventListener('click', (e) => {
    if (e.target && e.target.classList.contains('profile-tab') && e.target.dataset.tab === 'overview') {
        setTimeout(() => {
            if (!window.atlasInstance) {
                window.atlasInstance = new AtlasOfMemories();
            } else {
                // Re-initialize to reload data
                window.atlasInstance.init();
            }
        }, 100);
    }
});

