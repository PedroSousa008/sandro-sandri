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
                    this.currentMode = data.commerce_mode || 'LIVE';
                    this.isInitialized = true;
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
    
    // Update all "Add to Cart" buttons to "Join the Waitlist" if in WAITLIST mode
    updateAllButtons() {
        if (!this.isWaitlistMode()) {
            return; // Only update in WAITLIST mode
        }
        
        // Update all buttons with class "add-to-cart-btn" or "quick-add"
        const buttons = document.querySelectorAll('.add-to-cart-btn, .quick-add');
        buttons.forEach(btn => {
            if (btn.textContent.includes('Add to Cart') || btn.textContent.includes('ADD TO CART')) {
                btn.textContent = btn.textContent.replace(/Add to Cart/gi, 'Join the Waitlist');
                btn.textContent = btn.textContent.replace(/ADD TO CART/gi, 'JOIN THE WAITLIST');
                btn.classList.add('waitlist-btn');
            }
        });
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
    // IMPORTANT: When in "Upload Chapter II" mode:
    // - Chapter I (IDs 1-5): ALWAYS "Add to Cart" (regardless of commerce mode)
    // - Chapter II (IDs 6-10): Follows commerce mode (WAITLIST/LIVE/EARLY_ACCESS)
    // When NOT in "Upload Chapter II" mode:
    // - All products follow commerce mode normally
    getButtonTextForProduct(product) {
        if (!product) return 'Add to Cart';
        
        // Check if product is Chapter II (IDs 6-10)
        const isProductChapterII = product.id >= 6 && product.id <= 10;
        // Check if product is Chapter I (IDs 1-5)
        const isProductChapterI = product.id >= 1 && product.id <= 5;
        
        // Check if site is in "Upload Chapter II" mode
        // Wait for ActiveChapter to be available
        let isChapterIIMode = false;
        if (window.ActiveChapter) {
            isChapterIIMode = window.ActiveChapter.isChapterII();
        } else {
            // ActiveChapter not loaded yet - default to false (Chapter I mode)
            // This means all products will follow commerce mode until ActiveChapter loads
            console.warn('ActiveChapter not loaded yet, defaulting to Chapter I mode');
        }
        
        // If NOT in "Upload Chapter II" mode, all products follow commerce mode normally
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
    // IMPORTANT: Only Chapter II products in "Upload Chapter II" mode use waitlist
    shouldUseWaitlistBehavior(product) {
        if (!product) return false;
        
        // Check if product is Chapter II (IDs 6-10)
        const isProductChapterII = product.id >= 6 && product.id <= 10;
        
        // Check if site is in "Upload Chapter II" mode
        const isChapterIIMode = window.ActiveChapter && window.ActiveChapter.isChapterII();
        
        // Only Chapter II products in "Upload Chapter II" mode use waitlist when in WAITLIST mode
        // Chapter I products NEVER use waitlist when in "Upload Chapter II" mode
        return isChapterIIMode && isProductChapterII && this.isWaitlistMode();
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
        // Update buttons after mode is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                window.CommerceMode.updateAllButtons();
            });
        } else {
            window.CommerceMode.updateAllButtons();
        }
        
        // Also update buttons when DOM changes (for dynamically loaded content)
        const observer = new MutationObserver(() => {
            window.CommerceMode.updateAllButtons();
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

