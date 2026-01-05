/* ========================================
   Sandro Sandri - Admin System
   ======================================== */

class AdminSystem {
    constructor() {
        this.draftContent = this.loadDraftContent();
        this.liveContent = this.loadLiveContent();
        this.onlineUsers = 0;
        this.userTrackingInterval = null;
    }
    
    init() {
        // Always apply content (live for users, draft for owner)
        this.applyDraftContent();
        
        // Track ALL users (both owner and regular users)
        this.trackUserSession();
        
        // Update online users count periodically
        this.updateOnlineUsers();
        
        // Set up interval to track and update (for all users)
        if (this.userTrackingInterval) {
            clearInterval(this.userTrackingInterval);
        }
        this.userTrackingInterval = setInterval(() => {
            this.trackUserSession();
            this.updateOnlineUsers();
        }, 5000);
        
        if (!window.auth || !window.auth.isOwner()) {
            // Regular users: only see live content, no admin features
            return;
        }
        
        // Owner-only features
        // Initialize edit mode
        this.initEditMode();
    }
    
    // Load draft content from localStorage
    loadDraftContent() {
        try {
            const draft = localStorage.getItem('sandroSandri_draft');
            return draft ? JSON.parse(draft) : {};
        } catch (e) {
            console.error('Error loading draft content:', e);
            return {};
        }
    }
    
    // Load live content from localStorage
    loadLiveContent() {
        try {
            const live = localStorage.getItem('sandroSandri_live');
            if (!live) {
                // Initialize with current page content
                return this.captureCurrentContent();
            }
            return JSON.parse(live);
        } catch (e) {
            console.error('Error loading live content:', e);
            return {};
        }
    }
    
    // Save draft content
    saveDraftContent() {
        localStorage.setItem('sandroSandri_draft', JSON.stringify(this.draftContent));
    }
    
    // Save live content
    saveLiveContent() {
        localStorage.setItem('sandroSandri_live', JSON.stringify(this.liveContent));
    }
    
    // Capture current page content as baseline
    captureCurrentContent() {
        const content = {
            pages: {},
            timestamp: new Date().toISOString()
        };
        
        // Capture text content from key elements
        document.querySelectorAll('[data-editable]').forEach(el => {
            const key = el.dataset.editable;
            content.pages[key] = {
                text: el.textContent.trim(),
                html: el.innerHTML
            };
        });
        
        return content;
    }
    
    // Apply draft content to page (only visible to owner)
    applyDraftContent() {
        if (!window.auth || !window.auth.isOwner()) {
            // Regular users: apply live content only
            this.applyLiveContent();
            return;
        }
        
        // Owner: apply draft content
        const currentPage = this.getCurrentPageId();
        const pageDraft = this.draftContent.pages?.[currentPage];
        
        if (pageDraft) {
            document.querySelectorAll('[data-editable]').forEach(el => {
                const key = el.dataset.editable;
                if (pageDraft[key]) {
                    el.innerHTML = pageDraft[key].html || pageDraft[key].text;
                    el.classList.add('draft-content');
                }
            });
        }
    }
    
    // Apply live content to page (for regular users)
    applyLiveContent() {
        if (window.auth && window.auth.isOwner()) {
            return; // Owner sees draft, not live
        }
        
        const currentPage = this.getCurrentPageId();
        const pageLive = this.liveContent.pages?.[currentPage];
        
        if (pageLive) {
            document.querySelectorAll('[data-editable]').forEach(el => {
                const key = el.dataset.editable;
                if (pageLive[key]) {
                    el.innerHTML = pageLive[key].html || pageLive[key].text;
                }
            });
        }
    }
    
    // Get current page identifier
    getCurrentPageId() {
        const path = window.location.pathname;
        const page = path.split('/').pop() || 'index.html';
        return page.replace('.html', '');
    }
    
    // Initialize edit mode (make elements editable)
    initEditMode() {
        document.querySelectorAll('[data-editable]').forEach(el => {
            el.classList.add('editable');
            el.addEventListener('click', (e) => {
                if (e.ctrlKey || e.metaKey) { // Ctrl/Cmd + Click to edit
                    e.preventDefault();
                    this.editElement(el);
                }
            });
        });
    }
    
