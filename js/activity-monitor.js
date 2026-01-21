/* ========================================
   Sandro Sandri - Activity Monitor
   Tracks user clicks and interactions for online user monitoring
   ======================================== */

class ActivityMonitor {
    constructor() {
        this.sessionId = this.getSessionId();
        this.lastActivityTime = Date.now();
        this.activityTimeout = null;
        this.userEmail = null;
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        // Get user email from auth system
        if (window.auth && window.auth.currentUser) {
            this.userEmail = window.auth.currentUser.email;
        }

        // Listen for auth changes
        window.addEventListener('userLoggedIn', (e) => {
            this.userEmail = e.detail.email;
        });

        // Track initial page load
        this.recordActivity();

        // Track clicks, scrolls, and other interactions
        document.addEventListener('click', () => this.recordActivity(), true);
        document.addEventListener('scroll', () => this.recordActivity(), { passive: true });
        document.addEventListener('keydown', () => this.recordActivity(), true);
        document.addEventListener('mousemove', () => this.recordActivity(), { passive: true });
        document.addEventListener('touchstart', () => this.recordActivity(), { passive: true });

        // Track page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.recordActivity();
            }
        });

        // Send activity every 30 seconds even if no interaction (heartbeat)
        setInterval(() => {
            this.recordActivity();
        }, 30000);
    }

    getSessionId() {
        let sessionId = sessionStorage.getItem('sandroSandri_sessionId');
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('sandroSandri_sessionId', sessionId);
        }
        return sessionId;
    }

    recordActivity() {
        const now = Date.now();
        
        // Throttle: only send if at least 5 seconds have passed since last send
        if (now - this.lastActivityTime < 5000) {
            // Clear existing timeout and set a new one
            if (this.activityTimeout) {
                clearTimeout(this.activityTimeout);
            }
            this.activityTimeout = setTimeout(() => {
                this.sendActivity();
            }, 5000);
            return;
        }

        this.lastActivityTime = now;
        this.sendActivity();
    }

    async sendActivity() {
        const page = window.location.pathname;
        const isCheckout = page.includes('checkout') || page.includes('cart');
        
        try {
            await fetch('/api/admin/activity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    email: this.userEmail,
                    page: page,
                    isCheckout: isCheckout,
                    userAgent: navigator.userAgent.substring(0, 100)
                })
            });
        } catch (error) {
            console.error('Error sending activity:', error);
            // Silently fail - don't interrupt user experience
        }
    }
}

// Initialize activity monitor
if (typeof window !== 'undefined') {
    window.ActivityMonitor = new ActivityMonitor();
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.ActivityMonitor.init();
        });
    } else {
        window.ActivityMonitor.init();
    }
}

