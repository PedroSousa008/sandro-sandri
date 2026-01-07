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
        // Wait a bit for auth system to initialize
        setTimeout(() => {
            this.updateUserEmail();
            console.log('UserSync initialized. Email:', this.userEmail);
            
            // Initial load if user is logged in
            if (this.userEmail) {
                this.loadAllData();
            }
        }, 500);
        
        // Listen for login/logout events
        window.addEventListener('storage', (e) => {
            if (e.key === 'sandroSandri_user') {
                console.log('User storage changed, updating email...');
                this.updateUserEmail();
                if (this.userEmail) {
                    console.log('User logged in, loading data...');
                    this.loadAllData();
                }
            }
        });

        // Also listen for custom login event
        window.addEventListener('userLoggedIn', () => {
            console.log('User logged in event received');
            this.updateUserEmail();
            if (this.userEmail) {
                setTimeout(() => this.loadAllData(), 500);
            }
        });

        // Periodic sync every 10 seconds
        setInterval(() => {
            this.updateUserEmail(); // Refresh email in case it changed
            if (this.userEmail && !document.hidden && !this.syncInProgress) {
                this.loadAllData();
            }
        }, 10000);

        // Sync when page becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.updateUserEmail();
                if (this.userEmail) {
                    this.loadAllData();
                }
            }
        });
    }

    updateUserEmail() {
        // Try AuthSystem first
        if (window.AuthSystem) {
            if (window.AuthSystem.currentUser && window.AuthSystem.currentUser.email) {
                this.userEmail = window.AuthSystem.currentUser.email;
                return;
            }
            // Try isLoggedIn and getCurrentUser
            if (window.AuthSystem.isLoggedIn && window.AuthSystem.isLoggedIn()) {
                const user = window.AuthSystem.loadUser();
                if (user && user.email) {
                    this.userEmail = user.email;
                    return;
                }
            }
        }
        
        // Fallback: check localStorage directly
        const userData = localStorage.getItem('sandroSandri_user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                // Check if session is still valid
                if (user.expiresAt && new Date(user.expiresAt) > new Date()) {
                    this.userEmail = user.email;
                    return;
                }
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        }
        
        this.userEmail = null;
    }

    async loadAllData() {
        if (!this.userEmail) {
            console.log('Cannot load data: no user email');
            return;
        }

        try {
            console.log('🔄 Loading all user data for:', this.userEmail);
            const response = await fetch(`/api/user/sync?email=${encodeURIComponent(this.userEmail)}`);
            
            console.log('API response status:', response.status);
            
            if (response.ok) {
                const result = await response.json();
                console.log('API response:', result);
                
                if (result.success && result.data) {
                    let dataUpdated = false;

                    // Sync cart - always use server data if available
                    if (result.data.cart && Array.isArray(result.data.cart)) {
                        const currentCart = JSON.parse(localStorage.getItem('sandroSandriCart') || '[]');
                        const currentCartStr = JSON.stringify(currentCart);
                        const serverCartStr = JSON.stringify(result.data.cart);
                        
                        if (serverCartStr !== currentCartStr) {
                            console.log('📦 Syncing cart:', result.data.cart.length, 'items');
                            localStorage.setItem('sandroSandriCart', serverCartStr);
                            dataUpdated = true;
                            
                            // Trigger cart update
                            if (window.cart) {
                                window.cart.items = result.data.cart;
                                window.cart.updateCartUI();
                            }
                            if (window.ShoppingCart && window.ShoppingCart.instance) {
                                window.ShoppingCart.instance.items = result.data.cart;
                                window.ShoppingCart.instance.updateCartUI();
                            }
                            // Dispatch event for other components
                            window.dispatchEvent(new CustomEvent('cartSynced', { detail: result.data.cart }));
                        }
                    }

                    // Sync profile - always use server data if available
                    if (result.data.profile) {
                        const currentProfile = localStorage.getItem('sandroSandriProfile');
                        const serverProfile = JSON.stringify(result.data.profile);
                        
                        if (serverProfile !== currentProfile) {
                            console.log('👤 Syncing profile');
                            localStorage.setItem('sandroSandriProfile', serverProfile);
                            dataUpdated = true;
                            
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

                    // Sync atlas - always use server data if available
                    if (result.data.atlas) {
                        const atlasMemories = result.data.atlas.memories || {};
                        const atlasChapters = result.data.atlas.chapters || {};
                        
                        const currentMemories = JSON.parse(localStorage.getItem('sandroSandri_atlasMemories') || '{}');
                        const currentChapters = JSON.parse(localStorage.getItem('sandroSandri_atlasChapters') || '{}');
                        
                        const memoriesStr = JSON.stringify(atlasMemories);
                        const chaptersStr = JSON.stringify(atlasChapters);
                        const currentMemoriesStr = JSON.stringify(currentMemories);
                        const currentChaptersStr = JSON.stringify(currentChapters);
                        
                        if (memoriesStr !== currentMemoriesStr || chaptersStr !== currentChaptersStr) {
                            console.log('🗺️ Syncing atlas:', Object.keys(atlasMemories).length, 'memories');
                            localStorage.setItem('sandroSandri_atlasMemories', memoriesStr);
                            localStorage.setItem('sandroSandri_atlasChapters', chaptersStr);
                            dataUpdated = true;
                            
                            // Trigger atlas update
                            if (window.atlasStandaloneInstance) {
                                window.atlasStandaloneInstance.loadMemories();
                            }
                            // Dispatch event
                            window.dispatchEvent(new CustomEvent('atlasSynced', { detail: result.data.atlas }));
                        }
                    }

                    if (dataUpdated) {
                        console.log('✅ User data loaded and updated successfully');
                    } else {
                        console.log('✅ User data loaded (no changes)');
                    }
                } else {
                    console.warn('API returned success but no data');
                }
            } else {
                const errorText = await response.text();
                console.error('❌ Failed to load user data:', response.status, errorText);
            }
        } catch (error) {
            console.error('❌ Error loading user data:', error);
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

                console.log('💾 Syncing all user data for:', this.userEmail);
                console.log('Payload:', {
                    email: payload.email,
                    cartItems: payload.cart.length,
                    hasProfile: !!payload.profile,
                    atlasMemories: Object.keys(payload.atlas.memories).length
                });

                const response = await fetch('/api/user/sync', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload)
                });

                console.log('Sync response status:', response.status);

                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        console.log('✅ All user data synced successfully');
                    } else {
                        console.error('❌ Sync failed:', result);
                    }
                } else {
                    const errorText = await response.text();
                    console.error('❌ Failed to sync user data:', response.status, errorText);
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

            console.log('🚀 Force syncing all user data for:', this.userEmail);
            
            const response = await fetch('/api/user/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            console.log('Force sync response status:', response.status);

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    console.log('✅ Force sync successful');
                } else {
                    console.error('❌ Force sync failed:', result);
                }
            } else {
                const errorText = await response.text();
                console.error('❌ Force sync failed:', response.status, errorText);
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

