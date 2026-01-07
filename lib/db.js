/* ========================================
   Sandro Sandri - Database Layer
   ======================================== */

// This is a file-based database implementation
// In production, replace with actual database (PostgreSQL, MongoDB, etc.)

const fs = require('fs').promises;
const path = require('path');

const DB_DIR = path.join(process.cwd(), '.data');
const DB_FILES = {
    inventory: path.join(DB_DIR, 'inventory.json'),
    orders: path.join(DB_DIR, 'orders.json'),
    webhookEvents: path.join(DB_DIR, 'webhook-events.json')
};

// Ensure DB directory exists
async function ensureDbDir() {
    try {
        await fs.mkdir(DB_DIR, { recursive: true });
    } catch (error) {
        // Directory might already exist
    }
}

// Initialize database files
async function initDb() {
    await ensureDbDir();
    
    // Initialize inventory if it doesn't exist
    try {
        await fs.access(DB_FILES.inventory);
    } catch {
        // Initialize with full stock from products
        const initialInventory = {
            1: { XS: 10, S: 20, M: 50, L: 50, XL: 20 }, // Isole Cayman
            2: { XS: 10, S: 20, M: 50, L: 50, XL: 20 }, // Isola di Necker
            3: { XS: 10, S: 20, M: 50, L: 50, XL: 20 }, // Monroe's Kisses
            4: { XS: 10, S: 20, M: 50, L: 50, XL: 20 }, // Sardinia
            5: { XS: 10, S: 20, M: 50, L: 50, XL: 20 }  // Port-Coton
        };
        await fs.writeFile(DB_FILES.inventory, JSON.stringify(initialInventory, null, 2));
    }
    
    // Initialize orders if it doesn't exist
    try {
        await fs.access(DB_FILES.orders);
    } catch {
        await fs.writeFile(DB_FILES.orders, JSON.stringify([], null, 2));
    }
    
    // Initialize webhook events if it doesn't exist
    try {
        await fs.access(DB_FILES.webhookEvents);
    } catch {
        await fs.writeFile(DB_FILES.webhookEvents, JSON.stringify({}, null, 2));
    }
}

// Get inventory
async function getInventory() {
    await initDb();
    try {
        const data = await fs.readFile(DB_FILES.inventory, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading inventory:', error);
        return {};
    }
}

// Save inventory
async function saveInventory(inventory) {
    await initDb();
    await fs.writeFile(DB_FILES.inventory, JSON.stringify(inventory, null, 2));
}

// Get orders
async function getOrders() {
    await initDb();
    try {
        const data = await fs.readFile(DB_FILES.orders, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading orders:', error);
        return [];
    }
}

// Save order
async function saveOrder(order) {
    await initDb();
    const orders = await getOrders();
    orders.push(order);
    await fs.writeFile(DB_FILES.orders, JSON.stringify(orders, null, 2));
    return order;
}

// Get processed webhook events
async function getProcessedEvents() {
    await initDb();
    try {
        const data = await fs.readFile(DB_FILES.webhookEvents, 'utf8');
        const events = JSON.parse(data);
        return new Map(Object.entries(events));
    } catch (error) {
        console.error('Error reading webhook events:', error);
        return new Map();
    }
}

// Save processed webhook events
async function saveProcessedEvents(eventsMap) {
    await initDb();
    const events = Object.fromEntries(eventsMap);
    await fs.writeFile(DB_FILES.webhookEvents, JSON.stringify(events, null, 2));
}

// Get products (static data - matches products.js)
function getProducts() {
    return [
        { id: 1, name: "Isole Cayman", sku: "SS-001", sizes: ["XS", "S", "M", "L", "XL"] },
        { id: 2, name: "Isola di Necker", sku: "SS-002", sizes: ["XS", "S", "M", "L", "XL"] },
        { id: 3, name: "Monroe's Kisses", sku: "SS-003", sizes: ["XS", "S", "M", "L", "XL"] },
        { id: 4, name: "Sardinia", sku: "SS-004", sizes: ["XS", "S", "M", "L", "XL"] },
        { id: 5, name: "Port-Coton", sku: "SS-005", sizes: ["XS", "S", "M", "L", "XL"] }
    ];
}

module.exports = {
    initDb,
    getInventory,
    saveInventory,
    getOrders,
    saveOrder,
    getProcessedEvents,
    saveProcessedEvents,
    getProducts
};

