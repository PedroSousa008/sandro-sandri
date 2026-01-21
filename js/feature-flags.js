/* ========================================
   Sandro Sandri - Feature Flags
   Controls visibility of chapters and features based on launch dates
   ======================================== */

// Chapter launch dates (YYYY-MM-DD format)
const CHAPTER_LAUNCH_DATES = {
    'chapter-1': '2024-01-01', // Already launched
    'chapter-2': '2026-06-13'  // Launch date: June 13, 2026
};

/**
 * Check if a chapter is available (launched)
 * @param {string} chapterId - Chapter identifier (e.g., 'chapter-1', 'chapter-2')
 * @returns {boolean} - True if chapter should be visible
 */
function isChapterAvailable(chapterId) {
    const launchDate = CHAPTER_LAUNCH_DATES[chapterId];
    if (!launchDate) {
        console.warn(`No launch date defined for ${chapterId}`);
        return false; // Hide if no launch date defined
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to compare dates only
    
    const launch = new Date(launchDate);
    launch.setHours(0, 0, 0, 0);
    
    return today >= launch;
}

/**
 * Get all available chapters
 * @returns {string[]} - Array of chapter IDs that are available
 */
function getAvailableChapters() {
    return Object.keys(CHAPTER_LAUNCH_DATES).filter(chapterId => 
        isChapterAvailable(chapterId)
    );
}

/**
 * Check if we're in preview/development mode
 * Allows showing unpublished chapters for testing
 * Set via URL parameter ?preview=true or environment variable
 */
function isPreviewMode() {
    // Check URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('preview') === 'true') {
        return true;
    }
    
    // Check localStorage (for testing)
    if (localStorage.getItem('sandroSandriPreviewMode') === 'true') {
        return true;
    }
    
    return false;
}

/**
 * Check if a chapter should be visible (respects launch dates and preview mode)
 * @param {string} chapterId - Chapter identifier
 * @returns {boolean} - True if chapter should be visible
 */
function shouldShowChapter(chapterId) {
    // In preview mode, show all chapters
    if (isPreviewMode()) {
        return true;
    }
    
    // Otherwise, respect launch dates
    return isChapterAvailable(chapterId);
}

// Export functions
window.FeatureFlags = {
    isChapterAvailable,
    getAvailableChapters,
    isPreviewMode,
    shouldShowChapter,
    CHAPTER_LAUNCH_DATES
};

