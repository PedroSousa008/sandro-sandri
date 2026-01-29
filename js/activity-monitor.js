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
        // This ensures users are marked as online whenever they interact
        document.addEventListener('click', (e) => {
            // Track any click anywhere on the page
            this.sendActivity();
        }, true);
        
        // Also track button clicks, form submissions, and other interactions
        document.addEventListener('submit', () => {
            this.sendActivity();
        }, true);
        
        document.addEventListener('change', () => {
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

        // Track page visibility changes (throttled)
        let visibilityTimeout = null;
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // Throttle visibility change tracking
                if (visibilityTimeout) clearTimeout(visibilityTimeout);
                visibilityTimeout = setTimeout(() => {
                    this.sendActivity();
                }, 2000); // Wait 2 seconds after page becomes visible
            }
        });

        // Track page navigation
        window.addEventListener('popstate', () => {
            this.sendActivity();
        });

        // Heartbeat: send activity every 30 seconds to keep session alive
        // This ensures users stay marked as online even if they're just reading/not clicking
        setInterval(() => {
            this.sendActivity();
        }, 30000); // 30 seconds - keeps users online while reducing server load
    }

    updateUserEmail() {
        // Try multiple auth systems to get user email
        if (window.AuthSystem && window.AuthSystem.currentUser && window.AuthSystem.currentUser.email) {
            this.userEmail = window.AuthSystem.currentUser.email;
        } else if (window.auth && window.auth.currentUser && window.auth.currentUser.email) {
            this.userEmail = window.auth.currentUser.email;
        } else {
            // Check localStorage for user session
            try {
                const userData = localStorage.getItem('sandroSandri_user');
                if (userData) {
                    const user = JSON.parse(userData);
                    if (user.email && user.expiresAt && new Date(user.expiresAt) > new Date()) {
                        this.userEmail = user.email;
                        return;
                    }
                }
            } catch (e) {
                // Ignore parse errors
            }
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
        
        // Throttle: don't send more than once per 3 seconds to reduce server load
        // This still provides real-time tracking while being more efficient
        const THROTTLE_MS = 3000; // 3 seconds instead of 1 second
        
        if (now - this.lastSendTime < THROTTLE_MS) {
            // Queue the send for later
            if (!this.pendingSend) {
                this.pendingSend = true;
                setTimeout(() => {
                    this.pendingSend = false;
                    this.sendActivity();
                }, THROTTLE_MS - (now - this.lastSendTime));
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
        
        // Get cart to determine chapters
        let cart = [];
        let chapters = [];
        try {
            const cartData = localStorage.getItem('sandroSandriCart');
            if (cartData) {
                cart = JSON.parse(cartData);
                // Extract chapters from cart
                const chapterSet = new Set();
                cart.forEach(item => {
                    if (item.productId >= 1 && item.productId <= 5) {
                        chapterSet.add('chapter-1');
                    } else if (item.productId >= 6 && item.productId <= 10) {
                        chapterSet.add('chapter-2');
                    }
                    // Also check if item has explicit chapter field
                    if (item.chapter) {
                        chapterSet.add(item.chapter);
                    } else if (item.chapter_id) {
                        chapterSet.add(item.chapter_id);
                    }
                });
                chapters = Array.from(chapterSet);
            }
        } catch (e) {
            console.warn('Error reading cart for activity tracking:', e);
        }

        try {
            // IMPORTANT: Use public endpoint for activity tracking (works for logged in and non-logged in users)
            // DO NOT use /api/admin?endpoint=activity - that requires authentication
            const endpoint = '/api/user?action=activity';
            
            const response = await fetch(endpoint, {
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
                    userAgent: navigator.userAgent.substring(0, 100),
                    cart: cart,
                    chapters: chapters
                })
            });

            if (!response.ok) {
                console.warn('Activity tracking failed:', response.status, response.statusText);
                // Try to get error details for debugging
                try {
                    const errorData = await response.json();
                    console.warn('Activity tracking error details:', errorData);
                } catch (e) {
                    // Ignore JSON parse errors
                }
            } else {
                // Success - activity was recorded
                try {
                    const data = await response.json();
                    if (data.success) {
                        // Activity successfully recorded
                    }
                } catch (e) {
                    // Ignore JSON parse errors
                }
            }
        } catch (error) {
            // Log error but don't interrupt user experience
            console.error('Activity tracking network error:', error);
        }
    }
}

// Initialize activity monitor on ALL pages
// This ensures every user (logged in or not) is tracked
if (typeof window !== 'undefined') {
    // Create global instance immediately
    window.ActivityMonitor = new ActivityMonitor();
    
    // Initialize as soon as possible
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (window.ActivityMonitor && !window.ActivityMonitor.isInitialized) {
                window.ActivityMonitor.init();
            }
        });
    } else {
        // DOM already loaded, initialize immediately
        if (!window.ActivityMonitor.isInitialized) {
            window.ActivityMonitor.init();
        }
    }
    
    // Also try to initialize after a short delay to catch any edge cases
    setTimeout(() => {
        if (window.ActivityMonitor && !window.ActivityMonitor.isInitialized) {
            console.log('ActivityMonitor: Delayed initialization');
            window.ActivityMonitor.init();
        }
    }, 100);
}

