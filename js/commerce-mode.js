/* ========================================
   Sandro Sandri - Commerce Mode Manager
   Global utility to check and update commerce mode across all pages
   ======================================== */

// Global commerce mode state
window.CommerceMode = {
    currentMode: 'LIVE',
    isInitialized: false,
    
    // Load commerce mode from server
    async loadMode() {
        try {
            const response = await fetch('/api/site-settings?setting=commerce-mode');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    const previousMode = this.currentMode;
                    this.currentMode = data.commerce_mode || 'LIVE';
                    this.isInitialized = true;
                    
                    // Dispatch event if mode changed (or on first load)
                    if (!this._hasDispatchedInitialEvent || previousMode !== this.currentMode) {
                        this._hasDispatchedInitialEvent = true;
                        window.dispatchEvent(new CustomEvent('commerceModeUpdated', {
                            detail: { mode: this.currentMode, previousMode: previousMode }
                        }));
                    }
                    
                    return this.currentMode;
                }
            }
        } catch (error) {
            console.error('Error loading commerce mode:', error);
        }
        this.currentMode = 'LIVE';
        this.isInitialized = true;
        return this.currentMode;
    },
    
    // Poll for commerce mode changes (useful when admin changes mode)
    startPolling(intervalMs = 5000) {
        if (this._pollingInterval) {
            clearInterval(this._pollingInterval);
        }
        this._pollingInterval = setInterval(() => {
            this.loadMode();
        }, intervalMs);
    },
    
    // Stop polling
    stopPolling() {
        if (this._pollingInterval) {
            clearInterval(this._pollingInterval);
            this._pollingInterval = null;
        }
    },
    
    // Check if in WAITLIST mode
    isWaitlistMode() {
        return this.currentMode === 'WAITLIST';
    },
    
    // Check if in EARLY_ACCESS mode
    isEarlyAccessMode() {
        return this.currentMode === 'EARLY_ACCESS';
    },
    
    // Check if in LIVE mode
    isLiveMode() {
        return this.currentMode === 'LIVE';
    },
    
    // Update all "Add to Cart" buttons based on product chapter and commerce mode
    // IMPORTANT: This function is deprecated - use getButtonTextForProduct instead
    // Kept for backward compatibility but should not be used for new code
    updateAllButtons() {
        // This function is no longer used - buttons are updated using getButtonTextForProduct
        // when products are rendered
        return;
    },
    
    // Check if user is logged in
    isUserLoggedIn() {
        if (window.auth && window.auth.currentUser) {
            return true;
        }
        // Also check localStorage
        const userData = localStorage.getItem('sandroSandri_user');
        return !!userData;
    },
    
    // Get user email if logged in
    getUserEmail() {
        if (window.auth && window.auth.currentUser) {
            return window.auth.currentUser.email;
        }
        try {
            const userData = localStorage.getItem('sandroSandri_user');
            if (userData) {
                const user = JSON.parse(userData);
                return user.email || null;
            }
        } catch (error) {
            console.error('Error getting user email:', error);
        }
        return null;
    },
    
    // Get button text and behavior based on product chapter and commerce mode
    // IMPORTANT LOGIC:
    // - When in "Chapter I" mode (NOT Upload Chapter II): All products follow commerce mode normally
    // - When in "Upload Chapter II" mode:
    //   - Chapter I (IDs 1-5): ALWAYS "Add to Cart" (regardless of commerce mode)
    //   - Chapter II (IDs 6-10): Follows commerce mode (WAITLIST/LIVE/EARLY_ACCESS)
    getButtonTextForProduct(product) {
        if (!product) return 'Add to Cart';
        
        // Check if product is Chapter II (IDs 6-10)
        const isProductChapterII = product.id >= 6 && product.id <= 10;
        // Check if product is Chapter I (IDs 1-5)
        const isProductChapterI = product.id >= 1 && product.id <= 5;
        
        // Check if site is in "Upload Chapter II" mode
        // CRITICAL: Wait for ActiveChapter to be available
        let isChapterIIMode = false;
        if (window.ActiveChapter && typeof window.ActiveChapter.isChapterII === 'function') {
            isChapterIIMode = window.ActiveChapter.isChapterII();
        } else {
            // ActiveChapter not loaded yet - default to Chapter I mode
            isChapterIIMode = false;
        }
        
        // If NOT in "Upload Chapter II" mode (i.e., in Chapter I mode):
        // ALL products follow commerce mode normally
        if (!isChapterIIMode) {
            if (this.isWaitlistMode()) {
                return 'Join the Waitlist';
            }
            return 'Add to Cart';
        }
        
        // IN "Upload Chapter II" MODE:
        if (isProductChapterI) {
            // Chapter I products: ALWAYS "Add to Cart" (regardless of commerce mode)
            console.log(`Product ${product.id} (${product.name}) is Chapter I - using Add to Cart (Upload Chapter II mode active)`);
            return 'Add to Cart';
        } else if (isProductChapterII) {
            // Chapter II products: Follow commerce mode
            if (this.isWaitlistMode()) {
                console.log(`Product ${product.id} (${product.name}) is Chapter II - using Join the Waitlist (WAITLIST mode)`);
                return 'Join the Waitlist';
            } else if (this.isEarlyAccessMode()) {
                console.log(`Product ${product.id} (${product.name}) is Chapter II - using Add to Cart (EARLY_ACCESS mode)`);
                return 'Add to Cart'; // Early Access - limited inventory
            } else {
                console.log(`Product ${product.id} (${product.name}) is Chapter II - using Add to Cart (LIVE mode)`);
                return 'Add to Cart'; // LIVE mode
            }
        }
        
        // Fallback
        return 'Add to Cart';
    },
    
    // Check if product should use waitlist behavior
    // IMPORTANT LOGIC:
    // - When in "Chapter I" mode (NOT Upload Chapter II): ALL products use waitlist if in WAITLIST mode
    // - When in "Upload Chapter II" mode: Only Chapter II products use waitlist when in WAITLIST mode
    shouldUseWaitlistBehavior(product) {
        if (!product) return false;
        
        // Check if product is Chapter II (IDs 6-10)
        const isProductChapterII = product.id >= 6 && product.id <= 10;
        // Check if product is Chapter I (IDs 1-5)
        const isProductChapterI = product.id >= 1 && product.id <= 5;
        
        // Check if site is in "Upload Chapter II" mode
        const isChapterIIMode = window.ActiveChapter && window.ActiveChapter.isChapterII();
        
        // If NOT in "Upload Chapter II" mode (i.e., in Chapter I mode):
        // ALL products use waitlist if in WAITLIST mode
        if (!isChapterIIMode) {
            return this.isWaitlistMode();
        }
        
        // IN "Upload Chapter II" MODE:
        // Only Chapter II products use waitlist when in WAITLIST mode
        // Chapter I products NEVER use waitlist when in "Upload Chapter II" mode
        return isProductChapterII && this.isWaitlistMode();
    },
    
    // Check if product should use early access behavior
    // IMPORTANT: Only Chapter II products in "Upload Chapter II" mode use early access
    shouldUseEarlyAccessBehavior(product) {
        if (!product) return false;
        
        // Check if product is Chapter II (IDs 6-10)
        const isProductChapterII = product.id >= 6 && product.id <= 10;
        
        // Check if site is in "Upload Chapter II" mode
        const isChapterIIMode = window.ActiveChapter && window.ActiveChapter.isChapterII();
        
        // Only Chapter II products in "Upload Chapter II" mode use early access when in EARLY_ACCESS mode
        // Chapter I products NEVER use early access when in "Upload Chapter II" mode
        return isChapterIIMode && isProductChapterII && this.isEarlyAccessMode();
    }
};

// Initialize commerce mode on page load
if (typeof window !== 'undefined') {
    // Load mode immediately
    window.CommerceMode.loadMode().then(() => {
        // Start polling for mode changes (useful when admin changes mode)
        // Poll every 5 seconds to catch admin changes
        window.CommerceMode.startPolling(5000);
    });
}

