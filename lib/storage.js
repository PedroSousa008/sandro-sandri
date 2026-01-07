/* ========================================
   Sandro Sandri - Persistent Storage Layer
   ======================================== */

// Using Vercel KV (Redis) for persistent storage across serverless functions
// Falls back to in-memory storage if KV is not configured

let kv = null;
let useKV = false;

// Try to initialize Vercel KV or Upstash Redis
try {
    const { kv: vercelKV } = require('@vercel/kv');
    // Check for various possible environment variable names
    const hasKV = vercelKV && (
        (process.env.KV_REST_API_URL || 
         process.env.UPSTASH_REDIS_REST_URL || 
         process.env.UPSTASH_REDIS_KV_REST_API_URL) &&
        (process.env.KV_REST_API_TOKEN || 
         process.env.UPSTASH_REDIS_REST_TOKEN || 
         process.env.UPSTASH_REDIS_KV_REST_API_TOKEN)
    );
    
    if (hasKV) {
        kv = vercelKV;
        useKV = true;
        console.log('Using Redis/KV for persistent storage');
    }
} catch (error) {
    console.warn('Redis/KV not available, using in-memory storage (data will not persist across invocations)');
}

// Fallback: In-memory storage (only persists within same execution context)
if (!global.sandroSandriStorage) {
    global.sandroSandriStorage = {
        userData: {},
        atlasData: {},
        inventory: null,
        orders: [],
        webhookEvents: {}
    };
}

const memoryStorage = global.sandroSandriStorage;

// Helper functions
function getDefaultInventory() {
    return {
        1: { XS: 10, S: 20, M: 50, L: 50, XL: 20 },
        2: { XS: 10, S: 20, M: 50, L: 50, XL: 20 },
        3: { XS: 10, S: 20, M: 50, L: 50, XL: 20 },
        4: { XS: 10, S: 20, M: 50, L: 50, XL: 20 },
        5: { XS: 10, S: 20, M: 50, L: 50, XL: 20 }
    };
}

// User Data Operations
async function getUserData() {
    if (useKV && kv) {
        try {
            const data = await kv.get('userData');
            return data || {};
        } catch (error) {
            console.error('Error reading userData from KV:', error);
            return memoryStorage.userData || {};
        }
    }
    return memoryStorage.userData || {};
}

async function saveUserData(userData) {
    if (useKV && kv) {
        try {
            await kv.set('userData', userData || {});
            console.log('User data saved to KV. Total users:', Object.keys(userData || {}).length);
        } catch (error) {
            console.error('Error saving userData to KV:', error);
            // Fallback to memory
            memoryStorage.userData = userData || {};
        }
    } else {
        memoryStorage.userData = userData || {};
        console.log('User data saved to memory. Total users:', Object.keys(userData || {}).length);
    }
    return true;
}

// Atlas Data Operations
async function getAtlasData() {
    if (useKV && kv) {
        try {
            const data = await kv.get('atlasData');
            return data || {};
        } catch (error) {
            console.error('Error reading atlasData from KV:', error);
            return memoryStorage.atlasData || {};
        }
    }
    return memoryStorage.atlasData || {};
}

async function saveAtlasData(atlasData) {
    if (useKV && kv) {
        try {
            await kv.set('atlasData', atlasData || {});
            console.log('Atlas data saved to KV. Total users:', Object.keys(atlasData || {}).length);
        } catch (error) {
            console.error('Error saving atlasData to KV:', error);
            memoryStorage.atlasData = atlasData || {};
        }
    } else {
        memoryStorage.atlasData = atlasData || {};
        console.log('Atlas data saved to memory. Total users:', Object.keys(atlasData || {}).length);
    }
    return true;
}

// Inventory Operations
async function getInventory() {
    if (useKV && kv) {
        try {
            const inventory = await kv.get('inventory');
            if (inventory) return inventory;
        } catch (error) {
            console.error('Error reading inventory from KV:', error);
        }
    }
    
    if (!memoryStorage.inventory) {
        memoryStorage.inventory = getDefaultInventory();
        if (useKV && kv) {
            try {
                await kv.set('inventory', memoryStorage.inventory);
            } catch (error) {
                console.error('Error saving default inventory to KV:', error);
            }
        }
    }
    return memoryStorage.inventory;
}

async function saveInventory(inventory) {
    if (useKV && kv) {
        try {
            await kv.set('inventory', inventory);
        } catch (error) {
            console.error('Error saving inventory to KV:', error);
            memoryStorage.inventory = inventory;
        }
    } else {
        memoryStorage.inventory = inventory;
    }
    return true;
}

// Orders Operations
async function getOrders() {
    if (useKV && kv) {
        try {
            const orders = await kv.get('orders');
            if (orders) return orders;
        } catch (error) {
            console.error('Error reading orders from KV:', error);
        }
    }
    return memoryStorage.orders || [];
}

async function saveOrder(order) {
    const orders = await getOrders();
    orders.push(order);
    
    if (useKV && kv) {
        try {
            await kv.set('orders', orders);
        } catch (error) {
            console.error('Error saving orders to KV:', error);
            memoryStorage.orders = orders;
        }
    } else {
        memoryStorage.orders = orders;
    }
    return order;
}

// Webhook Events Operations
async function getProcessedEvents() {
    let events = {};
    if (useKV && kv) {
        try {
            events = await kv.get('webhookEvents') || {};
        } catch (error) {
            console.error('Error reading webhookEvents from KV:', error);
            events = memoryStorage.webhookEvents || {};
        }
    } else {
        events = memoryStorage.webhookEvents || {};
    }
    return new Map(Object.entries(events));
}

async function saveProcessedEvents(eventsMap) {
    const events = Object.fromEntries(eventsMap);
    if (useKV && kv) {
        try {
            await kv.set('webhookEvents', events);
        } catch (error) {
            console.error('Error saving webhookEvents to KV:', error);
            memoryStorage.webhookEvents = events;
        }
    } else {
        memoryStorage.webhookEvents = events;
    }
    return true;
}

// Get products (static)
function getProducts() {
    return [
        { id: 1, name: "Isole Cayman", sku: "SS-001", sizes: ["XS", "S", "M", "L", "XL"] },
        { id: 2, name: "Isola di Necker", sku: "SS-002", sizes: ["XS", "S", "M", "L", "XL"] },
        { id: 3, name: "Monroe's Kisses", sku: "SS-003", sizes: ["XS", "S", "M", "L", "XL"] },
        { id: 4, name: "Sardinia", sku: "SS-004", sizes: ["XS", "S", "M", "L", "XL"] },
        { id: 5, name: "Port-Coton", sku: "SS-005", sizes: ["XS", "S", "M", "L", "XL"] }
    ];
}

// Initialize
async function initDb() {
    // Ensure inventory is initialized
    await getInventory();
    return true;
}

module.exports = {
    initDb,
    getUserData,
    saveUserData,
    getAtlasData,
    saveAtlasData,
    getInventory,
    saveInventory,
    getOrders,
    saveOrder,
    getProcessedEvents,
    saveProcessedEvents,
    getProducts
};
