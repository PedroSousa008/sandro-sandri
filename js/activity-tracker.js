/* ========================================
   Sandro Sandri - Activity Tracker
   Tracks every user action for admin review
   ======================================== */

class ActivityTracker {
    constructor() {
        this.userEmail = null;
    }

    // Initialize tracker
    init() {
        // Get user email from auth system
        if (window.auth && window.auth.currentUser) {
            this.userEmail = window.auth.currentUser.email;
        }
        
        // Listen for auth changes
        window.addEventListener('userLoggedIn', (e) => {
            this.userEmail = e.detail.email;
        });
    }

    // Track an activity
    async trackActivity(action, details = {}) {
        if (!this.userEmail) {
            // Try to get email from auth
            if (window.auth && window.auth.currentUser) {
                this.userEmail = window.auth.currentUser.email;
            } else {
                // Try to get from localStorage
                const userData = localStorage.getItem('sandroSandri_user');
                if (userData) {
                    try {
                        const user = JSON.parse(userData);
                        this.userEmail = user.email;
                    } catch (e) {
                        console.error('Error parsing user data:', e);
                        return;
                    }
                } else {
                    return; // No user email, skip tracking
                }
            }
        }

        const activity = {
            id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            email: this.userEmail,
            action: action,
            details: details,
            timestamp: new Date().toISOString(),
            page: window.location.pathname,
            userAgent: navigator.userAgent.substring(0, 100)
        };

        // Store locally first
        const activities = this.getLocalActivities();
        activities.push(activity);
        
        // Keep only last 1000 activities per user locally
        const userActivities = activities.filter(a => a.email === this.userEmail);
        if (userActivities.length > 1000) {
            userActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            const toKeep = userActivities.slice(0, 1000);
            const otherActivities = activities.filter(a => a.email !== this.userEmail);
            activities.length = 0;
            activities.push(...toKeep, ...otherActivities);
        }
        
        localStorage.setItem('sandroSandri_activities', JSON.stringify(activities));

        // Sync to server
        try {
            await fetch('/api/user/activity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(activity)
            });
        } catch (error) {
            console.error('Error syncing activity:', error);
            // Continue even if sync fails - activity is stored locally
        }
    }

    getLocalActivities() {
        try {
            const stored = localStorage.getItem('sandroSandri_activities');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    }

    // Convenience methods for common actions
    trackLogin(email, password) {
        this.trackActivity('LOGIN', { email, passwordSet: !!password });
    }

    trackLogout() {
        this.trackActivity('LOGOUT', {});
    }

    trackPasswordChange() {
        this.trackActivity('PASSWORD_CHANGE', {});
    }

    trackAddToCart(productId, productName, size, color, quantity) {
        this.trackActivity('ADD_TO_CART', { 
            productId, 
            productName, 
            size, 
            color, 
            quantity 
        });
    }

    trackRemoveFromCart(productId, productName) {
        this.trackActivity('REMOVE_FROM_CART', { 
            productId, 
            productName 
        });
    }

    trackUpdateCartQuantity(productId, productName, oldQuantity, newQuantity) {
        this.trackActivity('UPDATE_CART_QUANTITY', { 
            productId, 
            productName, 
            oldQuantity, 
            newQuantity 
        });
    }

    trackAddFavorite(productId, productName) {
        this.trackActivity('ADD_FAVORITE', { 
            productId, 
            productName 
        });
    }

    trackRemoveFavorite(productId, productName) {
        this.trackActivity('REMOVE_FAVORITE', { 
            productId, 
            productName 
        });
    }

    trackCheckoutStart(cartItems) {
        this.trackActivity('CHECKOUT_START', { 
            cartItems: cartItems.length,
            total: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        });
    }

    trackOrderComplete(orderId, orderNumber, total) {
        this.trackActivity('ORDER_COMPLETE', { 
            orderId, 
            orderNumber, 
            total 
        });
    }

    trackProfileUpdate(fields) {
        this.trackActivity('PROFILE_UPDATE', { 
            fields: Object.keys(fields) 
        });
    }

    trackPageView(page) {
        this.trackActivity('PAGE_VIEW', { page });
    }
}

// Initialize activity tracker
window.ActivityTracker = new ActivityTracker();
window.ActivityTracker.init();

