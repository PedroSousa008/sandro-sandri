/* ========================================
   Sandro Sandri - Cross-Device User Data Sync
   ======================================== */

class UserSync {
    constructor() {
        this.userEmail = null;
        this.syncInProgress = false;
        this.pendingSync = false;
        this.syncTimeout = null;
        this.init();
    }

    init() {
        // Get user email
        this.updateUserEmail();
        
        // Listen for login/logout events
        window.addEventListener('storage', (e) => {
            if (e.key === 'sandroSandri_user') {
                this.updateUserEmail();
                if (this.userEmail) {
                    this.loadAllData();
                }
            }
        });

        // Periodic sync every 10 seconds
        setInterval(() => {
            if (this.userEmail && !document.hidden && !this.syncInProgress) {
                this.loadAllData();
            }
        }, 10000);

        // Sync when page becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.userEmail) {
                this.loadAllData();
            }
        });

        // Initial load if user is logged in
        if (this.userEmail) {
            setTimeout(() => this.loadAllData(), 1000);
        }
    }

    updateUserEmail() {
        if (window.AuthSystem && window.AuthSystem.currentUser) {
            this.userEmail = window.AuthSystem.currentUser.email;
        } else {
            const userData = localStorage.getItem('sandroSandri_user');
            if (userData) {
                try {
                    const user = JSON.parse(userData);
                    this.userEmail = user.email;
                } catch (e) {
                    this.userEmail = null;
                }
            } else {
                this.userEmail = null;
            }
        }
    }

    async loadAllData() {
        if (!this.userEmail) return;

        try {
            console.log('Loading all user data for:', this.userEmail);
            const response = await fetch(`/api/user/sync?email=${encodeURIComponent(this.userEmail)}`);
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    // Sync cart
                    if (result.data.cart && Array.isArray(result.data.cart)) {
                        const currentCart = JSON.parse(localStorage.getItem('sandroSandriCart') || '[]');
                        // Merge: prefer server data if it's newer or has more items
                        if (result.data.cart.length > 0 || currentCart.length === 0) {
                            localStorage.setItem('sandroSandriCart', JSON.stringify(result.data.cart));
                            // Trigger cart update
                            if (window.ShoppingCart && window.ShoppingCart.instance) {
                                window.ShoppingCart.instance.items = result.data.cart;
                                window.ShoppingCart.instance.updateCartUI();
                            }
                            // Dispatch event for other components
                            window.dispatchEvent(new CustomEvent('cartSynced', { detail: result.data.cart }));
                        }
                    }

                    // Sync profile
                    if (result.data.profile) {
                        const currentProfile = localStorage.getItem('sandroSandriProfile');
                        const serverProfile = JSON.stringify(result.data.profile);
                        if (serverProfile !== currentProfile) {
                            localStorage.setItem('sandroSandriProfile', serverProfile);
                            // Trigger profile update
                            if (window.loadProfileData) {
                                window.loadProfileData();
                            }
                            if (window.populateForm && result.data.profile) {
                                window.populateForm(result.data.profile);
                            }
                            // Dispatch event
                            window.dispatchEvent(new CustomEvent('profileSynced', { detail: result.data.profile }));
                        }
                    }

                    // Sync atlas
                    if (result.data.atlas) {
                        const atlasMemories = result.data.atlas.memories || {};
                        const atlasChapters = result.data.atlas.chapters || {};
                        
                        localStorage.setItem('sandroSandri_atlasMemories', JSON.stringify(atlasMemories));
                        localStorage.setItem('sandroSandri_atlasChapters', JSON.stringify(atlasChapters));
                        
                        // Trigger atlas update
                        if (window.atlasStandaloneInstance) {
                            window.atlasStandaloneInstance.loadMemories();
                        }
                        // Dispatch event
                        window.dispatchEvent(new CustomEvent('atlasSynced', { detail: result.data.atlas }));
                    }

                    console.log('User data loaded successfully');
                }
            } else {
                console.error('Failed to load user data:', response.status);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    async syncAllData() {
        if (!this.userEmail) return;

        // Debounce: wait 500ms before syncing
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
                // Get all current data
                const cart = JSON.parse(localStorage.getItem('sandroSandriCart') || '[]');
                const profile = localStorage.getItem('sandroSandriProfile');
                const atlasMemories = localStorage.getItem('sandroSandri_atlasMemories');
                const atlasChapters = localStorage.getItem('sandroSandri_atlasChapters');

                const payload = {
                    email: this.userEmail,
                    cart: cart,
                    profile: profile ? JSON.parse(profile) : null,
                    atlas: {
                        memories: atlasMemories ? JSON.parse(atlasMemories) : {},
                        chapters: atlasChapters ? JSON.parse(atlasChapters) : {}
                    }
                };

                console.log('Syncing all user data for:', this.userEmail);

                const response = await fetch('/api/user/sync', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        console.log('All user data synced successfully');
                    }
                } else {
                    const errorText = await response.text();
                    console.error('Failed to sync user data:', response.status, errorText);
                }
            } catch (error) {
                console.error('Error syncing user data:', error);
            } finally {
                this.syncInProgress = false;
                
                if (this.pendingSync) {
                    this.syncAllData();
                }
            }
        }, 500);
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
            const cart = JSON.parse(localStorage.getItem('sandroSandriCart') || '[]');
            const profile = localStorage.getItem('sandroSandriProfile');
            const atlasMemories = localStorage.getItem('sandroSandri_atlasMemories');
            const atlasChapters = localStorage.getItem('sandroSandri_atlasChapters');

            const payload = {
                email: this.userEmail,
                cart: cart,
                profile: profile ? JSON.parse(profile) : null,
                atlas: {
                    memories: atlasMemories ? JSON.parse(atlasMemories) : {},
                    chapters: atlasChapters ? JSON.parse(atlasChapters) : {}
                }
            };

            const response = await fetch('/api/user/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                console.log('Force sync successful');
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
}

// Initialize user sync
if (typeof window !== 'undefined') {
    window.UserSync = UserSync;
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.userSync = new UserSync();
        });
    } else {
        window.userSync = new UserSync();
    }
}

