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
        webhookEvents: {},
        activityData: {},
        emailVerificationTokens: {},
        siteSettings: null, // Added for site settings (commerce mode, etc.)
        rateLimitData: {}, // Added for rate limiting
        securityLogs: [], // Added for security logging
        chapterMode: null, // Added for chapter mode system
        waitlistEntries: [], // Added for waitlist entries
        chapterInventory: {} // Added for chapter-based inventory: { "chapter-2": { "6": { "XS": 10, ... }, initialized: true } }
    };
}

const memoryStorage = global.sandroSandriStorage;

// Helper functions
function getDefaultInventory() {
    // Default inventory structure: each product has live_stock and early_access_stock
    // Early Access: 50 pieces total per model, distributed: XS: 3, S: 7, M: 15, L: 15, XL: 10
    return {
        1: {
            live_stock: { XS: 10, S: 20, M: 50, L: 50, XL: 20 },
            early_access_stock: { XS: 3, S: 7, M: 15, L: 15, XL: 10 }
        },
        2: {
            live_stock: { XS: 10, S: 20, M: 50, L: 50, XL: 20 },
            early_access_stock: { XS: 3, S: 7, M: 15, L: 15, XL: 10 }
        },
        3: {
            live_stock: { XS: 10, S: 20, M: 50, L: 50, XL: 20 },
            early_access_stock: { XS: 3, S: 7, M: 15, L: 15, XL: 10 }
        },
        4: {
            live_stock: { XS: 10, S: 20, M: 50, L: 50, XL: 20 },
            early_access_stock: { XS: 3, S: 7, M: 15, L: 15, XL: 10 }
        },
        5: {
            live_stock: { XS: 10, S: 20, M: 50, L: 50, XL: 20 },
            early_access_stock: { XS: 3, S: 7, M: 15, L: 15, XL: 10 }
        }
    };
}

