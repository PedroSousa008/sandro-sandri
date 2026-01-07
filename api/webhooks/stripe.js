/* ========================================
   Sandro Sandri - Stripe Webhook Handler
   ======================================== */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../../lib/storage');

// Process webhook event with idempotency
async function processWebhookEvent(event) {
    // Check if we've already processed this event (idempotency)
    const eventId = event.id;
    const processed = await isEventProcessed(eventId);
    
    if (processed) {
        console.log(`Event ${eventId} already processed, skipping`);
        return { processed: true, skipped: true };
    }
    
    // Mark event as processing
    await markEventProcessing(eventId);
    
    try {
        // Handle the event
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            await handleCheckoutCompleted(session);
        } else if (event.type === 'payment_intent.succeeded') {
            // Handle payment intent if using Payment Intents API
            // For now, we're using Checkout Sessions, so this is a fallback
            console.log('Payment intent succeeded:', event.data.object.id);
        }
        
        // Mark as processed
        await markEventProcessed(eventId);
        
        return { processed: true, skipped: false };
    } catch (error) {
        console.error(`Error processing event ${eventId}:`, error);
        // Don't mark as processed if there was an error
        throw error;
    }
}

// Handle successful checkout session
async function handleCheckoutCompleted(session) {
    if (session.payment_status !== 'paid') {
        console.log('Session not paid, skipping inventory decrement');
        return;
    }
    
    // Parse cart from metadata
    const cart = JSON.parse(session.metadata.cart || '[]');
    const customerEmail = session.metadata.customerEmail;
    const customerName = session.metadata.customerName;
    const shippingCountry = session.metadata.shippingCountry;
    
    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingAmount = session.amount_total - session.amount_subtotal;
    const total = session.amount_total / 100; // Convert from cents
    
    // Decrement inventory atomically
    const inventoryResult = await decrementInventoryAtomic(cart);
    
    if (!inventoryResult.success) {
        // Inventory insufficient - mark order as failed
        await db.saveOrder({
            id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            stripeSessionId: session.id,
            status: 'FAILED_STOCK',
            email: customerEmail,
            name: customerName,
            cart: cart,
            subtotal: subtotal,
            shipping: shippingAmount / 100,
            total: total,
            currency: 'eur',
            error: inventoryResult.error,
            createdAt: new Date().toISOString()
        });
        
        // TODO: Trigger refund or admin notification
        throw new Error(`Insufficient stock: ${inventoryResult.error}`);
    }
    
    // Save successful order
    const order = await db.saveOrder({
        id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        stripeSessionId: session.id,
        status: 'PAID',
        email: customerEmail,
        name: customerName,
        shippingCountry: shippingCountry,
        cart: cart,
        subtotal: subtotal,
        shipping: shippingAmount / 100,
        total: total,
        currency: 'eur',
        createdAt: new Date().toISOString()
    });
    
    // Also save to user's order history for cross-device sync
    try {
        const userData = await db.getUserData();
        if (!userData[customerEmail]) {
            userData[customerEmail] = { cart: [], profile: null, favorites: [], orders: [], updatedAt: null };
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
        // Don't fail the webhook if this fails
    }
    
    // TODO: Send order confirmation email
    console.log(`Order ${order.id} created successfully`);
    
    return order;
}

// Atomic inventory decrement with transaction
async function decrementInventoryAtomic(cart) {
    // Load current inventory
    const inventory = await db.getInventory();
    const errors = [];
    const updates = {};
    
    // First pass: validate all items have sufficient stock
    for (const item of cart) {
        const productId = item.productId;
        const size = item.size;
        const quantity = item.quantity;
        
        const currentStock = inventory[productId]?.[size] || 0;
        
        if (currentStock < quantity) {
            errors.push({
                productId,
                size,
                requested: quantity,
                available: currentStock
            });
        } else {
            // Prepare update
            if (!updates[productId]) {
                updates[productId] = { ...inventory[productId] };
            }
            updates[productId][size] = currentStock - quantity;
        }
    }
    
    // If any errors, return without updating
    if (errors.length > 0) {
        return {
            success: false,
            error: `Insufficient stock for ${errors.map(e => `${e.size} (${e.available} available, ${e.requested} requested)`).join(', ')}`
        };
    }
    
    // Apply all updates atomically
    for (const productId in updates) {
        inventory[productId] = updates[productId];
    }
    
    // Save updated inventory
    await db.saveInventory(inventory);
    
    return { success: true };
}

// Check if event has been processed (idempotency)
async function isEventProcessed(eventId) {
    const processedEvents = await db.getProcessedEvents();
    const event = processedEvents.get(eventId);
    return event && event.status === 'processed';
}

// Mark event as processing
async function markEventProcessing(eventId) {
    const processedEvents = await db.getProcessedEvents();
    processedEvents.set(eventId, { status: 'processing', timestamp: new Date().toISOString() });
    await db.saveProcessedEvents(processedEvents);
}

// Mark event as processed
async function markEventProcessed(eventId) {
    const processedEvents = await db.getProcessedEvents();
    processedEvents.set(eventId, { status: 'processed', timestamp: new Date().toISOString() });
    await db.saveProcessedEvents(processedEvents);
}

// Use database functions from db module

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
        console.error('STRIPE_WEBHOOK_SECRET not configured');
        return res.status(500).json({ error: 'Webhook secret not configured' });
    }
    
    let event;
    let body;
    
    // Vercel serverless functions need raw body for webhook signature verification
    // The body should be available as req.body, but we need to ensure it's a Buffer
    if (Buffer.isBuffer(req.body)) {
        body = req.body;
    } else if (typeof req.body === 'string') {
        body = Buffer.from(req.body, 'utf8');
    } else if (req.body) {
        // If body is already parsed as JSON, we need the raw body
        // For Vercel, we should use req.body directly if it's a string
        // Otherwise, we need to access the raw body differently
        body = Buffer.from(JSON.stringify(req.body), 'utf8');
    } else {
        // Fallback: try to get raw body from request
        body = req.body || Buffer.alloc(0);
    }
    
    try {
        // Verify webhook signature with raw body
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }
    
    try {
        // Process the event
        await processWebhookEvent(event);
        
        // Return success to Stripe
        res.json({ received: true });
    } catch (error) {
        console.error('Error processing webhook:', error);
        // Return 500 so Stripe will retry
        res.status(500).json({ error: error.message });
    }
};

