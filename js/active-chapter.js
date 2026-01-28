/* ========================================
   Sandro Sandri - Active Chapter Manager
   Manages which chapter is currently displayed (Chapter I or Chapter II)
   ======================================== */

class ActiveChapter {
    constructor() {
        this.currentChapter = 'chapter_i'; // Default to Chapter I
        this.loadChapter();
    }

    async loadChapter() {
        try {
            const response = await fetch('/api/site-settings?setting=active-chapter');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.currentChapter = data.activeChapter || 'chapter_i';
                    this.dispatchUpdateEvent();
                }
            }
        } catch (error) {
            console.error('Error loading active chapter:', error);
            // Default to Chapter I on error
            this.currentChapter = 'chapter_i';
        }
    }

    getChapter() {
        return this.currentChapter;
    }

    isChapterI() {
        return this.currentChapter === 'chapter_i';
    }

    isChapterII() {
        return this.currentChapter === 'chapter_ii';
    }

    getChapterLabel() {
        return this.isChapterII() ? 'Chapter II' : 'Chapter I';
    }

    dispatchUpdateEvent() {
        // Dispatch event when chapter changes
        window.dispatchEvent(new CustomEvent('activeChapterUpdated', {
            detail: { chapter: this.currentChapter }
        }));
    }
}

// Initialize global instance
window.ActiveChapter = new ActiveChapter();

// Listen for chapter updates (for real-time updates)
window.addEventListener('activeChapterUpdated', (event) => {
    // Reload page to reflect chapter changes
    // This ensures all content updates correctly
    if (window.location.pathname === '/index.html' || window.location.pathname === '/') {
        // Only reload if on homepage
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }
});

