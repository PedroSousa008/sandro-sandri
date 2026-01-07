/* ========================================
   Sandro Sandri - Cross-Device User Tracking
   ======================================== */

// This uses a simple free service to track users across devices
// For production, you'd want a proper backend, but this works for now

class UserTracking {
    constructor() {
        this.apiUrl = 'https://api.jsonbin.io/v3/b'; // Using JSONBin.io as a free shared storage
        this.binId = null;
        this.apiKey = '$2a$10$YOUR_API_KEY'; // You'll need to get a free API key from jsonbin.io
        this.sessionId = this.getSessionId();
        this.role = (window.auth && window.auth.getRole()) || 'USER';
    }
    
    getSessionId() {
        let sessionId = sessionStorage.getItem('sandroSandri_sessionId');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('sandroSandri_sessionId', sessionId);
        }
        return sessionId;
    }
    
    // Track user session (simplified version using localStorage with better cross-device attempt)
    trackSession() {
        // For now, we'll use a combination approach:
        // 1. Store in localStorage (works within same browser)
        // 2. Try to use a shared mechanism
        
        const sessionData = {
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            role: this.role,
            page: window.location.pathname,
            userAgent: navigator.userAgent.substring(0, 100)
        };
        
        // Store locally
        const localSessions = this.getLocalSessions();
        localSessions[this.sessionId] = sessionData;
        this.cleanOldSessions(localSessions);
        localStorage.setItem('sandroSandri_sessions', JSON.stringify(localSessions));
        
        // For cross-device: We'll use a simple approach with a shared key
        // In a real app, you'd use a backend API
        this.syncToSharedStorage(localSessions);
    }
    
    getLocalSessions() {
        try {
            const sessions = localStorage.getItem('sandroSandri_sessions');
            return sessions ? JSON.parse(sessions) : {};
        } catch (e) {
            return {};
        }
    }
    
    cleanOldSessions(sessions) {
        const now = new Date();
        Object.keys(sessions).forEach(id => {
            const session = sessions[id];
            if (!session || !session.timestamp) {
                delete sessions[id];
                return;
            }
            const sessionTime = new Date(session.timestamp);
            const secondsSinceUpdate = (now - sessionTime) / 1000;
            if (secondsSinceUpdate > 30) {
                delete sessions[id];
            }
        });
    }
    
    syncToSharedStorage(sessions) {
        // Store a "last seen" timestamp that can be checked
        // This is a workaround - for true cross-device, you need a backend
        const syncData = {
            sessions: sessions,
            lastUpdate: new Date().toISOString(),
            updateCount: (parseInt(localStorage.getItem('sandroSandri_updateCount') || '0') + 1).toString()
        };
        
        localStorage.setItem('sandroSandri_sessions_sync', JSON.stringify(syncData));
        localStorage.setItem('sandroSandri_updateCount', syncData.updateCount);
        
        // Try to use IndexedDB for better cross-tab communication
        if ('indexedDB' in window) {
            this.storeInIndexedDB(syncData);
        }
    }
    
    storeInIndexedDB(data) {
        // Simple IndexedDB storage for better cross-tab sync
        const request = indexedDB.open('SandroSandriTracking', 1);
        
        request.onerror = () => {
            // IndexedDB not available, fallback to localStorage
        };
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['sessions'], 'readwrite');
            const store = transaction.objectStore('sessions');
            store.put(data, 'current');
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('sessions')) {
                db.createObjectStore('sessions');
            }
        };
    }
    
    getOnlineUserCount() {
        const sessions = this.getLocalSessions();
        this.cleanOldSessions(sessions);
        
        // Count non-owner sessions
        const userSessions = Object.values(sessions).filter(s => {
            return s && s.role && s.role !== 'OWNER';
        });
        
        return userSessions.length;
    }
}

// Initialize tracking
window.UserTracking = new UserTracking();

// Track on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.UserTracking.trackSession();
    });
} else {
    window.UserTracking.trackSession();
}

// Track every 5 seconds
setInterval(() => {
    window.UserTracking.trackSession();
}, 5000);


