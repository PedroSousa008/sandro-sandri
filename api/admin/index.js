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
    // Set secure CORS headers (restricted to allowed origins)
    cors.setCORSHeaders(res, req, ['GET', 'POST', 'DELETE', 'OPTIONS']);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { endpoint } = req.query;
    
    // SETUP OWNER (POST with endpoint=setup-owner)
    if (endpoint === 'setup-owner') {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        try {
            const { password } = req.body;
            const OWNER_EMAIL = 'sandrosandri.bysousa@gmail.com';

            if (!password) {
                return res.status(400).json({ 
                    error: 'Password is required' 
                });
            }

            if (password.length < 6) {
                return res.status(400).json({ 
                    error: 'Password must be at least 6 characters' 
                });
            }

            await db.initDb();
            const userData = await db.getUserData();
            const bcrypt = require('bcryptjs');
            const passwordHash = await bcrypt.hash(password, 10);

            const ownerUser = userData[OWNER_EMAIL] || {
                email: OWNER_EMAIL,
                cart: [],
                profile: null,
                favorites: [],
                orders: [],
                createdAt: new Date().toISOString()
            };

            ownerUser.passwordHash = passwordHash;
            ownerUser.updatedAt = new Date().toISOString();

            userData[OWNER_EMAIL] = ownerUser;
            await db.saveUserData(userData);

            res.status(200).json({
                success: true,
                message: 'Owner password set successfully. You can now login.',
                email: OWNER_EMAIL
            });
            return;
        } catch (error) {
            errorHandler.sendSecureError(res, error, 500, 'Failed to set owner password. Please try again.', 'SETUP_OWNER_ERROR');
            return;
        }
    }
    
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
            // IMPORTANT: This endpoint should NOT be used for activity tracking
            // All activity should go to /api/user?action=activity (public endpoint)
            // This endpoint is kept for backward compatibility but redirects to user endpoint logic
            try {
                // Redirect to user endpoint logic (same code)
                const { sessionId, email, page, pageName, isCheckout, userAgent, cart, chapters } = req.body;

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

                // Determine chapters from cart if provided
                let chaptersInCart = [];
                if (chapters && Array.isArray(chapters)) {
                    chaptersInCart = chapters;
                } else if (cart && Array.isArray(cart)) {
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
                    chaptersInCart = Array.from(chapterSet);
                }

                activityData[sessionId] = {
                    sessionId: sessionId,
                    email: email || null,
                    page: currentPage,
                    isCheckout: onCheckoutPage,
                    userAgent: userAgent || 'unknown',
                    chapters: chaptersInCart,
                    lastActivity: new Date().toISOString(),
                    createdAt: activityData[sessionId]?.createdAt || new Date().toISOString()
                };

                // Cleanup old sessions
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

                return res.status(200).json({
                    success: true,
                    message: 'Activity recorded'
                });
            } catch (error) {
                // Log error but return success to prevent client retries
                console.error('Error in admin activity endpoint:', error);
                // Return success to prevent client-side error loops
                return res.status(200).json({
                    success: true,
                    message: 'Activity recorded (error handled)'
                });
            }
        } else if (req.method === 'GET') {
            // Get active users
            try {
                await db.initDb();

                const activityData = await db.getActivityData() || {};
                const now = new Date();
                const INACTIVE_THRESHOLD = 3 * 60 * 1000; // 3 minutes of inactivity

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

                // Group checkout users by chapter
                const checkoutUsersByChapter = {
                    'chapter-1': 0,
                    'chapter-2': 0,
                    'both': 0,
                    'unknown': 0
                };

                activeSessions.forEach(session => {
                    if (session.isCheckout === true && session.email !== 'sandrosandri.bysousa@gmail.com') {
                        const chapters = session.chapters || [];
                        if (chapters.length === 0) {
                            checkoutUsersByChapter.unknown++;
                        } else if (chapters.includes('chapter-1') && chapters.includes('chapter-2')) {
                            checkoutUsersByChapter.both++;
                        } else if (chapters.includes('chapter-1')) {
                            checkoutUsersByChapter['chapter-1']++;
                        } else if (chapters.includes('chapter-2')) {
                            checkoutUsersByChapter['chapter-2']++;
                        } else {
                            checkoutUsersByChapter.unknown++;
                        }
                    }
                });

                res.status(200).json({
                    success: true,
                    onlineUsers: onlineUsers,
                    checkoutUsers: checkoutUsers,
                    checkoutUsersByChapter: checkoutUsersByChapter,
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
    } else if (endpoint === 'init-inventory') {
        // Initialize chapter inventory endpoint (owner only)
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const adminCheck = auth.requireAdmin(req);
        if (!adminCheck.authorized) {
            await securityLog.logUnauthorizedAccess(req, `/api/admin?endpoint=init-inventory`, adminCheck.error);
            return res.status(adminCheck.statusCode).json({
                success: false,
                error: adminCheck.error || 'Unauthorized. Only the owner can initialize inventory.'
            });
        }

        try {
            await db.initDb();

            const { chapterId, force } = req.body;

            if (!chapterId) {
                return res.status(400).json({
                    success: false,
                    error: 'chapterId is required'
                });
            }

            // Validate chapter ID
            if (!/^chapter-(10|[1-9])$/.test(chapterId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid chapterId format'
                });
            }

            // Helper: Get models for a chapter
            function getModelsForChapter(chapterId) {
                const chapterModels = {
                    'chapter-2': [
                        { id: 6, name: 'Maldives', sku: 'SS-006' },
                        { id: 7, name: 'Palma Mallorca', sku: 'SS-007' },
                        { id: 8, name: 'Lago di Como', sku: 'SS-008' },
                        { id: 9, name: 'Gisele', sku: 'SS-009' },
                        { id: 10, name: 'Pourville', sku: 'SS-010' }
                    ],
                    'chapter-1': [
                        { id: 1, name: 'Isole Cayman', sku: 'SS-001' },
                        { id: 2, name: 'Isola di Necker', sku: 'SS-002' },
                        { id: 3, name: "Monroe's Kisses", sku: 'SS-003' },
                        { id: 4, name: 'La Dolce Vita', sku: 'SS-004' },
                        { id: 5, name: 'Port-Coton', sku: 'SS-005' }
                    ]
                };
                return chapterModels[chapterId] || [];
            }

            const models = getModelsForChapter(chapterId);
            if (!models || models.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: `No models found for ${chapterId}`
                });
            }

            // Check if already initialized
            const existing = await db.getChapterInventory(chapterId);
            if (existing && existing.initialized && !force) {
                return res.status(200).json({
                    success: true,
                    message: `Inventory for ${chapterId} already initialized. Use force=true to reinitialize.`,
                    inventory: existing
                });
            }

            // Initialize inventory (will overwrite if force=true)
            let inventory = await db.initChapterInventoryIfNeeded(chapterId, models);
            
            // If force=true, we need to reset it
            if (force && existing) {
                // Reinitialize with full stock
                const sizeDistribution = {
                    XS: 10,
                    S: 20,
                    M: 50,
                    L: 50,
                    XL: 20
                };
                
                const newInventory = {
                    initialized: true,
                    initializedAt: new Date().toISOString(),
                    models: {}
                };
                
                models.forEach(model => {
                    newInventory.models[model.id.toString()] = {
                        name: model.name,
                        sku: model.sku,
                        stock: { ...sizeDistribution }
                    };
                });
                
                await db.saveChapterInventory(chapterId, newInventory);
                inventory = newInventory;
                
                // Log admin action
                req.user = adminCheck.user;
                await securityLog.logAdminAction(req, 'INIT_INVENTORY', {
                    chapterId,
                    force: true,
                    models: models.length
                });

                return res.status(200).json({
                    success: true,
                    message: `Inventory for ${chapterId} reinitialized with full stock`,
                    inventory: newInventory
                });
            }

            // Log admin action
            req.user = adminCheck.user;
            await securityLog.logAdminAction(req, 'INIT_INVENTORY', {
                chapterId,
                models: models.length
            });

            return res.status(200).json({
                success: true,
                message: `Inventory for ${chapterId} initialized successfully`,
                inventory: inventory
            });
        } catch (error) {
            errorHandler.sendSecureError(res, error, 500, 'Failed to initialize inventory. Please try again.', 'INIT_INVENTORY_ERROR');
            return;
        }
    } else {
        return res.status(400).json({ error: 'Invalid endpoint. Use ?endpoint=activity, ?endpoint=customers, or ?endpoint=init-inventory' });
    }
};

