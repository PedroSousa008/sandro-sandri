/* ========================================
   Sandro Sandri - Chapter Mode System
   Centralized system to read activeChapterId and activeChapterMode
   ======================================== */

window.ChapterMode = {
    chapters: [],
    activeChapterId: null,
    activeChapterMode: 'add_to_cart',
    isInitialized: false,
    
    // Load chapters data from server
    async loadChapters() {
        try {
            const response = await fetch('/api/site-settings/chapters');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    const previousActiveChapterId = this.activeChapterId;
                    const previousActiveChapterMode = this.activeChapterMode;
                    
                    this.chapters = data.chapters || [];
                    this.activeChapterId = data.activeChapterId || null;
                    this.activeChapterMode = data.activeChapterMode || 'add_to_cart';
                    this.isInitialized = true;
                    
                    // Dispatch event if active chapter or mode changed
                    if (previousActiveChapterId !== this.activeChapterId || 
                        previousActiveChapterMode !== this.activeChapterMode) {
                        window.dispatchEvent(new CustomEvent('chapterModeUpdated', {
                            detail: {
                                activeChapterId: this.activeChapterId,
                                activeChapterMode: this.activeChapterMode,
                                previousActiveChapterId: previousActiveChapterId,
                                previousActiveChapterMode: previousActiveChapterMode
                            }
                        }));
                    }
                    
                    return {
                        chapters: this.chapters,
                        activeChapterId: this.activeChapterId,
                        activeChapterMode: this.activeChapterMode
                    };
                }
            }
        } catch (error) {
            console.error('Error loading chapters:', error);
        }
        
        // Fallback to defaults
        this.chapters = [];
        this.activeChapterId = null;
        this.activeChapterMode = 'add_to_cart';
        this.isInitialized = true;
        return {
            chapters: this.chapters,
            activeChapterId: this.activeChapterId,
            activeChapterMode: this.activeChapterMode
        };
    },
    
    // Poll for chapter changes (useful when admin changes chapters)
    startPolling(intervalMs = 3000) {
        if (this._pollingInterval) {
            clearInterval(this._pollingInterval);
        }
        this._pollingInterval = setInterval(() => {
            this.loadChapters();
        }, intervalMs);
    },
    
    // Stop polling
    stopPolling() {
        if (this._pollingInterval) {
            clearInterval(this._pollingInterval);
            this._pollingInterval = null;
        }
    },
    
    // Get active chapter object
    getActiveChapter() {
        if (!this.activeChapterId) return null;
        return this.chapters.find(ch => ch.id === this.activeChapterId) || null;
    },
    
    // Check if a chapter is the active chapter
    isActiveChapter(chapterId) {
        return this.activeChapterId === chapterId;
    },
    
    // Check if a product belongs to the active chapter
    isProductFromActiveChapter(product) {
        if (!product || !this.activeChapterId) return false;
        
        // Determine chapter from product ID
        // Chapter I: IDs 1-5, Chapter II: IDs 6-10, etc.
        const productId = product.id || product.productId;
        if (!productId) return false;
        
        // Map product IDs to chapters (5 products per chapter)
        const chapterNumber = Math.ceil(productId / 5);
        const chapterId = `chapter_${['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'][chapterNumber - 1]}`;
        
        return chapterId === this.activeChapterId;
    },
    
    // Get button text for a product based on its chapter and active chapter mode
    getButtonTextForProduct(product) {
        if (!product) return 'Add to Cart';
        
        // Check if product is from active chapter
        const isFromActiveChapter = this.isProductFromActiveChapter(product);
        
        if (isFromActiveChapter) {
            // Use active chapter mode
            if (this.activeChapterMode === 'waitlist') {
                return 'Join the Waitlist';
            } else if (this.activeChapterMode === 'early_access') {
                return 'Request Early Access';
            } else {
                return 'Add to Cart';
            }
        } else {
            // Product from previous chapter - always "Add to Cart"
            return 'Add to Cart';
        }
    },
    
    // Check if product should use waitlist behavior
    shouldUseWaitlistBehavior(product) {
        if (!product) return false;
        const isFromActiveChapter = this.isProductFromActiveChapter(product);
        return isFromActiveChapter && this.activeChapterMode === 'waitlist';
    },
    
    // Check if product should use early access behavior
    shouldUseEarlyAccessBehavior(product) {
        if (!product) return false;
        const isFromActiveChapter = this.isProductFromActiveChapter(product);
        return isFromActiveChapter && this.activeChapterMode === 'early_access';
    },
    
    // Check if checkout should be blocked for a product
    shouldBlockCheckout(product) {
        if (!product) return false;
        const isFromActiveChapter = this.isProductFromActiveChapter(product);
        return isFromActiveChapter && (this.activeChapterMode === 'waitlist' || this.activeChapterMode === 'early_access');
    }
};

// Initialize chapter mode on page load
if (typeof window !== 'undefined') {
    window.ChapterMode.loadChapters().then(() => {
        // Start polling for chapter changes (useful when admin changes chapters)
        window.ChapterMode.startPolling(3000);
    });
}

