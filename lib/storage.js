/* ========================================
   Sandro Sandri - Persistent Storage Layer
   ======================================== */

// Using Vercel KV (Redis) for persistent storage across serverless functions
// Falls back to in-memory storage if KV is not configured

let kv = null;
let useKV = false;

// Try to initialize Vercel KV or Upstash Redis
try {
    // Map Upstash variables to KV variables BEFORE requiring @vercel/kv
    // @vercel/kv package expects KV_REST_API_URL and KV_REST_API_TOKEN
    if (!process.env.KV_REST_API_URL && process.env.UPSTASH_REDIS_KV_REST_API_URL) {
        process.env.KV_REST_API_URL = process.env.UPSTASH_REDIS_KV_REST_API_URL;
        console.log('📝 Mapped UPSTASH_REDIS_KV_REST_API_URL to KV_REST_API_URL');
    }
    if (!process.env.KV_REST_API_TOKEN && process.env.UPSTASH_REDIS_KV_REST_API_TOKEN) {
        process.env.KV_REST_API_TOKEN = process.env.UPSTASH_REDIS_KV_REST_API_TOKEN;
        console.log('📝 Mapped UPSTASH_REDIS_KV_REST_API_TOKEN to KV_REST_API_TOKEN');
    }
    
    // Also check for other Upstash variable names
    if (!process.env.KV_REST_API_URL && process.env.UPSTASH_REDIS_REST_API_URL) {
        process.env.KV_REST_API_URL = process.env.UPSTASH_REDIS_REST_API_URL;
        console.log('📝 Mapped UPSTASH_REDIS_REST_API_URL to KV_REST_API_URL');
    }
    if (!process.env.KV_REST_API_TOKEN && process.env.UPSTASH_REDIS_REST_API_TOKEN) {
        process.env.KV_REST_API_TOKEN = process.env.UPSTASH_REDIS_REST_API_TOKEN;
        console.log('📝 Mapped UPSTASH_REDIS_REST_API_TOKEN to KV_REST_API_TOKEN');
    }
    
    const { kv: vercelKV } = require('@vercel/kv');
    
    // Check if we have the required variables
    const hasURL = !!process.env.KV_REST_API_URL;
    const hasToken = !!process.env.KV_REST_API_TOKEN;
    
    console.log('🔍 KV Configuration Check:');
    console.log('   KV module loaded:', !!vercelKV);
    console.log('   Has URL:', hasURL);
    console.log('   Has Token:', hasToken);
    console.log('   KV_REST_API_URL:', process.env.KV_REST_API_URL ? 'SET (' + process.env.KV_REST_API_URL.substring(0, 30) + '...)' : 'NOT SET');
    console.log('   KV_REST_API_TOKEN:', process.env.KV_REST_API_TOKEN ? 'SET (' + process.env.KV_REST_API_TOKEN.substring(0, 10) + '...)' : 'NOT SET');
    console.log('   UPSTASH_REDIS_KV_REST_API_URL:', process.env.UPSTASH_REDIS_KV_REST_API_URL ? 'SET' : 'NOT SET');
    console.log('   UPSTASH_REDIS_KV_REST_API_TOKEN:', process.env.UPSTASH_REDIS_KV_REST_API_TOKEN ? 'SET' : 'NOT SET');
    
    if (vercelKV && hasURL && hasToken) {
        // Initialize KV with the URL and token
        kv = vercelKV;
        useKV = true;
        console.log('✅ Using Redis/KV for persistent storage');
        console.log('   KV instance created successfully');
    } else {
        console.warn('⚠️ KV not configured - missing URL or Token');
        console.warn('   KV_REST_API_URL:', hasURL ? 'OK' : 'MISSING');
        console.warn('   KV_REST_API_TOKEN:', hasToken ? 'OK' : 'MISSING');
        console.warn('⚠️ Data will NOT persist across function invocations!');
    }
} catch (error) {
    console.error('❌ Error loading KV module:', error.message);
    console.error('   Error stack:', error.stack);
    console.warn('⚠️ Redis/KV not available, using in-memory storage (data will NOT persist)');
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

// Favorites Operations (per user)
async function getUserFavorites(email) {
    const userData = await getUserData();
    return userData[email]?.favorites || [];
}

async function saveUserFavorites(email, favorites) {
    const userData = await getUserData();
    if (!userData[email]) {
        userData[email] = { cart: [], profile: null, favorites: [], orders: [], updatedAt: null };
    }
    userData[email].favorites = favorites || [];
    userData[email].updatedAt = new Date().toISOString();
    return await saveUserData(userData);
}

// Orders Operations (per user)
async function getUserOrders(email) {
    const userData = await getUserData();
    return userData[email]?.orders || [];
}

async function saveUserOrder(email, order) {
    const userData = await getUserData();
    if (!userData[email]) {
        userData[email] = { cart: [], profile: null, favorites: [], orders: [], updatedAt: null };
    }
    if (!userData[email].orders) {
        userData[email].orders = [];
    }
    userData[email].orders.push(order);
    userData[email].updatedAt = new Date().toISOString();
    return await saveUserData(userData);
}

async function saveUserOrders(email, orders) {
    const userData = await getUserData();
    if (!userData[email]) {
        userData[email] = { cart: [], profile: null, favorites: [], orders: [], updatedAt: null };
    }
    userData[email].orders = orders || [];
    userData[email].updatedAt = new Date().toISOString();
    return await saveUserData(userData);
}

// Atlas Data Operations
async function getAtlasData() {
    console.log('📖 getAtlasData called');
    console.log('   useKV:', useKV);
    console.log('   kv available:', !!kv);
    
    if (useKV && kv) {
        try {
            console.log('   Reading from KV...');
            const data = await kv.get('atlasData');
            const userCount = Object.keys(data || {}).length;
            console.log('   ✅ Loaded from KV:', userCount, 'users');
            return data || {};
        } catch (error) {
            console.error('❌ Error reading atlasData from KV:', error);
            console.error('   Error details:', error.message);
            console.warn('   Fallback: Using memory storage');
            return memoryStorage.atlasData || {};
        }
    }
    console.warn('⚠️ Reading from MEMORY (KV not configured)');
    return memoryStorage.atlasData || {};
}

async function saveAtlasData(atlasData) {
    console.log('💾 saveAtlasData called');
    console.log('   useKV:', useKV);
    console.log('   kv available:', !!kv);
    console.log('   Total users to save:', Object.keys(atlasData || {}).length);
    
    if (useKV && kv) {
        try {
            console.log('   Attempting to save to KV...');
            await kv.set('atlasData', atlasData || {});
            console.log('✅ Atlas data saved to KV successfully');
            
            // Verify immediately
            const verify = await kv.get('atlasData');
            console.log('   Verification: KV contains', Object.keys(verify || {}).length, 'users');
        } catch (error) {
            console.error('❌ Error saving atlasData to KV:', error);
            console.error('   Error details:', error.message);
            memoryStorage.atlasData = atlasData || {};
            console.warn('   Fallback: Saved to memory (will be lost on restart)');
        }
    } else {
        memoryStorage.atlasData = atlasData || {};
        console.warn('⚠️ Atlas data saved to MEMORY only (will NOT persist across invocations)');
        console.warn('⚠️ You need to configure KV/Redis for persistence!');
    }
    return true;
}

// Inventory Operations
async function getInventory() {
    // IMPORTANT: All t-shirts start with full stock
    // Inventory is only decremented AFTER payment is completed (via webhook)
    
    if (useKV && kv) {
        try {
            const inventory = await kv.get('inventory');
            if (inventory) {
                console.log('📦 Inventory loaded from KV');
                return inventory;
            }
            // If no inventory in KV, initialize with full stock
            console.log('📦 No inventory in KV, initializing with full stock');
            const defaultInventory = getDefaultInventory();
            await kv.set('inventory', defaultInventory);
            console.log('✅ Default inventory saved to KV (all products in stock)');
            return defaultInventory;
        } catch (error) {
            console.error('Error reading inventory from KV:', error);
        }
    }
    
    // Fallback to memory storage with full stock
    if (!memoryStorage.inventory) {
        memoryStorage.inventory = getDefaultInventory();
        console.log('📦 Inventory initialized in memory with full stock');
        if (useKV && kv) {
            try {
                await kv.set('inventory', memoryStorage.inventory);
                console.log('✅ Default inventory saved to KV');
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

// Activity Data Operations
async function getActivityData() {
    if (useKV && kv) {
        try {
            const data = await kv.get('activityData');
            return data || {};
        } catch (error) {
            console.error('Error reading activityData from KV:', error);
            return memoryStorage.activityData || {};
        }
    }
    return memoryStorage.activityData || {};
}

async function saveActivityData(activityData) {
    if (useKV && kv) {
        try {
            await kv.set('activityData', activityData || {});
            console.log('Activity data saved to KV. Active sessions:', Object.keys(activityData || {}).length);
        } catch (error) {
            console.error('Error saving activityData to KV:', error);
            // Fallback to memory
            memoryStorage.activityData = activityData || {};
        }
    } else {
        memoryStorage.activityData = activityData || {};
        console.log('Activity data saved to memory. Active sessions:', Object.keys(activityData || {}).length);
    }
    return true;
}

module.exports = {
    initDb,
    getUserData,
    saveUserData,
    getUserFavorites,
    saveUserFavorites,
    getUserOrders,
    saveUserOrder,
    saveUserOrders,
    getAtlasData,
    saveAtlasData,
    getInventory,
    saveInventory,
    getOrders,
    saveOrder,
    getProcessedEvents,
    saveProcessedEvents,
    getProducts,
    getActivityData,
    saveActivityData
};