    // Edit an element
    editElement(element) {
        const key = element.dataset.editable;
        const currentText = element.textContent.trim();
        
        const newText = prompt(`Edit "${key}":`, currentText);
        if (newText !== null && newText !== currentText) {
            // Update draft content
            const currentPage = this.getCurrentPageId();
            if (!this.draftContent.pages) {
                this.draftContent.pages = {};
            }
            if (!this.draftContent.pages[currentPage]) {
                this.draftContent.pages[currentPage] = {};
            }
            
            this.draftContent.pages[currentPage][key] = {
                text: newText,
                html: newText,
                timestamp: new Date().toISOString()
            };
            
            // Apply change immediately (draft mode)
            element.textContent = newText;
            element.innerHTML = newText;
            element.classList.add('draft-content');
            
            // Save draft
            this.saveDraftContent();
            
            // Show notification
            this.showNotification('Draft saved. Click "Deploy Changes" to publish.');
        }
    }
    
    // Deploy draft changes to live
    deploy() {
        if (!confirm('Deploy all draft changes to live? This will update the website for all users.')) {
            return;
        }
        
        // Merge draft into live
        this.liveContent = JSON.parse(JSON.stringify(this.draftContent));
        this.liveContent.deployedAt = new Date().toISOString();
        
        // Save live content
        this.saveLiveContent();
        
        // Clear draft (reset to match live)
        this.draftContent = JSON.parse(JSON.stringify(this.liveContent));
        this.saveDraftContent();
        
        // Remove draft styling
        document.querySelectorAll('.draft-content').forEach(el => {
            el.classList.remove('draft-content');
        });
        
        // Show success message
        this.showNotification('Changes deployed successfully! All users will now see the updated content.', 'success');
        
        // Reload page to show live content
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    }
    
    // Track user session (called for all users)
    trackUserSession() {
        const sessionId = this.getSessionId();
        const sessions = this.getActiveSessions();
        
        // Get user role
        const role = (window.auth && window.auth.getRole()) || 'USER';
        
        // Add/update this session
        sessions[sessionId] = {
            timestamp: new Date().toISOString(),
            role: role,
            page: this.getCurrentPageId()
        };
        
        // Remove old sessions (older than 30 seconds - considered offline)
        const now = new Date();
        Object.keys(sessions).forEach(id => {
            const session = sessions[id];
            const sessionTime = new Date(session.timestamp);
            const secondsSinceUpdate = (now - sessionTime) / 1000;
            
            // Remove sessions that haven't been updated in 30 seconds
            if (secondsSinceUpdate > 30) {
                delete sessions[id];
            }
        });
        
        // Save sessions
        localStorage.setItem('sandroSandri_sessions', JSON.stringify(sessions));
    }
    
    
    // Get active sessions
    getActiveSessions() {
        try {
            const sessions = localStorage.getItem('sandroSandri_sessions');
            return sessions ? JSON.parse(sessions) : {};
        } catch (e) {
            return {};
        }
    }
    
    // Get unique session ID
    getSessionId() {
        let sessionId = sessionStorage.getItem('sandroSandri_sessionId');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('sandroSandri_sessionId', sessionId);
        }
        return sessionId;
    }
    
    // Update online users count
    updateOnlineUsers() {
        // Only show to owner, but track all users
        const sessions = this.getActiveSessions();
        
        // Count active sessions (excluding owner sessions)
        const userSessions = Object.values(sessions).filter(s => s.role !== 'OWNER');
        this.onlineUsers = userSessions.length;
        
        // Update UI (only if owner is logged in)
        if (window.auth && window.auth.isOwner()) {
            const countEl = document.getElementById('admin-online-count');
            if (countEl) {
                countEl.textContent = `${this.onlineUsers} user${this.onlineUsers !== 1 ? 's' : ''} online`;
            }
            
            // Also update dashboard if on admin page
            const dashboardCount = document.getElementById('dashboard-online-count');
            if (dashboardCount) {
                dashboardCount.textContent = this.onlineUsers;
            }
        }
    }
    
    // Show notification
    showNotification(message, type = 'info') {
        // Remove existing notification
        const existing = document.querySelector('.admin-notification');
        if (existing) {
            existing.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = `admin-notification admin-notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize admin system
window.AdminSystem = new AdminSystem();

