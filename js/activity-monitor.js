/* ========================================
   Sandro Sandri - Activity Monitor
   Tracks user clicks and interactions for online user monitoring
   ======================================== */

class ActivityMonitor {
    constructor() {
        this.sessionId = this.getSessionId();
        this.lastSendTime = 0;
        this.pendingSend = false;
        this.userEmail = null;
        this.isInitialized = false;
        this.sendQueue = null;
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        // Get user email from auth system (if logged in)
        this.updateUserEmail();

        // Listen for auth changes
        window.addEventListener('userLoggedIn', () => {
            this.updateUserEmail();
            this.sendActivity(); // Send immediately when user logs in
        });

        // Track initial page load immediately
        this.sendActivity();

        // Track ALL clicks immediately (no throttling for clicks)
        document.addEventListener('click', (e) => {
            // Track any click anywhere on the page
            this.sendActivity();
        }, true);

        // Track scrolls (throttled)
        let scrollTimeout = null;
        document.addEventListener('scroll', () => {
            if (scrollTimeout) clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.sendActivity();
            }, 2000); // Send scroll activity after 2 seconds of scrolling
        }, { passive: true });

        // Track keyboard input (throttled)
        let keyTimeout = null;
        document.addEventListener('keydown', () => {
            if (keyTimeout) clearTimeout(keyTimeout);
            keyTimeout = setTimeout(() => {
                this.sendActivity();
            }, 1000);
        }, true);

        // Track mouse movements (throttled - less important)
        let mouseTimeout = null;
        document.addEventListener('mousemove', () => {
            if (mouseTimeout) clearTimeout(mouseTimeout);
            mouseTimeout = setTimeout(() => {
                this.sendActivity();
            }, 5000);
        }, { passive: true });

        // Track touch events (immediate for mobile)
        document.addEventListener('touchstart', () => {
            this.sendActivity();
        }, { passive: true });

        // Track page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.sendActivity();
            }
        });

        // Track page navigation
        window.addEventListener('popstate', () => {
            this.sendActivity();
        });

        // Heartbeat: send activity every 30 seconds to keep session alive
        setInterval(() => {
            this.sendActivity();
        }, 30000);
    }

    updateUserEmail() {
        if (window.auth && window.auth.currentUser) {
            this.userEmail = window.auth.currentUser.email;
        } else {
            this.userEmail = null; // Guest user
        }
    }

    getSessionId() {
        let sessionId = sessionStorage.getItem('sandroSandri_sessionId');
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('sandroSandri_sessionId', sessionId);
        }
        return sessionId;
    }

    async sendActivity() {
        const now = Date.now();
        
        // Throttle: don't send more than once per second to avoid spam
        if (now - this.lastSendTime < 1000) {
            // Queue the send for later
            if (!this.pendingSend) {
                this.pendingSend = true;
                setTimeout(() => {
                    this.pendingSend = false;
                    this.sendActivity();
                }, 1000 - (now - this.lastSendTime));
            }
            return;
        }

        this.lastSendTime = now;
        this.pendingSend = false;

        const page = window.location.pathname;
        const pageName = page.split('/').pop() || 'index.html';
        
        // Check if user is on checkout or cart page
        const isCheckout = pageName.includes('checkout') || 
                          pageName.includes('cart') ||
                          window.location.href.includes('checkout') ||
                          window.location.href.includes('cart');
        
        try {
            const response = await fetch('/api/admin/activity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    email: this.userEmail, // Can be null for guest users
                    page: page,
                    pageName: pageName,
                    isCheckout: isCheckout,
                    userAgent: navigator.userAgent.substring(0, 100)
                })
            });

            if (!response.ok) {
                console.warn('Activity tracking failed:', response.status);
            }
        } catch (error) {
            // Silently fail - don't interrupt user experience
            console.warn('Activity tracking error:', error);
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

