/* ========================================
   Sandro Sandri - Authentication System
   ======================================== */

class AuthSystem {
    constructor() {
        this.OWNER_EMAIL = 'sandrosandri.bysousa@gmail.com';
        this.OWNER_PASSWORD = 'pmpcsousa10';
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
    
    // Login function
    login(email, password) {
        // Validate owner credentials
        if (email === this.OWNER_EMAIL && password === this.OWNER_PASSWORD) {
            const user = {
                email: email,
                role: this.ROLES.OWNER,
                loggedInAt: new Date().toISOString()
            };
            this.saveUser(user);
            this.setupOwnerMode();
            
            // Trigger user sync after login
            window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { email } }));
            if (window.userSync) {
                setTimeout(() => {
                    window.userSync.updateUserEmail();
                    window.userSync.loadAllData();
                }, 500);
            }
            
            return { success: true, role: this.ROLES.OWNER };
        } else {
            // Regular user (no special privileges)
            const user = {
                email: email,
                role: this.ROLES.USER,
                loggedInAt: new Date().toISOString()
            };
            this.saveUser(user);
            this.ensureUserMode();
            
            // Trigger user sync after login
            window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { email } }));
            if (window.userSync) {
                setTimeout(() => {
                    window.userSync.updateUserEmail();
                    window.userSync.loadAllData();
                }, 500);
            }
            
            return { success: true, role: this.ROLES.USER };
        }
    }
    
    // Logout function
    logout() {
        localStorage.removeItem('sandroSandri_user');
        this.currentUser = null;
        this.ensureUserMode();
        // Redirect to home if on admin pages
        if (window.location.pathname.includes('admin')) {
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