// Helper to get inventory for a specific mode
function getInventoryForMode(inventory, productId, size, mode) {
    if (!inventory || !inventory[productId]) {
        return 0;
    }
    
    const productInventory = inventory[productId];
    
    // Handle legacy format (flat structure) - migrate to new format
    if (!productInventory.live_stock && !productInventory.early_access_stock) {
        // Legacy format - assume it's live_stock
        return productInventory[size] || 0;
    }
    
    // New format - get stock based on mode
    if (mode === 'EARLY_ACCESS') {
        return productInventory.early_access_stock?.[size] || 0;
    } else {
        // LIVE mode
        return productInventory.live_stock?.[size] || 0;
    }
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
            // Optimize: Use set with expiration to prevent stale data (7 days expiration)
            // Also helps with memory management in Redis
            await kv.set('userData', userData || {}, { ex: 86400 * 7 }); // 7 days expiration
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

// Save all orders (for updates)
async function saveAllOrders(orders) {
    if (useKV && kv) {
        try {
            await kv.set('orders', orders);
            console.log('Orders saved to KV. Total orders:', orders.length);
        } catch (error) {
            console.error('Error saving orders to KV:', error);
            memoryStorage.orders = orders;
        }
    } else {
        memoryStorage.orders = orders;
        console.log('Orders saved to memory. Total orders:', orders.length);
    }
    return true;
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
            // Optimize: Set expiration for activity data (auto-cleanup after 1 hour)
            await kv.set('activityData', activityData || {}, { ex: 3600 }); // 1 hour expiration
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

// Email Verification Token Operations
async function getEmailVerificationTokens() {
    if (useKV && kv) {
        try {
            const data = await kv.get('emailVerificationTokens');
            return data || {};
        } catch (error) {
            console.error('Error reading emailVerificationTokens from KV:', error);
            return memoryStorage.emailVerificationTokens || {};
        }
    }
    return memoryStorage.emailVerificationTokens || {};
}

async function saveEmailVerificationTokens(tokens) {
    if (useKV && kv) {
        try {
            await kv.set('emailVerificationTokens', tokens || {});
            console.log('Email verification tokens saved to KV. Total tokens:', Object.keys(tokens || {}).length);
        } catch (error) {
            console.error('Error saving emailVerificationTokens to KV:', error);
            memoryStorage.emailVerificationTokens = tokens || {};
        }
    } else {
        memoryStorage.emailVerificationTokens = tokens || {};
        console.log('Email verification tokens saved to memory. Total tokens:', Object.keys(tokens || {}).length);
    }
    return true;
}

// Site Settings Operations
async function getSiteSettings() {
    if (useKV && kv) {
        try {
            const settings = await kv.get('siteSettings');
            if (settings) {
                return settings;
            }
            // Initialize with default LIVE mode and Chapter I
            const defaultSettings = {
                commerce_mode: 'LIVE',
                active_chapter: 'chapter_i',
                updatedAt: new Date().toISOString()
            };
            await kv.set('siteSettings', defaultSettings);
            return defaultSettings;
        } catch (error) {
            console.error('Error reading siteSettings from KV:', error);
            return memoryStorage.siteSettings || { commerce_mode: 'LIVE', active_chapter: 'chapter_i', updatedAt: new Date().toISOString() };
        }
    }
    if (!memoryStorage.siteSettings) {
        memoryStorage.siteSettings = {
            commerce_mode: 'LIVE',
            active_chapter: 'chapter_i',
            updatedAt: new Date().toISOString()
        };
    }
    return memoryStorage.siteSettings;
}

async function saveSiteSettings(settings) {
    if (useKV && kv) {
        try {
            await kv.set('siteSettings', settings || { commerce_mode: 'LIVE', active_chapter: 'chapter_i', updatedAt: new Date().toISOString() });
            console.log('Site settings saved to KV');
        } catch (error) {
            console.error('Error saving siteSettings to KV:', error);
            memoryStorage.siteSettings = settings || { commerce_mode: 'LIVE', active_chapter: 'chapter_i', updatedAt: new Date().toISOString() };
        }
    } else {
        memoryStorage.siteSettings = settings || { commerce_mode: 'LIVE', active_chapter: 'chapter_i', updatedAt: new Date().toISOString() };
        console.log('Site settings saved to memory');
    }
    return true;
}

// Rate Limit Data Operations
async function getRateLimitData() {
    if (useKV && kv) {
        try {
            const data = await kv.get('rateLimitData');
            return data || {};
        } catch (error) {
            console.error('Error reading rateLimitData from KV:', error);
            return memoryStorage.rateLimitData || {};
        }
    }
    return memoryStorage.rateLimitData || {};
}

async function saveRateLimitData(rateLimitData) {
    if (useKV && kv) {
        try {
            // Clean up old entries periodically (keep last 24 hours)
            const now = Date.now();
            const cleaned = {};
            for (const [key, value] of Object.entries(rateLimitData || {})) {
                // Keep if has recent attempts or is blocked
                if (value.attempts && value.attempts.length > 0) {
                    const recentAttempts = value.attempts.filter(ts => now - ts < 24 * 60 * 60 * 1000);
                    if (recentAttempts.length > 0 || (value.blockedUntil && now < value.blockedUntil)) {
                        cleaned[key] = {
                            ...value,
                            attempts: recentAttempts
                        };
                    }
                } else if (value.blockedUntil && now < value.blockedUntil) {
                    cleaned[key] = value;
                }
            }
            await kv.set('rateLimitData', cleaned);
            console.log('Rate limit data saved to KV. Active limits:', Object.keys(cleaned).length);
        } catch (error) {
            console.error('Error saving rateLimitData to KV:', error);
            memoryStorage.rateLimitData = rateLimitData || {};
        }
    } else {
        memoryStorage.rateLimitData = rateLimitData || {};
        console.log('Rate limit data saved to memory. Active limits:', Object.keys(rateLimitData || {}).length);
    }
    return true;
}

// Security Logs Operations
async function getSecurityLogs() {
    if (useKV && kv) {
        try {
            const logs = await kv.get('securityLogs');
            return logs || [];
        } catch (error) {
            console.error('Error reading securityLogs from KV:', error);
            return memoryStorage.securityLogs || [];
        }
    }
    return memoryStorage.securityLogs || [];
}

async function saveSecurityLogs(logs) {
    if (useKV && kv) {
        try {
            // Keep only last 10,000 logs
            const limitedLogs = Array.isArray(logs) ? logs.slice(-10000) : [];
            await kv.set('securityLogs', limitedLogs);
            console.log('Security logs saved to KV. Total logs:', limitedLogs.length);
        } catch (error) {
            console.error('Error saving securityLogs to KV:', error);
            memoryStorage.securityLogs = Array.isArray(logs) ? logs.slice(-10000) : [];
        }
    } else {
        memoryStorage.securityLogs = Array.isArray(logs) ? logs.slice(-10000) : [];
        console.log('Security logs saved to memory. Total logs:', memoryStorage.securityLogs.length);
    }
    return true;
}

// Chapter Mode Operations
async function getChapterMode() {
    if (useKV && kv) {
        try {
            const chapterMode = await kv.get('chapterMode');
            if (chapterMode) {
                return chapterMode;
            }
            // Initialize with default structure
            const defaultChapterMode = {
                chapters: {},
                updatedAt: new Date().toISOString()
            };
            await kv.set('chapterMode', defaultChapterMode);
            return defaultChapterMode;
        } catch (error) {
            console.error('Error reading chapterMode from KV:', error);
            return memoryStorage.chapterMode || { chapters: {}, updatedAt: new Date().toISOString() };
        }
    }
    if (!memoryStorage.chapterMode) {
        memoryStorage.chapterMode = {
            chapters: {},
            updatedAt: new Date().toISOString()
        };
    }
    return memoryStorage.chapterMode;
}

async function saveChapterMode(chapterMode) {
    if (useKV && kv) {
        try {
            await kv.set('chapterMode', chapterMode);
            console.log('Chapter mode saved to KV');
        } catch (error) {
            console.error('Error saving chapterMode to KV:', error);
            memoryStorage.chapterMode = chapterMode;
        }
    } else {
        memoryStorage.chapterMode = chapterMode;
        console.log('Chapter mode saved to memory');
    }
    return true;
}

async function getWaitlistEntries() {
    if (useKV && kv) {
        try {
            const entries = await kv.get('waitlistEntries');
            if (entries && Array.isArray(entries)) {
                return entries;
            }
            // Initialize empty array if not found
            await kv.set('waitlistEntries', []);
            return [];
        } catch (error) {
            console.error('Error reading waitlistEntries from KV:', error);
            return memoryStorage.waitlistEntries || [];
        }
    }
    if (!memoryStorage.waitlistEntries) {
        memoryStorage.waitlistEntries = [];
    }
    return memoryStorage.waitlistEntries;
}

async function addWaitlistEntry(entry) {
    // Add unique ID and timestamp if not present
    if (!entry.id) {
        entry.id = `waitlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    if (!entry.createdAt) {
        entry.createdAt = new Date().toISOString();
    }
    
    const entries = await getWaitlistEntries();
    entries.push(entry);
    
    if (useKV && kv) {
        try {
            await kv.set('waitlistEntries', entries);
            console.log('Waitlist entry saved to KV');
        } catch (error) {
            console.error('Error saving waitlistEntry to KV:', error);
            memoryStorage.waitlistEntries = entries;
        }
    } else {
        memoryStorage.waitlistEntries = entries;
        console.log('Waitlist entry saved to memory');
    }
    return entry;
}

// ========================================
// Chapter Inventory Management
// ========================================

async function getChapterInventory(chapterId) {
    if (useKV && kv) {
        try {
            const key = `chapterInventory:${chapterId}`;
            const inventory = await kv.get(key);
            if (inventory) {
                return inventory;
            }
            return null;
        } catch (error) {
            console.error(`Error reading chapterInventory for ${chapterId} from KV:`, error);
            return memoryStorage.chapterInventory[chapterId] || null;
        }
    }
    return memoryStorage.chapterInventory[chapterId] || null;
}

async function saveChapterInventory(chapterId, inventory) {
    if (useKV && kv) {
        try {
            const key = `chapterInventory:${chapterId}`;
            await kv.set(key, inventory);
            console.log(`Chapter inventory saved to KV for ${chapterId}`);
        } catch (error) {
            console.error(`Error saving chapterInventory for ${chapterId} to KV:`, error);
            memoryStorage.chapterInventory[chapterId] = inventory;
        }
    } else {
        memoryStorage.chapterInventory[chapterId] = inventory;
        console.log(`Chapter inventory saved to memory for ${chapterId}`);
    }
    return true;
}

async function initChapterInventoryIfNeeded(chapterId, models) {
    // Check if inventory already initialized
    const existing = await getChapterInventory(chapterId);
    if (existing && existing.initialized) {
        console.log(`Inventory for ${chapterId} already initialized, skipping...`);
        return existing;
    }
    
    // Initialize inventory structure
    // Size distribution per model: XS=10, S=20, M=50, L=50, XL=20
    const sizeDistribution = {
        XS: 10,
        S: 20,
        M: 50,
        L: 50,
        XL: 20
    };
    
    const inventory = {
        initialized: true,
        initializedAt: new Date().toISOString(),
        models: {}
    };
    
    // Initialize each model with full stock
    models.forEach(model => {
        inventory.models[model.id.toString()] = {
            name: model.name,
            sku: model.sku,
            stock: { ...sizeDistribution }
        };
    });
    
    await saveChapterInventory(chapterId, inventory);
    console.log(`✅ Initialized inventory for ${chapterId} with ${models.length} models`);
    return inventory;
}

async function decrementInventoryOnPaidOrder(order) {
    if (!order || !order.items || !Array.isArray(order.items)) {
        console.error('Invalid order data for inventory decrement');
        return false;
    }
    
    // Group items by chapter
    const itemsByChapter = {};
    
    order.items.forEach(item => {
        const productId = item.product_id || item.productId;
        const size = item.size;
        const quantity = item.quantity || 1;
        const chapter = item.chapter || item.chapter_id;
        
        if (!productId || !size || !chapter) {
            console.warn('Missing required fields in order item:', item);
            return;
        }
        
        // Normalize chapter ID (chapter_ii -> chapter-2)
        const chapterId = chapter.replace('_', '-').toLowerCase();
        if (!chapterId.startsWith('chapter-')) {
            console.warn('Invalid chapter ID:', chapter);
            return;
        }
        
        if (!itemsByChapter[chapterId]) {
            itemsByChapter[chapterId] = [];
        }
        
        itemsByChapter[chapterId].push({
            productId: productId.toString(),
            size: size.toUpperCase(),
            quantity: quantity
        });
    });
    
    // Decrement inventory for each chapter
    for (const [chapterId, items] of Object.entries(itemsByChapter)) {
        const inventory = await getChapterInventory(chapterId);
        if (!inventory || !inventory.models) {
            console.warn(`No inventory found for ${chapterId}, skipping decrement`);
            continue;
        }
        
        let updated = false;
        items.forEach(item => {
            const model = inventory.models[item.productId];
            if (model && model.stock && model.stock[item.size] !== undefined) {
                const currentStock = model.stock[item.size];
                const newStock = Math.max(0, currentStock - item.quantity);
                model.stock[item.size] = newStock;
                updated = true;
                console.log(`Decremented ${item.quantity} ${item.size} from ${model.name} (${chapterId}): ${currentStock} -> ${newStock}`);
            } else {
                console.warn(`Model ${item.productId} or size ${item.size} not found in inventory for ${chapterId}`);
            }
        });
        
        if (updated) {
            await saveChapterInventory(chapterId, inventory);
        }
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
    saveActivityData,
    getEmailVerificationTokens,
    saveEmailVerificationTokens,
    getSiteSettings,
    saveSiteSettings,
    getRateLimitData,
    saveRateLimitData,
    getSecurityLogs,
    saveSecurityLogs,
    saveAllOrders,
    getChapterMode,
    saveChapterMode,
    getWaitlistEntries,
    addWaitlistEntry,
    getChapterInventory,
    saveChapterInventory,
    initChapterInventoryIfNeeded,
    decrementInventoryOnPaidOrder
};
