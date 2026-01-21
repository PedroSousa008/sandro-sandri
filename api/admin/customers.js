/* ========================================
   Sandro Sandri - Admin API: Get All Customers
   ======================================== */

const db = require('../../lib/storage');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check authentication (basic check - in production, use proper auth)
    // For now, we'll rely on the admin page checking auth on the frontend
    // In production, add proper JWT or session-based authentication here

    try {
        // Initialize database
        await db.initDb();

        // Get all user data
        const userData = await db.getUserData();
        
        // Get all orders
        const allOrders = await db.getOrders();

        // Get payment methods from Stripe for orders that have Stripe session IDs
        const customersWithDetails = [];

        for (const email in userData) {
            const user = userData[email];
            const userOrders = user.orders || [];
            
            // Get payment methods from Stripe for each order
            const ordersWithPaymentMethods = await Promise.all(
                userOrders.map(async (order) => {
                    let paymentMethod = null;
                    
                    if (order.stripeSessionId) {
                        try {
                            // Retrieve the Stripe checkout session
                            const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId, {
                                expand: ['payment_intent.payment_method']
                            });
                            
                            if (session.payment_intent) {
                                const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent, {
                                    expand: ['payment_method']
                                });
                                
                                if (paymentIntent.payment_method) {
                                    const pm = typeof paymentIntent.payment_method === 'string' 
                                        ? await stripe.paymentMethods.retrieve(paymentIntent.payment_method)
                                        : paymentIntent.payment_method;
                                    
                                    paymentMethod = {
                                        type: pm.type, // 'card'
                                        card: pm.card ? {
                                            brand: pm.card.brand, // 'visa', 'mastercard', etc.
                                            last4: pm.card.last4,
                                            exp_month: pm.card.exp_month,
                                            exp_year: pm.card.exp_year
                                        } : null
                                    };
                                }
                            }
                        } catch (error) {
                            console.error(`Error fetching payment method for order ${order.id}:`, error.message);
                            // Continue without payment method if there's an error
                        }
                    }
                    
                    // Ensure order has all required fields
                    return {
                        order_id: order.id || order.order_id,
                        user_id: order.userId || order.user_id || email,
                        order_number: order.orderNumber || order.order_number || order.id,
                        status: order.status || 'UNKNOWN',
                        currency: order.currency || 'eur',
                        subtotal: order.subtotal || 0,
                        shipping_cost: order.shippingCost || order.shipping || 0,
                        tax: order.tax || 0,
                        total: order.total || 0,
                        chaptersPurchased: order.chaptersPurchased || [],
                        sizesPurchased: order.sizesPurchased || [],
                        shippingAddress: order.shippingAddress || null,
                        shippingCountry: order.shippingCountry || null,
                        cart: order.cart || [],
                        createdAt: order.createdAt,
                        stripeSessionId: order.stripeSessionId,
                        paymentMethod: paymentMethod,
                        // Keep original order data
                        ...order
                    };
                })
            );

            // Get profile information
            const profile = user.profile || null;
            
            // Get password from user data (if stored) - Note: passwords are stored client-side in localStorage
            // We'll need to sync this to server or note it's only available client-side
            // For now, we'll try to get it from userData if it was synced
            const password = user.password || null;
            
            // Get last login from auth system (stored in localStorage, but we can check user data)
            const lastLogin = user.lastLogin || user.loggedInAt || null;

            customersWithDetails.push({
                email: email,
                profile: profile,
                password: password, // May be null if not synced
                lastLogin: lastLogin,
                cart: user.cart || [],
                favorites: user.favorites || [],
                orders: ordersWithPaymentMethods,
                activities: user.activities || [], // Include activity log
                totalOrders: userOrders.length,
                totalSpent: userOrders.reduce((sum, order) => sum + (order.total || 0), 0),
                lastOrderDate: userOrders.length > 0 
                    ? userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0].createdAt
                    : null,
                updatedAt: user.updatedAt
            });
        }

        // Sort by last order date (most recent first)
        customersWithDetails.sort((a, b) => {
            if (!a.lastOrderDate) return 1;
            if (!b.lastOrderDate) return -1;
            return new Date(b.lastOrderDate) - new Date(a.lastOrderDate);
        });

        res.status(200).json({
            success: true,
            totalCustomers: customersWithDetails.length,
            customers: customersWithDetails
        });

    } catch (error) {
        console.error('Error fetching customer data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch customer data',
            message: error.message
        });
    }
};

