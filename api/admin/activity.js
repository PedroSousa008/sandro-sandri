/* ========================================
   Sandro Sandri - Admin Activity Tracking API
   Tracks user activity for online users and checkout monitoring
   ======================================== */

const db = require('../../lib/storage');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        // Record user activity
        try {
            const { sessionId, email, page, pageName, isCheckout, userAgent } = req.body;

            if (!sessionId) {
                return res.status(400).json({ error: 'Session ID is required' });
            }

            await db.initDb();

            // Get or create activity data
            let activityData = await db.getActivityData();
            if (!activityData) {
                activityData = {};
            }

            // Determine if user is on checkout page
            const currentPage = page || pageName || 'unknown';
            const onCheckoutPage = isCheckout === true || 
                                  currentPage.includes('checkout') || 
                                  currentPage.includes('cart');

            // Update or create session activity
            activityData[sessionId] = {
                sessionId: sessionId,
                email: email || null, // null for guest users
                page: currentPage,
                isCheckout: onCheckoutPage,
                userAgent: userAgent || 'unknown',
                lastActivity: new Date().toISOString(),
                createdAt: activityData[sessionId]?.createdAt || new Date().toISOString()
            };

            // Clean up old sessions (older than 10 minutes) - but keep active ones
            const now = new Date();
            Object.keys(activityData).forEach(id => {
                const session = activityData[id];
                if (session && session.lastActivity) {
                    const lastActivityTime = new Date(session.lastActivity);
                    const minutesSinceActivity = (now - lastActivityTime) / (1000 * 60);
                    // Remove sessions older than 10 minutes (safety cleanup)
                    if (minutesSinceActivity > 10) {
                        delete activityData[id];
                    }
                }
            });

            // Save activity data
            await db.saveActivityData(activityData);

            res.status(200).json({
                success: true,
                message: 'Activity recorded'
            });

        } catch (error) {
            console.error('Error recording activity:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to record activity',
                message: error.message
            });
        }
    } else if (req.method === 'GET') {
        // Get active users
        try {
            await db.initDb();

            const activityData = await db.getActivityData() || {};
            const now = new Date();
            const INACTIVE_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds

            // Filter active sessions (activity within last 5 minutes)
            const activeSessions = Object.values(activityData).filter(session => {
                if (!session || !session.lastActivity) return false;
                const lastActivityTime = new Date(session.lastActivity);
                const timeSinceActivity = now - lastActivityTime;
                return timeSinceActivity <= INACTIVE_THRESHOLD;
            });

            // Count online users (ALL users except owner)
            // This includes both logged-in users and guest users
            const onlineUsers = activeSessions.filter(s => {
                // Exclude owner email
                return s.email !== 'sandrosandri.bysousa@gmail.com';
            }).length;

            // Count users on checkout (must be on checkout page AND active within 5 minutes)
            const checkoutUsers = activeSessions.filter(s => {
                // Must be on checkout page AND not the owner
                return s.isCheckout === true && s.email !== 'sandrosandri.bysousa@gmail.com';
            }).length;

            res.status(200).json({
                success: true,
                onlineUsers: onlineUsers,
                checkoutUsers: checkoutUsers,
                activeSessions: activeSessions.length,
                totalSessions: Object.keys(activityData).length,
                sessions: activeSessions
            });

        } catch (error) {
            console.error('Error fetching activity:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch activity',
                message: error.message
            });
        }
    } else {
        return res.status(405).json({ error: 'Method not allowed' });
    }
};

