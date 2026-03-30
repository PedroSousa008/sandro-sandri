/* ========================================
   Paid checkout fulfillment (shared)
   Used by Stripe webhook and success-page fallback so orders + inventory
   persist even when webhooks are delayed or misconfigured.
   Idempotent per stripeSessionId (no double orders / double stock).
   ======================================== */

const db = require('./storage');
const emailService = require('./email');
const auth = require('./auth');

/**
 * @param {object} session Stripe Checkout Session (from webhook or sessions.retrieve)
 * @returns {Promise<object|null>} Saved order, existing order if already fulfilled, or null if not paid
 */
async function fulfillCheckoutSession(session) {
    const isFulfillable =
        session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
    if (!isFulfillable) {
        console.log(
            'Session not paid/unpaid (status: ' + session.payment_status + '), skipping inventory and order'
        );
        return null;
    }

    await db.initDb();

    const orders = await db.getOrders();
    const existing = orders.find((o) => o.stripeSessionId === session.id);
    if (existing) {
        console.log('Checkout session already fulfilled (idempotent skip):', session.id);
        return existing;
    }

    let cart;
    try {
        cart = JSON.parse(session.metadata.cart || '[]');
    } catch (e) {
        console.error('Invalid cart JSON in session metadata:', e && e.message);
        throw new Error('Invalid session metadata');
    }
    if (!Array.isArray(cart) || cart.length === 0) {
        console.error('Session metadata cart is empty or invalid:', session.id);
        throw new Error('Missing cart in session metadata');
    }

    const customerEmail = session.metadata.customerEmail;
    const customerName = session.metadata.customerName;
    const shippingCountry = session.metadata.shippingCountry;

    const meta = session.metadata || {};
    let shippingAddress = null;
    if (session.shipping_details && session.shipping_details.address) {
        const a = session.shipping_details.address;
        shippingAddress = {
            street: (a.line1 || '').trim(),
            apartment: (a.line2 || '').trim(),
            city: (a.city || '').trim(),
            postalCode: (a.postal_code || '').trim(),
            country: (a.country || shippingCountry || '').trim(),
            countryName: (a.country || shippingCountry || '').trim()
        };
    }
    if (!shippingAddress) {
        shippingAddress = {
            street: (meta.address || '').trim(),
            apartment: '',
            city: (meta.city || '').trim(),
            postalCode: (meta.postalCode || '').trim(),
            country: (meta.shippingCountry || shippingCountry || '').trim(),
            countryName: (meta.shippingCountry || shippingCountry || '').trim()
        };
    }

    let phoneNumber =
        (session.customer_details && session.customer_details.phone) || meta.phone || null;
    if (phoneNumber) phoneNumber = String(phoneNumber).trim();

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingAmount = session.amount_total - session.amount_subtotal;
    const tax = 0;
    const total = session.amount_total / 100;

    const orderNumber = `SS-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.random()
        .toString(36)
        .substr(2, 5)
        .toUpperCase()}`;

    const chaptersPurchased = new Set();
    cart.forEach((item) => {
        if (item.productId >= 1 && item.productId <= 5) {
            chaptersPurchased.add('Chapter I');
        } else if (item.productId >= 6) {
            chaptersPurchased.add('Chapter II');
        }
    });

    const sizesPurchased = new Set();
    cart.forEach((item) => {
        if (item.size) {
            sizesPurchased.add(item.size);
        }
    });

    console.log('💰 Payment confirmed, decrementing inventory for:', cart.length, 'items');

    const orderForInventory = {
        items: cart.map((item) => ({
            product_id: item.productId,
            productId: item.productId,
            size: item.size,
            quantity: item.quantity,
            chapter: item.chapter || (item.productId >= 6 ? 'chapter-2' : 'chapter-1'),
            chapter_id: item.chapter_id || (item.productId >= 6 ? 'chapter-2' : 'chapter-1')
        }))
    };

    try {
        await db.decrementInventoryOnPaidOrder(orderForInventory);
        console.log('✅ Inventory decremented successfully using chapter-based system');
    } catch (inventoryError) {
        console.error('❌ Error decrementing inventory:', inventoryError);
    }

    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userId = customerEmail;

    const order = await db.saveOrder({
        id: orderId,
        userId: userId,
        orderNumber: orderNumber,
        stripeSessionId: session.id,
        status: 'PAID',
        orderStatus: 'PAID',
        email: customerEmail,
        name: customerName,
        phoneNumber: phoneNumber || '',
        shippingAddress: shippingAddress,
        shippingCountry: shippingCountry,
        cart: cart,
        subtotal: subtotal,
        shippingCost: shippingAmount / 100,
        tax: tax,
        total: total,
        currency: 'eur',
        chaptersPurchased: Array.from(chaptersPurchased),
        sizesPurchased: Array.from(sizesPurchased),
        confirmationStatus: 'Nothing',
        trackingNumber: '',
        createdAt: new Date().toISOString()
    });

    try {
        const userData = await db.getUserData();
        if (!userData[customerEmail]) {
            userData[customerEmail] = {
                cart: [],
                profile: null,
                favorites: [],
                orders: [],
                updatedAt: null
            };
        }
        if (!userData[customerEmail].orders) {
            userData[customerEmail].orders = [];
        }
        userData[customerEmail].orders.push(order);
        userData[customerEmail].updatedAt = new Date().toISOString();
        await db.saveUserData(userData);
        console.log(`Order ${order.id} added to user's order history for sync`);
    } catch (error) {
        console.error('Error saving order to user data:', error);
    }

    try {
        const customerEmailResult = await emailService.sendOrderConfirmedToCustomer(
            customerEmail,
            order
        );
        if (customerEmailResult && customerEmailResult.success) {
            console.log('Order confirmed email sent to customer');
        } else {
            console.warn(
                'Order confirmed email not sent to customer:',
                (customerEmailResult && customerEmailResult.error) || 'unknown'
            );
        }
    } catch (customerEmailErr) {
        console.error(
            'Error sending order confirmed email to customer:',
            customerEmailErr && customerEmailErr.message
        );
    }

    try {
        const ownerEmail = auth.OWNER_EMAIL;
        if (ownerEmail) {
            const emailResult = await emailService.sendOrderConfirmationToOwner(ownerEmail, order);
            if (emailResult && emailResult.success) {
                console.log('Order confirmation email sent to owner');
            } else {
                console.warn('Order confirmation email not sent:', (emailResult && emailResult.error) || 'unknown');
            }
        }
    } catch (emailErr) {
        console.error('Error sending order confirmation email to owner:', emailErr && emailErr.message);
    }

    console.log(`Order ${order.id} created successfully`);
    return order;
}

module.exports = {
    fulfillCheckoutSession
};
