/* ========================================
   Sandro Sandri - Admin API
   Combined admin endpoints (activity and customers)
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

    const { endpoint } = req.query;

    if (endpoint === 'activity') {
        // Activity tracking endpoint
        if (req.method === 'POST') {
            // Record user activity
            try {
                const { sessionId, email, page, pageName, isCheckout, userAgent } = req.body;

                if (!sessionId) {
                    return res.status(400).json({ error: 'Session ID is required' });
                }

                await db.initDb();

                let activityData = await db.getActivityData();
                if (!activityData) {
                    activityData = {};
                }

                const currentPage = page || pageName || 'unknown';
                const onCheckoutPage = isCheckout === true || 
                                      currentPage.includes('checkout') || 
                                      currentPage.includes('cart');

                activityData[sessionId] = {
                    sessionId: sessionId,
                    email: email || null,
                    page: currentPage,
                    isCheckout: onCheckoutPage,
                    userAgent: userAgent || 'unknown',
                    lastActivity: new Date().toISOString(),
                    createdAt: activityData[sessionId]?.createdAt || new Date().toISOString()
                };

                const now = new Date();
                Object.keys(activityData).forEach(id => {
                    const session = activityData[id];
                    if (session && session.lastActivity) {
                        const lastActivityTime = new Date(session.lastActivity);
                        const minutesSinceActivity = (now - lastActivityTime) / (1000 * 60);
                        if (minutesSinceActivity > 10) {
                            delete activityData[id];
                        }
                    }
                });

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
                const INACTIVE_THRESHOLD = 5 * 60 * 1000;

                const activeSessions = Object.values(activityData).filter(session => {
                    if (!session || !session.lastActivity) return false;
                    const lastActivityTime = new Date(session.lastActivity);
                    const timeSinceActivity = now - lastActivityTime;
                    return timeSinceActivity <= INACTIVE_THRESHOLD;
                });

                const onlineUsers = activeSessions.filter(s => {
                    return s.email !== 'sandrosandri.bysousa@gmail.com';
                }).length;

                const checkoutUsers = activeSessions.filter(s => {
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
        }
    } else if (endpoint === 'customers') {
        // Customers endpoint (GET only)
        if (req.method === 'GET') {
            try {
                await db.initDb();

                const userData = await db.getUserData();
                const orders = await db.getOrders();
                const activityData = await db.getActivityData() || {};

                const customersWithDetails = [];

                for (const email in userData) {
                    const user = userData[email];
                    const profile = user.profile || null;
                    const userOrders = orders.filter(o => o.email === email);
                    const userActivity = Object.values(activityData).filter(a => a.email === email);

                    // Get latest order address
                    let latestOrderAddress = null;
                    if (userOrders.length > 0) {
                        const latestOrder = userOrders.sort((a, b) => 
                            new Date(b.createdAt) - new Date(a.createdAt)
                        )[0];
                        if (latestOrder.shippingAddress) {
                            const addr = latestOrder.shippingAddress;
                            latestOrderAddress = `${addr.street || ''}${addr.apartment ? ', ' + addr.apartment : ''}, ${addr.city || ''}, ${addr.postalCode || ''}, ${addr.country || ''}`.trim();
                        }
                    }

                    customersWithDetails.push({
                        email: email,
                        profile: profile,
                        cart: user.cart || [],
                        favorites: user.favorites || [],
                        orders: userOrders,
                        password: user.password || null,
                        lastLogin: user.lastLogin || null,
                        totalOrders: userOrders.length,
                        totalSpent: userOrders.reduce((sum, order) => sum + (order.total || 0), 0),
                        lastOrderDate: userOrders.length > 0
                            ? userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0].createdAt
                            : null,
                        activity: userActivity,
                        updatedAt: user.updatedAt
                    });
                }

                res.status(200).json({
                    success: true,
                    customers: customersWithDetails
                });
            } catch (error) {
                console.error('Error fetching customers:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch customers',
                    message: error.message
                });
            }
        } else {
            return res.status(405).json({ error: 'Method not allowed' });
        }
    } else {
        return res.status(400).json({ error: 'Invalid endpoint. Use ?endpoint=activity or ?endpoint=customers' });
    }
};

