/* ========================================
   Sandro Sandri - Chapter Mode Manager
   Global utility to check and update chapter mode across all pages
   ======================================== */

// Global chapter mode state
window.ChapterMode = {
    chapters: {},
    activeChapterId: null,
    activeChapterMode: null,
    isInitialized: false,
    
    // Load chapter mode from server
    async loadMode() {
        try {
            const response = await fetch('/api/chapter-mode');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.chapters = data.chapters || {};
                    this.activeChapterId = data.activeChapterId;
                    this.activeChapterMode = data.activeChapterMode || 'add_to_cart';
                    this.isInitialized = true;
                    return {
                        activeChapterId: this.activeChapterId,
                        activeChapterMode: this.activeChapterMode
                    };
                }
            }
        } catch (error) {
            console.error('Error loading chapter mode:', error);
        }
        // Default fallback
        this.activeChapterId = null;
        this.activeChapterMode = 'add_to_cart';
        this.isInitialized = true;
        return {
            activeChapterId: this.activeChapterId,
            activeChapterMode: this.activeChapterMode
        };
    },
    
    // Check if in WAITLIST mode (for active chapter)
    isWaitlistMode() {
        return this.activeChapterMode === 'waitlist';
    },
    
    // Check if in EARLY_ACCESS mode (for active chapter)
    isEarlyAccessMode() {
        return this.activeChapterMode === 'early_access';
    },
    
    // Check if in ADD_TO_CART mode (for active chapter)
    isAddToCartMode() {
        return this.activeChapterMode === 'add_to_cart';
    },
    
    // Get active chapter ID
    getActiveChapterId() {
        return this.activeChapterId;
    },
    
    // Get active chapter mode
    getActiveChapterMode() {
        return this.activeChapterMode;
    },
    
    // Get mode for a specific chapter (from the table)
    getChapterMode(chapterId) {
        if (!this.chapters || !this.chapters[chapterId]) {
            return 'add_to_cart'; // Default
        }
        return this.chapters[chapterId].mode || 'add_to_cart';
    },
    
    // Check if a specific chapter is created
    isChapterCreated(chapterId) {
        if (!this.chapters || !this.chapters[chapterId]) {
            return false;
        }
        return this.chapters[chapterId].created === true;
    },
    
    // Get all created chapters (for Collection page)
    getCreatedChapters() {
        if (!this.chapters) return [];
        return Object.keys(this.chapters).filter(chapterId => {
            return this.chapters[chapterId].created === true;
        });
    },
    
    // Check if user is logged in (for waitlist form)
    isUserLoggedIn() {
        return !!(window.AuthSystem?.currentUser || window.auth?.currentUser);
    },
    
    // Update all buttons on page based on mode
    updateAllButtons() {
        if (!this.isInitialized) return;
        
        const mode = this.activeChapterMode;
        const buttons = document.querySelectorAll('.add-to-cart-btn, .quick-add, [data-action="add-to-cart"]');
        
        buttons.forEach(btn => {
            if (mode === 'waitlist') {
                btn.textContent = 'Join the Waitlist';
                btn.classList.add('waitlist-btn');
                btn.classList.remove('add-to-cart-btn');
            } else if (mode === 'early_access') {
                btn.textContent = 'Add to Cart';
                btn.classList.remove('waitlist-btn');
                btn.classList.add('add-to-cart-btn');
            } else {
                btn.textContent = 'Add to Cart';
                btn.classList.remove('waitlist-btn');
                btn.classList.add('add-to-cart-btn');
            }
        });
    }
};

// Initialize chapter mode on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.ChapterMode.loadMode().then(() => {
            if (window.ChapterMode.isInitialized) {
                window.ChapterMode.updateAllButtons();
            }
        });
    });
} else {
    window.ChapterMode.loadMode().then(() => {
        if (window.ChapterMode.isInitialized) {
            window.ChapterMode.updateAllButtons();
        }
    });
}

// Re-initialize on visibility change (user returns to tab)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        window.ChapterMode.loadMode().then(() => {
            if (window.ChapterMode.isInitialized) {
                window.ChapterMode.updateAllButtons();
            }
        });
    }
});

