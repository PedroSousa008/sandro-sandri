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
    
    // Get shipping address from Stripe session
    let shippingAddress = null;
    let phoneNumber = null;
    if (session.shipping_details && session.shipping_details.address) {
        shippingAddress = {
            street: session.shipping_details.address.line1 || '',
            apartment: session.shipping_details.address.line2 || '',
            city: session.shipping_details.address.city || '',
            postalCode: session.shipping_details.address.postal_code || '',
            country: session.shipping_details.address.country || shippingCountry || '',
            countryName: session.shipping_details.address.country || shippingCountry || ''
        };
    }
    
    // Get phone number from customer details or metadata
    if (session.customer_details && session.customer_details.phone) {
        phoneNumber = session.customer_details.phone;
    } else if (session.metadata && session.metadata.phone) {
        phoneNumber = session.metadata.phone;
    }
    
    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingAmount = session.amount_total - session.amount_subtotal;
    const tax = 0; // No tax currently
    const total = session.amount_total / 100; // Convert from cents
    
    // Generate order number (format: SS-YYYYMMDD-XXXXX)
    const orderNumber = `SS-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    // Determine chapters purchased from product IDs
    const chaptersPurchased = new Set();
    cart.forEach(item => {
        if (item.productId >= 1 && item.productId <= 5) {
            chaptersPurchased.add('Chapter I');
        } else if (item.productId >= 6) {
            chaptersPurchased.add('Chapter II');
        }
    });
    
    // Get all sizes purchased
    const sizesPurchased = new Set();
    cart.forEach(item => {
        if (item.size) {
            sizesPurchased.add(item.size);
        }
    });
    
    // IMPORTANT: Only decrement inventory AFTER payment is confirmed
    // Use new chapter-based inventory system
    console.log('💰 Payment confirmed, decrementing inventory for:', cart.length, 'items');
    
    // Prepare order object for inventory decrement
    const orderForInventory = {
        items: cart.map(item => ({
            product_id: item.productId,
            productId: item.productId,
            size: item.size,
            quantity: item.quantity,
            chapter: item.chapter || (item.productId >= 6 ? 'chapter-2' : 'chapter-1'),
            chapter_id: item.chapter_id || (item.productId >= 6 ? 'chapter-2' : 'chapter-1')
        }))
    };
    
    // Decrement inventory using new chapter-based system
    try {
        await db.decrementInventoryOnPaidOrder(orderForInventory);
        console.log('✅ Inventory decremented successfully using chapter-based system');
    } catch (inventoryError) {
        console.error('❌ Error decrementing inventory:', inventoryError);
        // Don't fail the order if inventory decrement fails - log it for manual review
        // Inventory should have been validated at checkout, so this is unexpected
    }
    
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userId = customerEmail; // Using email as user ID
    
    // Save successful order
    const order = await db.saveOrder({
        id: orderId,
        userId: userId,
        orderNumber: orderNumber,
        stripeSessionId: session.id,
        status: 'PAID',
        orderStatus: 'PAID', // New field for order status tracking
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
        confirmationStatus: 'Nothing', // Default: Nothing -> Packed -> Sent -> Delivered
        trackingNumber: '', // Will be added by admin
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
// IMPORTANT: This is the ONLY place where inventory quantities are decremented
// All products start with full stock, and quantities are only reduced here after payment
async function decrementInventoryAtomic(cart, commerceMode = 'LIVE') {
    // Load current inventory (starts with full stock for all products)
    const inventory = await db.getInventory();
    const errors = [];
    const updates = {};
    
    console.log('📦 Current inventory before decrement:', JSON.stringify(inventory, null, 2));
    console.log('📦 Commerce mode:', commerceMode);
    
    // First pass: validate all items have sufficient stock
    for (const item of cart) {
        const productId = item.productId;
        const size = item.size;
        const quantity = item.quantity;
        
        // Get stock based on commerce mode
        let currentStock = 0;
        const productInventory = inventory[productId];
        
        if (!productInventory) {
            currentStock = 0;
        } else if (commerceMode === 'EARLY_ACCESS') {
            // Use early_access_stock
            if (productInventory.early_access_stock) {
                currentStock = productInventory.early_access_stock[size] || 0;
            } else if (productInventory[size]) {
                // Legacy format
                currentStock = productInventory[size] || 0;
            }
        } else {
            // LIVE mode - use live_stock
            if (productInventory.live_stock) {
                currentStock = productInventory.live_stock[size] || 0;
            } else if (productInventory[size]) {
                // Legacy format
                currentStock = productInventory[size] || 0;
            }
        }
        
        console.log(`   Checking: Product ${productId}, Size ${size} - Requested: ${quantity}, Available: ${currentStock} (Mode: ${commerceMode})`);
        
        if (currentStock < quantity) {
            errors.push({
                productId,
                size,
                requested: quantity,
                available: currentStock
            });
        } else {
            // Prepare update - decrement quantity in the correct stock
            if (!updates[productId]) {
                updates[productId] = { ...productInventory };
                // Ensure structure exists
                if (commerceMode === 'EARLY_ACCESS') {
                    if (!updates[productId].early_access_stock) {
                        updates[productId].early_access_stock = { ...(productInventory.early_access_stock || {}) };
                    }
                } else {
                    if (!updates[productId].live_stock) {
                        updates[productId].live_stock = { ...(productInventory.live_stock || {}) };
                    }
                }
            }
            
            if (commerceMode === 'EARLY_ACCESS') {
                if (!updates[productId].early_access_stock) {
                    updates[productId].early_access_stock = {};
                }
                updates[productId].early_access_stock[size] = currentStock - quantity;
                console.log(`   ✅ Will decrement early_access: ${currentStock} - ${quantity} = ${updates[productId].early_access_stock[size]}`);
            } else {
                if (!updates[productId].live_stock) {
                    updates[productId].live_stock = {};
                }
                updates[productId].live_stock[size] = currentStock - quantity;
                console.log(`   ✅ Will decrement live: ${currentStock} - ${quantity} = ${updates[productId].live_stock[size]}`);
            }
        }
    }
    
    // If any errors, return without updating
    if (errors.length > 0) {
        console.error('❌ Insufficient stock:', errors);
        return {
            success: false,
            error: `Insufficient stock for ${errors.map(e => `${e.size} (${e.available} available, ${e.requested} requested)`).join(', ')}`
        };
    }
    
    // Apply all updates atomically
    for (const productId in updates) {
        inventory[productId] = updates[productId];
    }
    
    // Save updated inventory (quantities now reduced)
    await db.saveInventory(inventory);
    console.log('✅ Inventory updated after payment:', JSON.stringify(inventory, null, 2));
    
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

