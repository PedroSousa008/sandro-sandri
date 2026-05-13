/* ========================================
   Sandro Sandri - Activity Monitor
   Tracks presence: who has the site open (recent pings) for owner dashboard
   ======================================== */

class ActivityMonitor {
    constructor() {
        this.sessionId = this.getSessionId();
        this.lastSendTime = 0;
        this.pendingSend = false;
        this.userEmail = null;
        this.isInitialized = false;
        this.sendQueue = null;
        this.heartbeatId = null;
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        this.updateUserEmail();

        window.addEventListener('userLoggedIn', () => {
            this.updateUserEmail();
            this.sendActivity();
        });

        this.sendActivity();
        this.scheduleHeartbeat();

        document.addEventListener('click', () => {
            this.sendActivity();
        }, true);

        document.addEventListener('submit', () => {
            this.sendActivity();
        }, true);

        document.addEventListener('change', () => {
            this.sendActivity();
        }, true);

        let scrollTimeout = null;
        document.addEventListener('scroll', () => {
            if (scrollTimeout) clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.sendActivity();
            }, 2000);
        }, { passive: true });

        let keyTimeout = null;
        document.addEventListener('keydown', () => {
            if (keyTimeout) clearTimeout(keyTimeout);
            keyTimeout = setTimeout(() => {
                this.sendActivity();
            }, 1000);
        }, true);

        let mouseTimeout = null;
        document.addEventListener('mousemove', () => {
            if (mouseTimeout) clearTimeout(mouseTimeout);
            mouseTimeout = setTimeout(() => {
                this.sendActivity();
            }, 5000);
        }, { passive: true });

        document.addEventListener('touchstart', () => {
            this.sendActivity();
        }, { passive: true });

        document.addEventListener('visibilitychange', () => {
            this.sendActivity();
            this.scheduleHeartbeat();
        });

        window.addEventListener('focus', () => {
            this.sendActivity();
        });

        window.addEventListener('popstate', () => {
            this.sendActivity();
        });

        window.addEventListener('pagehide', () => {
            this.flushPresenceLeave();
        });
    }

    scheduleHeartbeat() {
        if (this.heartbeatId) {
            clearInterval(this.heartbeatId);
            this.heartbeatId = null;
        }
        const ms = document.hidden ? 22000 : 10000;
        this.heartbeatId = setInterval(() => {
            this.sendActivity();
        }, ms);
    }

    flushPresenceLeave() {
        try {
            const body = JSON.stringify({
                sessionId: this.sessionId,
                email: this.userEmail,
                leave: true
            });
            fetch('/api/user?action=activity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
                keepalive: true,
                credentials: 'include'
            }).catch(() => {});
        } catch (e) {
            /* noop */
        }
    }

    updateUserEmail() {
        if (window.AuthSystem && window.AuthSystem.currentUser && window.AuthSystem.currentUser.email) {
            this.userEmail = window.AuthSystem.currentUser.email;
        } else if (window.auth && window.auth.currentUser && window.auth.currentUser.email) {
            this.userEmail = window.auth.currentUser.email;
        } else {
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
            this.userEmail = null;
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
        const THROTTLE_MS = 1300;

        if (now - this.lastSendTime < THROTTLE_MS) {
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

        const isCheckout = pageName.includes('checkout') ||
            pageName.includes('cart') ||
            window.location.href.includes('checkout') ||
            window.location.href.includes('cart');

        let cart = [];
        let chapters = [];
        try {
            const cartData = localStorage.getItem('sandroSandriCart');
            if (cartData) {
                cart = JSON.parse(cartData);
                const chapterSet = new Set();
                cart.forEach(item => {
                    if (item.productId >= 1 && item.productId <= 5) {
                        chapterSet.add('chapter-1');
                    } else if (item.productId >= 6 && item.productId <= 10) {
                        chapterSet.add('chapter-2');
                    }
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
            const endpoint = '/api/user?action=activity';

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    email: this.userEmail,
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
                try {
                    const errorData = await response.json();
                    console.warn('Activity tracking error details:', errorData);
                } catch (e) {
                    // Ignore JSON parse errors
                }
            }
        } catch (error) {
            console.error('Activity tracking network error:', error);
        }
    }
}

if (typeof window !== 'undefined') {
    window.ActivityMonitor = new ActivityMonitor();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (window.ActivityMonitor && !window.ActivityMonitor.isInitialized) {
                window.ActivityMonitor.init();
            }
        });
    } else {
        if (!window.ActivityMonitor.isInitialized) {
            window.ActivityMonitor.init();
        }
    }

    setTimeout(() => {
        if (window.ActivityMonitor && !window.ActivityMonitor.isInitialized) {
            window.ActivityMonitor.init();
        }
    }, 100);
}
