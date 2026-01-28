/* ========================================
   Sandro Sandri - Admin API
   Combined admin endpoints (activity and customers)
   ======================================== */

const db = require('../../lib/storage');
const auth = require('../../lib/auth');
const securityLog = require('../../lib/security-log');
const cors = require('../../lib/cors');
const errorHandler = require('../../lib/error-handler');

module.exports = async (req, res) => {
    try {
        // Set secure CORS headers (restricted to allowed origins)
        cors.setCORSHeaders(res, req, ['GET', 'POST', 'DELETE', 'OPTIONS']);

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        const { endpoint } = req.query;
    
    // SECURITY: Protect all admin endpoints (except activity POST which is public for tracking)
    if (endpoint === 'customers' || (endpoint === 'activity' && req.method === 'GET')) {
        const adminCheck = auth.requireAdmin(req);
        if (!adminCheck.authorized) {
            // SECURITY: Log unauthorized access attempt
            await securityLog.logUnauthorizedAccess(req, `/api/admin?endpoint=${endpoint}`, adminCheck.error);
            return res.status(adminCheck.statusCode).json({
                success: false,
                error: adminCheck.error
            });
        }
        // Store user in request for logging
        req.user = adminCheck.user;
    }

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

                // Optimize: Only update if session doesn't exist or last update was > 2 seconds ago
                // This reduces KV writes by ~70% while maintaining accuracy
                let activityData = await db.getActivityData();
                if (!activityData) {
                    activityData = {};
                }
                
                const existingSession = activityData[sessionId];
                if (existingSession && existingSession.lastActivity) {
                    const lastUpdate = new Date(existingSession.lastActivity);
                    const now = new Date();
                    const secondsSinceUpdate = (now - lastUpdate) / 1000;
                    
                    // Skip update if less than 2 seconds since last update (reduces KV writes)
                    if (secondsSinceUpdate < 2) {
                        return res.status(200).json({
                            success: true,
                            message: 'Activity recorded (throttled)'
                        });
                    }
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

                // Optimize: Clean up old sessions less frequently (every 10th request)
                // This reduces KV writes while still maintaining cleanup
                const shouldCleanup = Math.random() < 0.1; // 10% chance per request
                
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
            } catch (error) {
                // SECURITY: Don't expose error details to users
                errorHandler.sendSecureError(res, error, 500, 'Failed to record activity. Please try again.', 'RECORD_ACTIVITY_ERROR');
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
                // SECURITY: Don't expose error details to users
                errorHandler.sendSecureError(res, error, 500, 'Failed to fetch activity. Please try again.', 'FETCH_ACTIVITY_ERROR');
            }
        }
    } else if (endpoint === 'customers') {
        // Customers endpoint (GET and DELETE)
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

                    // SECURITY: Do not expose password (even if it exists in DB)
                    customersWithDetails.push({
                        email: email,
                        profile: profile,
                        cart: user.cart || [],
                        favorites: user.favorites || [],
                        orders: userOrders,
                        // password: REMOVED - never expose passwords
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
                    customers: customersWithDetails,
                    totalCustomers: customersWithDetails.length
                });
            } catch (error) {
                // SECURITY: Don't expose error details to users
                errorHandler.sendSecureError(res, error, 500, 'Failed to fetch customers. Please try again.', 'FETCH_CUSTOMERS_ERROR');
            }
        } else if (req.method === 'DELETE') {
            // Delete customer endpoint - SECURITY: Already protected by requireAdmin above
            try {
                const { email } = req.query;
                
                if (!email) {
                    return res.status(400).json({ 
                        success: false,
                        error: 'Email is required' 
                    });
                }
                
                // Prevent deleting the owner account
                if (email.toLowerCase() === auth.OWNER_EMAIL.toLowerCase()) {
                    await securityLog.logAdminAction(req, 'DELETE_CUSTOMER', { email, blocked: true, reason: 'Owner account protection' });
                    return res.status(403).json({ 
                        success: false,
                        error: 'Cannot delete owner account' 
                    });
                }
                
                await db.initDb();
                
                // SECURITY: Log admin action before deletion
                await securityLog.logAdminAction(req, 'DELETE_CUSTOMER', { email });
                
                // Get user data
                const userData = await db.getUserData();
                
                if (!userData[email]) {
                    return res.status(404).json({ 
                        success: false,
                        error: 'Customer not found' 
                    });
                }
                
                // Delete user from userData
                delete userData[email];
                await db.saveUserData(userData);
                console.log(`✅ Customer deleted: ${email}`);
                
                // Also delete user's orders (optional - you may want to keep orders for records)
                // For now, we'll keep orders but they won't be associated with the user
                // If you want to delete orders too, uncomment this:
                /*
                const allOrders = await db.getAllOrders();
                const remainingOrders = allOrders.filter(order => order.email !== email);
                await db.saveAllOrders(remainingOrders);
                console.log(`✅ Deleted ${allOrders.length - remainingOrders.length} orders for ${email}`);
                */
                
                // Delete user's activity data
                const activityData = await db.getActivityData() || {};
                let deletedActivityCount = 0;
                Object.keys(activityData).forEach(key => {
                    if (activityData[key].email === email) {
                        delete activityData[key];
                        deletedActivityCount++;
                    }
                });
                if (deletedActivityCount > 0) {
                    await db.saveActivityData(activityData);
                    console.log(`✅ Deleted ${deletedActivityCount} activity records for ${email}`);
                }
                
                res.status(200).json({
                    success: true,
                    message: `Customer ${email} deleted successfully`
                });
            } catch (error) {
                // SECURITY: Don't expose error details to users
                errorHandler.sendSecureError(res, error, 500, 'Failed to delete customer. Please try again.', 'DELETE_CUSTOMER_ERROR');
            }
        } else {
            return res.status(405).json({ error: 'Method not allowed' });
        }
    } else {
        return res.status(400).json({ error: 'Invalid endpoint. Use ?endpoint=activity or ?endpoint=customers' });
    }
    } catch (error) {
        // SECURITY: Don't expose error details to users
        console.error('Admin API Error (outer catch):', error);
        // Ensure we always return JSON, even on error
        if (!res.headersSent) {
            errorHandler.sendSecureError(res, error, 500, 'Failed to process request. Please try again.', 'ADMIN_ERROR');
        }
    }
};

