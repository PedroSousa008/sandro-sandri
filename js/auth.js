/* ========================================
   Sandro Sandri - Authentication System
   ======================================== */

function normalizeRole(role) {
    if (role === undefined || role === null) return 'USER';
    const s = String(role).trim().toUpperCase();
    return s === 'OWNER' ? 'OWNER' : 'USER';
}

function parseJwtPayload(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    try {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const pad = base64.length % 4;
        const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
        return JSON.parse(atob(padded));
    } catch (e) {
        return null;
    }
}

class AuthSystem {
    constructor() {
        this.ROLES = {
            OWNER: 'OWNER',
            USER: 'USER'
        };
        
        this.currentUser = this.loadUser();
        this.init();
    }
    
    init() {
        this.hydrateRoleFromJwt();
        // Check if user is logged in
        if (this.isOwner()) {
            this.setupOwnerMode();
        } else {
            this.ensureUserMode();
        }
        
        // Initialize admin system for user tracking (even for non-owners)
        // This ensures all users are tracked, not just owners
        if (window.AdminSystem && typeof window.AdminSystem.init === 'function') {
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                window.AdminSystem.init();
            }, 100);
        }
    }
    
    // Load user from localStorage
    loadUser() {
        try {
            const userData = localStorage.getItem('sandroSandri_user');
            if (userData) {
                const user = JSON.parse(userData);
                // Verify session is still valid (24 hours)
                if (user.expiresAt && new Date(user.expiresAt) > new Date()) {
                    if (user.role !== undefined) user.role = normalizeRole(user.role);
                    return user;
                } else {
                    this.logout();
                    return null;
                }
            }
        } catch (e) {
            console.error('Error loading user:', e);
        }
        return null;
    }
    
    // Save user to localStorage
    saveUser(user) {
        // Set expiration to 24 hours
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        
        user.role = normalizeRole(user.role);
        user.expiresAt = expiresAt.toISOString();
        localStorage.setItem('sandroSandri_user', JSON.stringify(user));
        this.currentUser = user;
    }

    /**
     * Align stored user with JWT (fixes missing/wrong role in localStorage after login).
     */
    hydrateRoleFromJwt() {
        const token = localStorage.getItem('sandroSandri_session_token');
        if (!token) return;
        const payload = parseJwtPayload(token);
        if (!payload || !payload.role) return;
        const role = normalizeRole(payload.role);
        const email = (payload.email && String(payload.email)) || '';
        if (!this.currentUser) {
            if (email || role === 'OWNER') {
                this.saveUser({ email: email, role: role, loggedInAt: new Date().toISOString() });
            }
            return;
        }
        const cur = normalizeRole(this.currentUser.role);
        if (cur !== role || (email && this.currentUser.email !== email)) {
            this.currentUser = Object.assign({}, this.currentUser, {
                email: email || this.currentUser.email,
                role: role
            });
            this.saveUser(this.currentUser);
        }
    }

    /**
     * Refresh user role/email from server (JWT in session). Call before admin-only pages.
     */
    async syncSessionFromServer() {
        const token = localStorage.getItem('sandroSandri_session_token');
        if (!token) return false;
        try {
            const response = await fetch('/api/auth/session', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Session-Token': token
                },
                credentials: 'same-origin'
            });
            const raw = await response.text();
            let data = {};
            if (raw) {
                try {
                    data = JSON.parse(raw);
                } catch (e) {
                    return false;
                }
            }
            if (!response.ok || !data.authenticated || !data.user) return false;
            const role = normalizeRole(data.user.role);
            const email = data.user.email || '';
            this.saveUser({
                email: email,
                role: role,
                loggedInAt: new Date().toISOString()
            });
            if (role === this.ROLES.OWNER) {
                this.setupOwnerMode();
            } else {
                this.ensureUserMode();
            }
            return true;
        } catch (e) {
            console.warn('syncSessionFromServer:', e);
            return false;
        }
    }
    
    // Login function - SECURITY: All authentication now server-side
    async login(email, password, securityAnswer = null) {
        // All authentication is now handled server-side via /api/auth/login
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ 
                    email, 
                    password,
                    securityAnswer: securityAnswer || null
                })
            });

            const raw = await response.text();
            let data = {};
            if (raw) {
                try {
                    data = JSON.parse(raw);
                } catch (parseErr) {
                    console.error('Login: non-JSON response', response.status, raw.substring(0, 200));
                    return {
                        success: false,
                        error: response.status >= 500
                            ? 'Server is temporarily unavailable. Please try again shortly.'
                            : 'Unexpected response from server. Please refresh the page and try again.'
                    };
                }
            }

            if (!response.ok) {
                // Check if email is not verified
                if (data.emailNotVerified) {
                    return { 
                        success: false, 
                        error: 'EMAIL_NOT_VERIFIED',
                        message: data.error,
                        email: data.email
                    };
                }
                return { 
                    success: false, 
                    error: data.error || data.message || 'Login failed' 
                };
            }

            // Login successful - save token and user info
            const token = data.token;
            let userRole = normalizeRole(data.role);
            if (!data.role && token) {
                const p = parseJwtPayload(token);
                if (p && p.role) userRole = normalizeRole(p.role);
            }
            
            // Store token in localStorage (for API calls)
            // Note: Cookie is also set by server (HttpOnly, Secure)
            if (token) {
                localStorage.setItem('sandroSandri_session_token', token);
            }

            const user = {
                email: data.email || email,
                role: userRole,
                loggedInAt: new Date().toISOString()
            };
            this.saveUser(user);
            
            if (userRole === this.ROLES.OWNER) {
                this.setupOwnerMode();
            } else {
                this.ensureUserMode();
            }
            
            // Side effects must not fail login (they used to throw into catch → false "Network error")
            try {
                if (window.ActivityTracker) {
                    window.ActivityTracker.trackLogin(email, null);
                }
            } catch (e) {
                console.warn('ActivityTracker.trackLogin:', e);
            }
            
            try {
                window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { email: data.email || email } }));
                if (window.userSync) {
                    setTimeout(() => {
                        try {
                            window.userSync.updateUserEmail();
                            window.userSync.loadAllData();
                        } catch (e) {
                            console.warn('userSync after login:', e);
                        }
                    }, 500);
                }
            } catch (e) {
                console.warn('post-login sync:', e);
            }
            
            return { success: true, role: userRole };
        } catch (error) {
            console.error('Login error:', error);
            return { 
                success: false, 
                error: error && error.name === 'TypeError'
                    ? 'Connection problem. Check your network and try again.'
                    : 'Network error. Please try again.' 
            };
        }
    }
    
    // Logout function
    logout() {
        // Track logout activity
        if (window.ActivityTracker) {
            window.ActivityTracker.trackLogout();
        }
        
        // Get current user email before clearing
        const currentEmail = this.currentUser?.email;
        
        // Clear ALL user-specific data from localStorage
        localStorage.removeItem('sandroSandri_user');
        localStorage.removeItem('sandroSandri_session_token');
        localStorage.removeItem('sandroSandriProfile');
        localStorage.removeItem('sandroSandriOrders');
        localStorage.removeItem('sandroSandriFavorites');
        localStorage.removeItem('sandroSandriCart');
        localStorage.removeItem('sandroSandriAtlas');
        
        // Clear all password storage for this user
        if (currentEmail) {
            // SECURITY: Password storage removed
        }
        
        // Clear all password storage (in case email is not available)
        Object.keys(localStorage).forEach(key => {
            // SECURITY: Password cleanup removed
            if (false && key.startsWith('sandroSandri_password_')) {
                localStorage.removeItem(key);
            }
        });
        
        this.currentUser = null;
        this.ensureUserMode();
        
        // Dispatch logout event for navigation updates
        window.dispatchEvent(new CustomEvent('userLoggedOut'));
        
        // Redirect to home if on admin or profile pages
        if (window.location.pathname.includes('admin') || window.location.pathname.includes('profile')) {
            window.location.href = 'index.html';
        }
    }
    
    
    // Check if current user is owner
    isOwner() {
        return !!(this.currentUser && normalizeRole(this.currentUser.role) === this.ROLES.OWNER);
    }
    
    // Check if current user is logged in
    isLoggedIn() {
        return this.currentUser !== null;
    }
    
    // Get current user role
    getRole() {
        return this.currentUser ? this.currentUser.role : this.ROLES.USER;
    }
    
    // Setup owner mode (show admin UI, enable editing)
    setupOwnerMode() {
        document.body.classList.add('owner-mode');
        document.body.classList.remove('user-mode');
        
        // Initialize admin features
        if (window.AdminSystem) {
            window.AdminSystem.init();
        }
        
        // Show admin bar
        this.showAdminBar();
    }
    
    // Ensure user mode (hide admin UI)
    ensureUserMode() {
        document.body.classList.add('user-mode');
        document.body.classList.remove('owner-mode');
        
        // Hide admin bar
        this.hideAdminBar();
    }
    
    // Show admin bar
    showAdminBar() {
        let adminBar = document.getElementById('admin-bar');
        if (!adminBar) {
            adminBar = document.createElement('div');
            adminBar.id = 'admin-bar';
            adminBar.innerHTML = `
                <div class="admin-bar-content">
                    <div class="admin-bar-left">
                        <span class="admin-badge">OWNER MODE</span>
                        <span class="admin-online-count" id="admin-online-count">0 users online</span>
                    </div>
                    <div class="admin-bar-right">
                        <button class="admin-btn" id="admin-dashboard-btn">Dashboard</button>
                        <button class="admin-btn" id="admin-deploy-btn">Deploy Changes</button>
                        <button class="admin-btn" id="admin-logout-btn">Logout</button>
                    </div>
                </div>
            `;
            document.body.appendChild(adminBar);
            
            // Bind events
            document.getElementById('admin-dashboard-btn').addEventListener('click', () => {
                window.location.href = 'admin.html';
            });
            
            document.getElementById('admin-deploy-btn').addEventListener('click', () => {
                if (window.AdminSystem) {
                    window.AdminSystem.deploy();
                }
            });
            
            document.getElementById('admin-logout-btn').addEventListener('click', () => {
                this.logout();
            });
        }
        adminBar.style.display = 'block';
    }
    
    // Hide admin bar
    hideAdminBar() {
        const adminBar = document.getElementById('admin-bar');
        if (adminBar) {
            adminBar.style.display = 'none';
        }
    }
}

// Initialize auth system
window.AuthSystem = new AuthSystem();

// Export for use in other scripts
window.auth = window.AuthSystem;

