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

    // SECURITY: Password syncing removed - passwords should never be synced

    init() {
        // Wait a bit for auth system to initialize
        setTimeout(() => {
            this.updateUserEmail();
            console.log('UserSync initialized. Email:', this.userEmail);
            
            // Initial load if user is logged in - CRITICAL for mobile devices
            if (this.userEmail) {
                console.log('🔄 Initial data load for logged-in user...');
                this.loadAllData();
            } else {
                console.warn('⚠️ No user email found - sync will not work until user logs in');
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

        // Periodic sync every 8 seconds (balanced for sync speed and server load)
        // This still provides near real-time sync while reducing API calls by ~60%
        setInterval(() => {
            this.updateUserEmail(); // Refresh email in case it changed
            if (this.userEmail && !document.hidden && !this.syncInProgress) {
                this.loadAllData();
            }
        }, 8000); // Increased to 8 seconds to reduce server load while maintaining good sync

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
            // Method 1: Check currentUser property
            if (window.AuthSystem.currentUser && window.AuthSystem.currentUser.email) {
                this.userEmail = window.AuthSystem.currentUser.email;
                console.log('✅ Email found via AuthSystem.currentUser:', this.userEmail);
                return;
            }
            
            // Method 2: Try isLoggedIn and loadUser
            if (window.AuthSystem.isLoggedIn && window.AuthSystem.isLoggedIn()) {
                const user = window.AuthSystem.loadUser();
                if (user && user.email) {
                    this.userEmail = user.email;
                    console.log('✅ Email found via AuthSystem.loadUser():', this.userEmail);
                    return;
                }
            }
            
            // Method 3: Try getCurrentUser if it exists
            if (window.AuthSystem.getCurrentUser && typeof window.AuthSystem.getCurrentUser === 'function') {
                const user = window.AuthSystem.getCurrentUser();
                if (user && user.email) {
                    this.userEmail = user.email;
                    console.log('✅ Email found via AuthSystem.getCurrentUser():', this.userEmail);
                    return;
                }
            }
        }
        
        // Try window.auth as fallback (alternative auth system)
        if (window.auth) {
            if (window.auth.currentUser && window.auth.currentUser.email) {
                this.userEmail = window.auth.currentUser.email;
                console.log('✅ Email found via window.auth.currentUser:', this.userEmail);
                return;
            }
        }
        
        // Fallback: check localStorage directly
        const userData = localStorage.getItem('sandroSandri_user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                // Check if session is still valid
                if (user.email) {
                    // Check expiration if it exists
                    if (!user.expiresAt || new Date(user.expiresAt) > new Date()) {
                        this.userEmail = user.email;
                        console.log('✅ Email found via localStorage (sandroSandri_user):', this.userEmail);
                        return;
                    } else {
                        console.warn('⚠️ User session expired');
                    }
                }
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        }
        
        // Try alternative localStorage keys
        const altUserData = localStorage.getItem('sandroSandriUser') || localStorage.getItem('user');
        if (altUserData) {
            try {
                const user = typeof altUserData === 'string' ? JSON.parse(altUserData) : altUserData;
                if (user && user.email) {
                    this.userEmail = user.email;
                    console.log('✅ Email found via alternative localStorage key:', this.userEmail);
                    return;
                }
            } catch (e) {
                // Ignore parse errors for alternative keys
            }
        }
        
        // Check session token for email (if stored)
        const sessionToken = localStorage.getItem('sandroSandri_session_token');
        if (sessionToken) {
            try {
                // Try to decode JWT token (if it's a JWT)
                const parts = sessionToken.split('.');
                if (parts.length === 3) {
                    const payload = JSON.parse(atob(parts[1]));
                    if (payload.email) {
                        this.userEmail = payload.email;
                        console.log('✅ Email found via session token:', this.userEmail);
                        return;
                    }
                }
            } catch (e) {
                // Not a JWT or can't decode - ignore
            }
        }
        
        this.userEmail = null;
        console.log('⚠️ No user email found - user may not be logged in');
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
                            
                            // Trigger cart update - try multiple ways
                            if (window.cart) {
                                window.cart.items = result.data.cart;
                                if (window.cart.updateCartUI) {
                                    window.cart.updateCartUI();
                                }
                            }
                            if (window.ShoppingCart) {
                                if (window.ShoppingCart.instance) {
                                    window.ShoppingCart.instance.items = result.data.cart;
                                    if (window.ShoppingCart.instance.updateCartUI) {
                                        window.ShoppingCart.instance.updateCartUI();
                                    }
                                }
                                // Also try to find existing instance
                                const cartElements = document.querySelectorAll('.cart-count, .cart-icon');
                                if (cartElements.length > 0 && window.ShoppingCart) {
                                    // Re-initialize if needed
                                    const existingCart = document.querySelector('.cart-items');
                                    if (existingCart) {
                                        // Cart drawer exists, update it
                                        window.dispatchEvent(new CustomEvent('cartUpdated'));
                                    }
                                }
                            }
                            // Dispatch event for other components
                            window.dispatchEvent(new CustomEvent('cartSynced', { detail: result.data.cart }));
                            window.dispatchEvent(new StorageEvent('storage', {
                                key: 'sandroSandriCart',
                                newValue: serverCartStr,
                                oldValue: currentCartStr
                            }));
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

                    // Sync favorites - CRITICAL: Always sync favorites
                    // Server always returns favorites (even if empty array)
                    const serverFavorites = result.data.favorites || [];
                    const currentFavorites = JSON.parse(localStorage.getItem('sandroSandriFavorites') || '[]');
                    
                    // Normalize: ensure both are arrays and sort for comparison
                    const currentNormalized = Array.isArray(currentFavorites) ? [...currentFavorites].sort((a, b) => a - b) : [];
                    const serverNormalized = Array.isArray(serverFavorites) ? [...serverFavorites].sort((a, b) => a - b) : [];
                    
                    const currentStr = JSON.stringify(currentNormalized);
                    const serverStr = JSON.stringify(serverNormalized);
                    
                    console.log('❤️ Checking favorites sync:');
                    console.log('   Current local:', currentNormalized.length, 'items:', currentNormalized);
                    console.log('   Server:', serverNormalized.length, 'items:', serverNormalized);
                    console.log('   Match:', currentStr === serverStr);
                    
                    // ALWAYS use server data as source of truth
                    // Update if different OR if server has favorites (even if local is empty)
                    if (currentStr !== serverStr) {
                        console.log('❤️ Syncing favorites from server (updating local)...');
                        localStorage.setItem('sandroSandriFavorites', JSON.stringify(serverNormalized));
                        dataUpdated = true;
                        
                        console.log('   ✅ Favorites updated in localStorage:', serverNormalized);
                        
                        // Update UI if favorites page is open
                        if (window.loadFavorites) {
                            console.log('   🔄 Calling loadFavorites() to update UI...');
                            window.loadFavorites();
                        }
                        
                        // Update favorite buttons on product pages - update all favorite buttons
                        document.querySelectorAll('.favorite-btn').forEach(btn => {
                            const productId = parseInt(
                                btn.closest('[data-product-id]')?.dataset.productId || 
                                btn.dataset.productId || 
                                btn.closest('article')?.dataset.productId ||
                                btn.closest('.product-card')?.dataset.productId
                            );
                            if (productId && serverNormalized.includes(productId)) {
                                btn.classList.add('active');
                                console.log('   ✅ Updated favorite button for product:', productId);
                            } else if (productId) {
                                btn.classList.remove('active');
                            }
                        });
                        
                        // Update profile stats
                        if (window.loadProfileData) {
                            window.loadProfileData();
                        }
                        
                        // Dispatch event for other components
                        window.dispatchEvent(new CustomEvent('favoritesSynced', { detail: serverNormalized }));
                        console.log('   ✅ Favorites sync complete');
                    } else {
                        console.log('❤️ Favorites already in sync');
                    }

                    // Sync orders - CRITICAL: Always sync orders
                    if (result.data.orders && Array.isArray(result.data.orders)) {
                        const currentOrders = JSON.parse(localStorage.getItem('sandroSandriOrders') || '[]');
                        const currentOrdersStr = JSON.stringify(currentOrders);
                        const serverOrdersStr = JSON.stringify(result.data.orders);
                        
                        if (serverOrdersStr !== currentOrdersStr) {
                            console.log('📦 Syncing orders from server:');
                            console.log('   Current:', currentOrders.length, 'orders');
                            console.log('   Server:', result.data.orders.length, 'orders');
                            localStorage.setItem('sandroSandriOrders', serverOrdersStr);
                            dataUpdated = true;
                            
                            // Update UI if orders page is open
                            if (window.loadOrders) {
                                window.loadOrders();
                            }
                            // Update profile stats
                            if (window.loadProfileData) {
                                window.loadProfileData();
                            }
                            window.dispatchEvent(new CustomEvent('ordersSynced', { detail: result.data.orders }));
                        } else {
                            console.log('📦 Orders already in sync');
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
                const favorites = JSON.parse(localStorage.getItem('sandroSandriFavorites') || '[]');
                const orders = JSON.parse(localStorage.getItem('sandroSandriOrders') || '[]');
                const atlasMemories = localStorage.getItem('sandroSandri_atlasMemories');
                const atlasChapters = localStorage.getItem('sandroSandri_atlasChapters');
                
                // SECURITY: Password removed - never sync passwords
                
                // Get last login from auth system
                const userData = localStorage.getItem('sandroSandri_user');
                let lastLogin = null;
                if (userData) {
                    try {
                        const user = JSON.parse(userData);
                        lastLogin = user.loggedInAt || null;
                    } catch (e) {
                        console.error('Error parsing user data:', e);
                    }
                }

                // SECURITY: Do not include password in sync payload
                const payload = {
                    email: this.userEmail,
                    cart: cart,
                    profile: profile ? JSON.parse(profile) : null,
                    favorites: favorites,
                    orders: orders,
                    // password: REMOVED - never sync passwords
                    lastLogin: lastLogin,
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
                    favorites: payload.favorites.length,
                    orders: payload.orders.length,
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
        // Clear any pending debounce - forceSync is ALWAYS immediate
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
        }

        // If already syncing, queue this one but don't block (optimistic update)
        if (this.syncInProgress) {
            this.pendingSync = true;
            // Return immediately - don't wait (user sees instant feedback)
            return Promise.resolve(true);
        }

        this.syncInProgress = true;
        this.pendingSync = false;

        try {
            const cart = JSON.parse(localStorage.getItem('sandroSandriCart') || '[]');
            const profile = localStorage.getItem('sandroSandriProfile');
            const favorites = JSON.parse(localStorage.getItem('sandroSandriFavorites') || '[]');
            const orders = JSON.parse(localStorage.getItem('sandroSandriOrders') || '[]');
            const atlasMemories = localStorage.getItem('sandroSandri_atlasMemories');
            const atlasChapters = localStorage.getItem('sandroSandri_atlasChapters');

            const payload = {
                email: this.userEmail,
                cart: cart,
                profile: profile ? JSON.parse(profile) : null,
                favorites: favorites, // CRITICAL: Always include favorites
                orders: orders, // CRITICAL: Always include orders
                atlas: {
                    memories: atlasMemories ? JSON.parse(atlasMemories) : {},
                    chapters: atlasChapters ? JSON.parse(atlasChapters) : {}
                }
            };

            // OPTIMIZE FOR SPEED: Fire and forget - don't wait for response
            // User sees instant feedback, sync happens in background
            // This makes cart/favorites feel instant (0ms delay)
            fetch('/api/user/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            }).then(response => {
                if (response.ok) {
                    console.log('✅ Force sync successful');
                } else {
                    console.warn('⚠️ Force sync warning:', response.status);
                }
            }).catch(error => {
                console.warn('⚠️ Force sync error (non-blocking):', error);
            });

            // Return immediately - don't wait for server (instant user feedback)
            return true;
        } catch (error) {
            console.warn('⚠️ Error in force sync (non-blocking):', error);
            return true; // Still return true - optimistic update
        } finally {
            // Mark as not in progress after a short delay to allow request to complete
            setTimeout(() => {
                this.syncInProgress = false;
                
                if (this.pendingSync) {
                    this.forceSync();
                }
            }, 100);
        }
    }
}

// Initialize user sync
if (typeof window !== 'undefined') {
    window.UserSync = UserSync;
    
    // Wait for auth system to be ready
    function initUserSync() {
        // Wait a bit more to ensure auth.js has initialized
        setTimeout(() => {
            if (!window.userSync) {
                window.userSync = new UserSync();
                console.log('UserSync initialized');
            }
        }, 1000);
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUserSync);
    } else {
        initUserSync();
    }
    
    // Also expose a manual sync function for testing
    window.manualSync = function() {
        if (window.userSync) {
            console.log('Manual sync triggered');
            window.userSync.updateUserEmail();
            console.log('Current email:', window.userSync.userEmail);
            if (window.userSync.userEmail) {
                window.userSync.forceSync();
                setTimeout(() => window.userSync.loadAllData(), 1000);
            } else {
                console.error('No user email found. Are you logged in?');
            }
        } else {
            console.error('UserSync not initialized');
        }
    };
}

