/* ========================================
   Sandro Sandri - User API (Combined)
   Handles user sync and activity tracking
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

    // Get the action from query parameter
    const action = req.query.action || (req.url.includes('/sync') ? 'sync' : req.url.includes('/activity') ? 'activity' : null);

    try {
        // ACTIVITY TRACKING (POST with action=activity)
        if (req.method === 'POST' && action === 'activity') {
            const { sessionId, email, page, pageName, isCheckout, userAgent } = req.body;

            if (!sessionId) {
                return res.status(400).json({ error: 'Session ID is required' });
            }

            await db.initDb();

            let activityData = await db.getActivityData();
            if (!activityData) {
                activityData = {};
            }
            
            const existingSession = activityData[sessionId];
            if (existingSession && existingSession.lastActivity) {
                const lastUpdate = new Date(existingSession.lastActivity);
                const now = new Date();
                const secondsSinceUpdate = (now - lastUpdate) / 1000;
                
                if (secondsSinceUpdate < 2) {
                    return res.status(200).json({
                        success: true,
                        message: 'Activity recorded (throttled)'
                    });
                }
            }

            const currentPage = page || pageName || 'unknown';
            const onCheckoutPage = isCheckout === true || currentPage.toLowerCase().includes('checkout');

            activityData[sessionId] = {
                sessionId: sessionId,
                email: email || null,
                page: currentPage,
                isCheckout: onCheckoutPage,
                userAgent: userAgent || 'unknown',
                lastActivity: new Date().toISOString(),
                createdAt: activityData[sessionId]?.createdAt || new Date().toISOString()
            };

            const shouldCleanup = Math.random() < 0.1;
            if (shouldCleanup) {
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
            }

            await db.saveActivityData(activityData);

            res.status(200).json({
                success: true,
                message: 'Activity recorded'
            });
            return;
        }

        // USER SYNC (GET and POST)
        if (action === 'sync' || !action) {
            if (req.method === 'GET') {
                // Load user data
                const { email } = req.query;

                if (!email) {
                    return res.status(400).json({ error: 'Email is required' });
                }

                await db.initDb();

                const userData = await db.getUserData();
                const atlasData = await db.getAtlasData();

                const user = userData[email] || {
                    cart: [],
                    profile: null,
                    favorites: [],
                    orders: [],
                    lastLogin: null,
                    updatedAt: null
                };
                
                if (req.body && req.body.lastLogin) {
                    user.lastLogin = req.body.lastLogin;
                }

                const atlas = atlasData[email] || {
                    memories: {},
                    chapters: {},
                    updatedAt: null
                };

                res.status(200).json({
                    success: true,
                    data: {
                        cart: user.cart || [],
                        profile: user.profile || null,
                        favorites: user.favorites || [],
                        orders: user.orders || [],
                        atlas: atlas
                    }
                });
                return;
            } else if (req.method === 'POST') {
                // Save user data
                const { email, cart, profile, favorites, orders, atlas, lastLogin } = req.body;

                if (!email) {
                    return res.status(400).json({ error: 'Email is required' });
                }

                await db.initDb();

                const userData = await db.getUserData();
                const atlasData = await db.getAtlasData();

                const existingUser = userData[email] || {
                    cart: [],
                    profile: null,
                    favorites: [],
                    orders: [],
                    lastLogin: null,
                    updatedAt: null
                };

                const newUserData = {
                    cart: cart !== undefined ? cart : existingUser.cart,
                    profile: profile !== undefined ? profile : existingUser.profile,
                    favorites: favorites !== undefined ? (Array.isArray(favorites) ? favorites : []) : existingUser.favorites,
                    orders: orders !== undefined ? orders : existingUser.orders,
                    lastLogin: req.body.lastLogin !== undefined ? req.body.lastLogin : existingUser.lastLogin,
                    updatedAt: new Date().toISOString()
                };
                
                if (existingUser.passwordHash) {
                    newUserData.passwordHash = existingUser.passwordHash;
                }

                const existingStr = JSON.stringify(existingUser);
                const newStr = JSON.stringify(newUserData);
                const dataChanged = existingStr !== newStr;
                
                if (dataChanged) {
                    userData[email] = newUserData;
                } else {
                    return res.status(200).json({
                        success: true,
                        message: 'User data unchanged, no save needed'
                    });
                }

                if (atlas) {
                    atlasData[email] = {
                        memories: atlas.memories || {},
                        chapters: atlas.chapters || {},
                        updatedAt: new Date().toISOString()
                    };
                }

                if (dataChanged) {
                    await db.saveUserData(userData);
                }
                if (atlas) {
                    await db.saveAtlasData(atlasData);
                }

                res.status(200).json({
                    success: true,
                    message: 'User data saved successfully'
                });
                return;
            }
        }

        return res.status(400).json({ error: 'Invalid action' });

    } catch (error) {
        console.error('Error in user API:', error);
        res.status(500).json({
            error: 'Failed to process request',
            message: error.message
        });
    }
};

