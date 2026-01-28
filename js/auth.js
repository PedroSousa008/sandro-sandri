/* ========================================
   Sandro Sandri - Authentication System
   ======================================== */

class AuthSystem {
    constructor() {
        this.OWNER_EMAIL = 'sandrosandri.bysousa@gmail.com';
        // SECURITY: Password removed from frontend - authentication now server-side only
        this.ROLES = {
            OWNER: 'OWNER',
            USER: 'USER'
        };
        
        this.currentUser = this.loadUser();
        this.init();
    }
    
    init() {
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
        
        user.expiresAt = expiresAt.toISOString();
        localStorage.setItem('sandroSandri_user', JSON.stringify(user));
        this.currentUser = user;
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
                body: JSON.stringify({ 
                    email, 
                    password,
                    securityAnswer: email.toLowerCase() === this.OWNER_EMAIL.toLowerCase() ? securityAnswer : null
                })
            });

            // Check if response is OK and content-type is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Non-JSON response from server:', text.substring(0, 200));
                return { 
                    success: false, 
                    error: `Server error (${response.status}). Please try again.` 
                };
            }

            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                console.error('Failed to parse JSON response:', parseError);
                const text = await response.text();
                console.error('Response text:', text.substring(0, 200));
                return { 
                    success: false, 
                    error: 'Invalid response from server. Please try again.' 
                };
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
                    error: data.error || 'Login failed' 
                };
            }

            // Login successful - save token and user info
            const token = data.token;
            const userRole = data.role || this.ROLES.USER;
            
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
            
            // Track login activity (without password)
            if (window.ActivityTracker) {
                window.ActivityTracker.trackLogin(email, null); // Don't track password
            }
            
            // Trigger user sync after login
            window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { email: data.email || email } }));
            if (window.userSync) {
                setTimeout(() => {
                    window.userSync.updateUserEmail();
                    window.userSync.loadAllData();
                }, 500);
            }
            
            return { success: true, role: userRole };
        } catch (error) {
            console.error('Login error:', error);
            return { 
                success: false, 
                error: 'Network error. Please try again.' 
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
        return this.currentUser && this.currentUser.role === this.ROLES.OWNER;
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

