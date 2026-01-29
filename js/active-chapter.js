/* ========================================
   Sandro Sandri - Active Chapter Manager
   Manages which chapter is currently displayed (uses Chapter Mode System)
   ======================================== */

class ActiveChapter {
    constructor() {
        this.currentChapter = 'chapter_i'; // Default to Chapter I
        this.activeChapterId = null; // From Chapter Mode System (chapter-1, chapter-2, etc.)
        this.loadChapter();
    }

    async loadChapter() {
        try {
            // Use new Chapter Mode API
            const response = await fetch('/api/chapter-mode');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.activeChapterId) {
                    this.activeChapterId = data.activeChapterId;
                    // Convert chapter-1 to chapter_i, chapter-2 to chapter_ii, etc.
                    const chapterNum = parseInt(this.activeChapterId.replace('chapter-', ''));
                    if (chapterNum === 1) {
                        this.currentChapter = 'chapter_i';
                    } else if (chapterNum === 2) {
                        this.currentChapter = 'chapter_ii';
                    } else {
                        // For chapters 3-10, use chapter_iii, chapter_iv, etc.
                        const roman = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
                        this.currentChapter = `chapter_${roman[chapterNum - 1] || chapterNum}`;
                    }
                    this.dispatchUpdateEvent();
                    return;
                }
            }
        } catch (error) {
            console.error('Error loading active chapter from Chapter Mode:', error);
        }
        
        // Fallback to old API if Chapter Mode not available
        try {
            const response = await fetch('/api/site-settings?setting=active-chapter');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.currentChapter = data.activeChapter || 'chapter_i';
                    this.dispatchUpdateEvent();
                    return;
                }
            }
        } catch (error) {
            console.error('Error loading active chapter:', error);
        }
        
        // Default to Chapter I on error
        this.currentChapter = 'chapter_i';
        this.dispatchUpdateEvent();
    }

    getChapter() {
        return this.currentChapter;
    }

    getActiveChapterId() {
        return this.activeChapterId || (this.isChapterI() ? 'chapter-1' : 'chapter-2');
    }

    isChapterI() {
        return this.currentChapter === 'chapter_i' || this.activeChapterId === 'chapter-1';
    }

    isChapterII() {
        return this.currentChapter === 'chapter_ii' || this.activeChapterId === 'chapter-2';
    }

    getChapterLabel() {
        if (this.activeChapterId) {
            const chapterNum = parseInt(this.activeChapterId.replace('chapter-', ''));
            const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
            return `Chapter ${roman[chapterNum - 1] || chapterNum}`;
        }
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
                detail: { chapter: this.currentChapter, activeChapterId: this.activeChapterId }
            }));
        }
    }
}

// Initialize global instance
window.ActiveChapter = new ActiveChapter();

// Remove auto-reload to prevent refresh loops
// Pages will update content dynamically without full page reload

