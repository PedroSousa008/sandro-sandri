/* ========================================
   Sandro Sandri - Persistent Storage Layer
   ======================================== */

// Simple in-memory storage that persists within the same serverless function execution
// For true persistence across invocations, this should be replaced with:
// - Vercel KV (Redis) - recommended for Vercel
// - MongoDB Atlas (free tier available)
// - Supabase (free tier available)
// - Firebase Firestore (free tier available)

// Global storage object (shared across all requires in the same process)
if (!global.sandroSandriStorage) {
    global.sandroSandriStorage = {
        userData: {},
        atlasData: {},
        inventory: null,
        orders: [],
        webhookEvents: {}
    };
}

const storage = global.sandroSandriStorage;

// Initialize default inventory
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
    return storage.userData || {};
}

async function saveUserData(userData) {
    storage.userData = userData || {};
    console.log('User data saved. Total users:', Object.keys(storage.userData).length);
    return true;
}

// Atlas Data Operations
async function getAtlasData() {
    return storage.atlasData || {};
}

async function saveAtlasData(atlasData) {
    storage.atlasData = atlasData || {};
    console.log('Atlas data saved. Total users:', Object.keys(storage.atlasData).length);
    return true;
}

// Inventory Operations
async function getInventory() {
    if (!storage.inventory) {
        storage.inventory = getDefaultInventory();
    }
    return storage.inventory;
}

async function saveInventory(inventory) {
    storage.inventory = inventory;
    return true;
}

// Orders Operations
async function getOrders() {
    return storage.orders || [];
}

async function saveOrder(order) {
    if (!storage.orders) {
        storage.orders = [];
    }
    storage.orders.push(order);
    return order;
}

// Webhook Events Operations
async function getProcessedEvents() {
    const events = storage.webhookEvents || {};
    return new Map(Object.entries(events));
}

async function saveProcessedEvents(eventsMap) {
    storage.webhookEvents = Object.fromEntries(eventsMap);
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

// Initialize (no-op for this storage)
async function initDb() {
    // Ensure inventory is initialized
    if (!storage.inventory) {
        storage.inventory = getDefaultInventory();
    }
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
