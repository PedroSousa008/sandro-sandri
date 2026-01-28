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

