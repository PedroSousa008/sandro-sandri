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
        // Only dispatch event if chapter actually changed
        // This prevents unnecessary reloads
        const previousChapter = window._lastActiveChapter;
        if (previousChapter !== this.currentChapter) {
            window._lastActiveChapter = this.currentChapter;
            // Dispatch event when chapter changes
            window.dispatchEvent(new CustomEvent('activeChapterUpdated', {
                detail: { chapter: this.currentChapter }
            }));
        }
    }
}

// Initialize global instance
window.ActiveChapter = new ActiveChapter();

// Remove auto-reload to prevent refresh loops
// Pages will update content dynamically without full page reload

