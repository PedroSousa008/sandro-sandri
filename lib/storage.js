/* ========================================
   Sandro Sandri - Persistent Storage Layer
   ======================================== */

// Using a simple HTTP-based storage service for persistence
// This works across all serverless function invocations

const STORAGE_URL = process.env.STORAGE_URL || 'https://api.jsonbin.io/v3/b';
const STORAGE_API_KEY = process.env.JSONBIN_API_KEY || '';

// Fallback: Use a simple in-memory cache with a shared key
// In production, replace with Vercel KV, MongoDB, or similar database

let cache = {
    userData: null,
    atlasData: null,
    inventory: null,
    orders: null,
    webhookEvents: null,
    lastFetch: {}
};

const CACHE_TTL = 5000; // 5 seconds cache

// Simple storage using a shared endpoint
async function fetchFromStorage(key) {
    const now = Date.now();
    if (cache[key] && (now - (cache.lastFetch[key] || 0)) < CACHE_TTL) {
        return cache[key];
    }

    try {
        // For now, use a simple approach: store in a shared location
        // In production, use Vercel KV or a real database
        const response = await fetch(`${STORAGE_URL}/${key}`, {
            headers: {
                'X-Master-Key': STORAGE_API_KEY,
                'X-Bin-Meta': 'false'
            }
        });

        if (response.ok) {
            const data = await response.json();
            cache[key] = data;
            cache.lastFetch[key] = now;
            return data;
        }
    } catch (error) {
        console.warn(`Could not fetch ${key} from storage:`, error.message);
    }

    // Return cached data or default
    return cache[key] || getDefault(key);
}

async function saveToStorage(key, data) {
    cache[key] = data;
    cache.lastFetch[key] = Date.now();

    try {
        if (STORAGE_API_KEY) {
            await fetch(`${STORAGE_URL}/${key}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': STORAGE_API_KEY
                },
                body: JSON.stringify(data)
            });
        }
    } catch (error) {
        console.warn(`Could not save ${key} to storage:`, error.message);
        // Continue anyway - data is in cache
    }
}

function getDefault(key) {
    switch (key) {
        case 'userData':
            return {};
        case 'atlasData':
            return {};
        case 'inventory':
            return {
                1: { XS: 10, S: 20, M: 50, L: 50, XL: 20 },
                2: { XS: 10, S: 20, M: 50, L: 50, XL: 20 },
                3: { XS: 10, S: 20, M: 50, L: 50, XL: 20 },
                4: { XS: 10, S: 20, M: 50, L: 50, XL: 20 },
                5: { XS: 10, S: 20, M: 50, L: 50, XL: 20 }
            };
        case 'orders':
            return [];
        case 'webhookEvents':
            return {};
        default:
            return {};
    }
}

// User Data Operations
async function getUserData() {
    return await fetchFromStorage('userData');
}

async function saveUserData(userData) {
    await saveToStorage('userData', userData);
    return true;
}

// Atlas Data Operations
async function getAtlasData() {
    return await fetchFromStorage('atlasData');
}

async function saveAtlasData(atlasData) {
    await saveToStorage('atlasData', atlasData);
    return true;
}

// Inventory Operations
async function getInventory() {
    const inventory = await fetchFromStorage('inventory');
    if (!inventory || Object.keys(inventory).length === 0) {
        const defaultInventory = getDefault('inventory');
        await saveInventory(defaultInventory);
        return defaultInventory;
    }
    return inventory;
}

async function saveInventory(inventory) {
    await saveToStorage('inventory', inventory);
    return true;
}

// Orders Operations
async function getOrders() {
    return await fetchFromStorage('orders');
}

async function saveOrder(order) {
    const orders = await getOrders();
    orders.push(order);
    await saveToStorage('orders', orders);
    return order;
}

// Webhook Events Operations
async function getProcessedEvents() {
    const events = await fetchFromStorage('webhookEvents');
    return new Map(Object.entries(events || {}));
}

async function saveProcessedEvents(eventsMap) {
    await saveToStorage('webhookEvents', Object.fromEntries(eventsMap));
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
