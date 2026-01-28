/* ========================================
   Sandro Sandri - Admin Orders API
   Handles fetching and updating orders
   ======================================== */

const db = require('../../lib/storage');
const auth = require('../../lib/auth');
const emailService = require('../../lib/email');
const cors = require('../../lib/cors');

module.exports = async (req, res) => {
    // Set secure CORS headers (restricted to allowed origins)
    cors.setCORSHeaders(res, req, ['GET', 'PUT', 'OPTIONS']);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // SECURITY: Require admin authentication
    const adminCheck = auth.requireAdmin(req);
    if (!adminCheck.authorized) {
        return res.status(adminCheck.statusCode).json({
            success: false,
            error: adminCheck.error || 'Unauthorized'
        });
    }

    try {
        await db.initDb();

        if (req.method === 'GET') {
            // Get all orders
            const orders = await db.getOrders();
            
            // Sort by creation date (newest first)
            const sortedOrders = orders.sort((a, b) => {
                const dateA = new Date(a.createdAt || 0);
                const dateB = new Date(b.createdAt || 0);
                return dateB - dateA;
            });

            res.status(200).json({
                success: true,
                orders: sortedOrders,
                total: sortedOrders.length
            });
        } else if (req.method === 'PUT') {
            // Update order (confirmation status, tracking number, order status)
            const { orderId, confirmationStatus, trackingNumber, orderStatus } = req.body;

            if (!orderId) {
                return res.status(400).json({
                    success: false,
                    error: 'Order ID is required'
                });
            }

            const orders = await db.getOrders();
            const orderIndex = orders.findIndex(o => o.id === orderId);

            if (orderIndex === -1) {
                return res.status(404).json({
                    success: false,
                    error: 'Order not found'
                });
            }

            const order = orders[orderIndex];
            const previousTrackingNumber = order.trackingNumber;
            const previousOrderStatus = order.orderStatus || order.status || 'PAID';

            // Update order fields
            if (confirmationStatus !== undefined) {
                order.confirmationStatus = confirmationStatus;
            }
            if (trackingNumber !== undefined) {
                order.trackingNumber = trackingNumber;
            }
            if (orderStatus !== undefined) {
                order.orderStatus = orderStatus;
                // Also update legacy status field for compatibility
                order.status = orderStatus;
            }

            order.updatedAt = new Date().toISOString();
            orders[orderIndex] = order;

            // Save updated orders
            await db.saveAllOrders(orders);

            // If tracking number was added and order status is SHIPPED, send email
            const currentOrderStatus = order.orderStatus || order.status || 'PAID';
            if (trackingNumber && trackingNumber !== previousTrackingNumber && 
                trackingNumber.length > 0 && 
                (currentOrderStatus === 'SHIPPED' || orderStatus === 'SHIPPED')) {
                try {
                    await emailService.sendShippingNotification(order.email, {
                        orderNumber: order.orderNumber || order.id,
                        trackingNumber: trackingNumber,
                        customerName: order.name || 'Valued Customer'
                    });
                    console.log(`📧 Shipping notification email sent to ${order.email} for order ${order.orderNumber || order.id}`);
                } catch (emailError) {
                    console.error('Error sending shipping notification email:', emailError);
                    // Don't fail the update if email fails
                }
            }
            
            // Also check if order status was changed to SHIPPED and tracking number exists
            if (orderStatus === 'SHIPPED' && previousOrderStatus !== 'SHIPPED' && 
                order.trackingNumber && order.trackingNumber.length > 0) {
                try {
                    await emailService.sendShippingNotification(order.email, {
                        orderNumber: order.orderNumber || order.id,
                        trackingNumber: order.trackingNumber,
                        customerName: order.name || 'Valued Customer'
                    });
                    console.log(`📧 Shipping notification email sent to ${order.email} for order ${order.orderNumber || order.id}`);
                } catch (emailError) {
                    console.error('Error sending shipping notification email:', emailError);
                    // Don't fail the update if email fails
                }
            }

            res.status(200).json({
                success: true,
                order: order,
                message: 'Order updated successfully'
            });
        } else {
            return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Error in orders API:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process request',
            message: error.message
        });
    }
};

