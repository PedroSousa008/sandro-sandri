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
    startPolling(intervalMs = 3000) {
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
    // LOGIC:
    // - If in "Chapter I mode" (NOT Upload Chapter II): Use Chapter I mode from table (chapter_modes.chapter_i.mode)
    // - If in "Upload Chapter II mode": Use chapter-specific modes from table
    async getButtonTextForProduct(product) {
        if (!product) return 'Add to Cart';
        
        // Determine which chapter this product belongs to
        const isProductChapterII = product.id >= 6 && product.id <= 10;
        const isProductChapterI = product.id >= 1 && product.id <= 5;
        
        // Check if site is in "Upload Chapter II" mode
        const isChapterIIMode = window.ActiveChapter && window.ActiveChapter.isChapterII();
        
        // If NOT in "Upload Chapter II" mode (i.e., in Chapter I mode):
        // Use Chapter I mode from table (chapter_modes.chapter_i.mode)
        if (!isChapterIIMode) {
            try {
                console.log(`🔍 Getting button text for product ${product.id} in Chapter I mode`);
                const chapterIMode = await this.getChapterMode('chapter_i');
                console.log(`🔍 Chapter I mode from table: ${chapterIMode}`);
                if (chapterIMode === 'WAITLIST') {
                    console.log(`✅ Returning "Join the Waitlist" for product ${product.id}`);
                    return 'Join the Waitlist';
                } else if (chapterIMode === 'EARLY_ACCESS') {
                    console.log(`✅ Returning "Add to Cart" (EARLY_ACCESS) for product ${product.id}`);
                    return 'Add to Cart'; // Early Access still uses Add to Cart button
                } else {
                    console.log(`✅ Returning "Add to Cart" (LIVE) for product ${product.id}`);
                    return 'Add to Cart'; // LIVE mode
                }
            } catch (error) {
                console.error('Error getting Chapter I mode, falling back to global mode:', error);
                // Fallback to global mode
                if (this.isWaitlistMode()) {
                    return 'Join the Waitlist';
                }
                return 'Add to Cart';
            }
        }
        
        // IN "Upload Chapter II" MODE:
        // Use chapter-specific modes from the table
        if (isProductChapterI) {
            // Chapter I products: ALWAYS "Add to Cart" (regardless of mode)
            return 'Add to Cart';
        } else if (isProductChapterII) {
            // Chapter II products: Use chapter-specific mode from table
            try {
                const chapterMode = await this.getChapterMode('chapter_ii');
                if (chapterMode === 'WAITLIST') {
                    return 'Join the Waitlist';
                } else if (chapterMode === 'EARLY_ACCESS') {
                    return 'Add to Cart'; // Early Access still uses Add to Cart button
                } else {
                    return 'Add to Cart'; // LIVE mode
                }
            } catch (error) {
                console.error('Error getting chapter mode, falling back to global mode:', error);
                // Fallback to global mode
                if (this.isWaitlistMode()) {
                    return 'Join the Waitlist';
                }
                return 'Add to Cart';
            }
        }
        
        // Fallback
        return 'Add to Cart';
    },
    
    // Check if product should use waitlist behavior
    // LOGIC:
    // - If in "Chapter I mode" (NOT Upload Chapter II): Use Chapter I mode from table (chapter_modes.chapter_i.mode)
    // - If in "Upload Chapter II mode": Use chapter-specific modes from table
    async shouldUseWaitlistBehavior(product) {
        if (!product) return false;
        
        // Determine which chapter this product belongs to
        const isProductChapterII = product.id >= 6 && product.id <= 10;
        const isProductChapterI = product.id >= 1 && product.id <= 5;
        
        // Check if site is in "Upload Chapter II" mode
        const isChapterIIMode = window.ActiveChapter && window.ActiveChapter.isChapterII();
        
        // If NOT in "Upload Chapter II" mode (i.e., in Chapter I mode):
        // Use Chapter I mode from table (chapter_modes.chapter_i.mode)
        if (!isChapterIIMode) {
            try {
                const chapterIMode = await this.getChapterMode('chapter_i');
                return chapterIMode === 'WAITLIST';
            } catch (error) {
                console.error('Error getting Chapter I mode, falling back to global mode:', error);
                // Fallback to global mode
                return this.isWaitlistMode();
            }
        }
        
        // IN "Upload Chapter II" MODE:
        // Use chapter-specific modes from table
        if (isProductChapterI) {
            // Chapter I products: NEVER use waitlist in Upload Chapter II mode
            return false;
        } else if (isProductChapterII) {
            // Chapter II products: Use chapter-specific mode from table
            try {
                const chapterMode = await this.getChapterMode('chapter_ii');
                return chapterMode === 'WAITLIST';
            } catch (error) {
                console.error('Error getting chapter mode, falling back to global mode:', error);
                // Fallback to global mode
                return this.isWaitlistMode();
            }
        }
        
        return false;
    },
    
    // Check if product should use early access behavior
    // NEW SYSTEM: Uses per-chapter modes from the Chapter Modes Management table
    async shouldUseEarlyAccessBehavior(product) {
        if (!product) return false;
        
        // Determine which chapter this product belongs to
        const isProductChapterII = product.id >= 6 && product.id <= 10;
        const isProductChapterI = product.id >= 1 && product.id <= 5;
        
        // Determine chapter key
        let chapterKey = null;
        if (isProductChapterI) {
            chapterKey = 'chapter_i';
        } else if (isProductChapterII) {
            chapterKey = 'chapter_ii';
        }
        
        // Check if site is in "Upload Chapter II" mode
        const isChapterIIMode = window.ActiveChapter && window.ActiveChapter.isChapterII();
        
        // NEW SYSTEM: Try to get chapter-specific mode
        if (chapterKey) {
            try {
                const chapterMode = await this.getChapterMode(chapterKey);
                
                // If in "Upload Chapter II" mode and product is Chapter I, never use early access
                if (isChapterIIMode && isProductChapterI) {
                    return false;
                }
                
                // Otherwise, check if chapter mode is EARLY_ACCESS
                return chapterMode === 'EARLY_ACCESS';
            } catch (error) {
                console.error('Error getting chapter mode, falling back to global mode:', error);
            }
        }
        
        // FALLBACK: Use legacy global commerce mode logic
        // Only Chapter II products in "Upload Chapter II" mode use early access when in EARLY_ACCESS mode
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

