/* ========================================
   Sandro Sandri - Inventory Service Layer
   Manages inventory per Chapter, per Model, per Size
   ======================================== */

const db = require('./storage');

// Chapter II models mapping (product ID to model name)
const CHAPTER_II_MODELS = {
    6: 'Maldives',
    7: 'Palma',
    8: 'Lago di Como',
    9: 'Gisele',
    10: 'Pourville'
};

// Default size distribution per model (always the same)
const DEFAULT_SIZE_DISTRIBUTION = {
    XS: 10,
    S: 20,
    M: 50,
    L: 50,
    XL: 20
};

// Total units per model
const UNITS_PER_MODEL = 150;

/**
 * Get inventory for a specific chapter
 * @param {string} chapterId - e.g., 'chapter-2'
 * @returns {Promise<Object>} Inventory object: { modelId: { XS: 10, S: 20, ... }, ... }
 */
async function getInventory(chapterId) {
    await db.initDb();
    const allInventory = await db.getChapterInventory();
    
    if (!allInventory[chapterId]) {
        return {};
    }
    
    return allInventory[chapterId];
}

/**
 * Get inventory for a specific model in a chapter
 * @param {string} chapterId - e.g., 'chapter-2'
 * @param {number} modelId - Product ID (e.g., 6 for Maldives)
 * @returns {Promise<Object>} { XS: 10, S: 20, M: 50, L: 50, XL: 20 }
 */
async function getInventoryForModel(chapterId, modelId) {
    const chapterInventory = await getInventory(chapterId);
    
    if (!chapterInventory[modelId]) {
        return DEFAULT_SIZE_DISTRIBUTION; // Return default if not initialized
    }
    
    return chapterInventory[modelId];
}

/**
 * Get stock for a specific model + size
 * @param {string} chapterId - e.g., 'chapter-2'
 * @param {number} modelId - Product ID
 * @param {string} size - XS, S, M, L, XL
 * @returns {Promise<number>} Available stock
 */
async function getStock(chapterId, modelId, size) {
    const modelInventory = await getInventoryForModel(chapterId, modelId);
    return modelInventory[size] || 0;
}

/**
 * Initialize inventory for a chapter if not already initialized
 * @param {string} chapterId - e.g., 'chapter-2'
 * @param {Array<Object>} models - Array of { id: number, name: string }
 * @returns {Promise<boolean>} true if initialized, false if already existed
 */
async function initChapterInventoryIfNeeded(chapterId, models) {
    await db.initDb();
    const allInventory = await db.getChapterInventory();
    
    // Check if already initialized
    if (allInventory[chapterId] && allInventory[chapterId]._initialized) {
        console.log(`📦 Inventory for ${chapterId} already initialized, skipping`);
        return false;
    }
    
    // Initialize inventory for each model
    const chapterInventory = {
        _initialized: true,
        _initializedAt: new Date().toISOString()
    };
    
    models.forEach(model => {
        chapterInventory[model.id] = { ...DEFAULT_SIZE_DISTRIBUTION };
        console.log(`📦 Initialized ${model.name} (ID: ${model.id}) with stock:`, DEFAULT_SIZE_DISTRIBUTION);
    });
    
    // Save to storage
    allInventory[chapterId] = chapterInventory;
    await db.saveChapterInventory(allInventory);
    
    console.log(`✅ Inventory initialized for ${chapterId} with ${models.length} models`);
    return true;
}

/**
 * Decrement inventory for a paid order
 * This should be called from Stripe webhook after successful payment
 * @param {Object} order - Order object with cart items
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function decrementInventoryOnPaidOrder(order) {
    await db.initDb();
    const allInventory = await db.getChapterInventory();
    const cart = order.cart || [];
    const errors = [];
    const updates = {};
    
    console.log('📦 Decrementing inventory for order:', order.orderNumber);
    
    // Process each cart item
    for (const item of cart) {
        const productId = item.productId;
        const size = item.size;
        const quantity = item.quantity;
        
        // Determine chapter from product
        // For now, we'll need to map product IDs to chapters
        // Chapter I: IDs 1-5, Chapter II: IDs 6-10
        let chapterId = null;
        if (productId >= 1 && productId <= 5) {
            chapterId = 'chapter-1';
        } else if (productId >= 6 && productId <= 10) {
            chapterId = 'chapter-2';
        } else {
            // Try to determine chapter from product ID ranges
            // Chapter I: IDs 1-5, Chapter II: IDs 6-10
            // Future chapters can be added here
            if (productId >= 1 && productId <= 5) {
                chapterId = 'chapter-1';
            } else if (productId >= 6 && productId <= 10) {
                chapterId = 'chapter-2';
            }
        }
        
        if (!chapterId) {
            console.warn(`⚠️ Could not determine chapter for product ${productId}, skipping inventory decrement`);
            continue;
        }
        
        // Get current inventory
        if (!allInventory[chapterId] || !allInventory[chapterId][productId]) {
            errors.push({
                productId,
                size,
                error: `Inventory not initialized for ${chapterId} product ${productId}`
            });
            continue;
        }
        
        const currentStock = allInventory[chapterId][productId][size] || 0;
        
        if (currentStock < quantity) {
            errors.push({
                productId,
                size,
                requested: quantity,
                available: currentStock,
                error: `Insufficient stock: ${currentStock} available, ${quantity} requested`
            });
            continue;
        }
        
        // Prepare update
        if (!updates[chapterId]) {
            updates[chapterId] = { ...allInventory[chapterId] };
        }
        if (!updates[chapterId][productId]) {
            updates[chapterId][productId] = { ...allInventory[chapterId][productId] };
        }
        
        // Decrement stock
        updates[chapterId][productId][size] = currentStock - quantity;
        console.log(`   ✅ Decremented ${chapterId} product ${productId} ${size}: ${currentStock} - ${quantity} = ${updates[chapterId][productId][size]}`);
    }
    
    // If any errors, return without updating
    if (errors.length > 0) {
        console.error('❌ Inventory decrement errors:', errors);
        return {
            success: false,
            error: errors.map(e => e.error || `${e.size}: ${e.available} available, ${e.requested} requested`).join('; ')
        };
    }
    
    // Apply all updates atomically
    for (const chapterId in updates) {
        allInventory[chapterId] = updates[chapterId];
    }
    
    // Save updated inventory
    await db.saveChapterInventory(allInventory);
    console.log('✅ Inventory updated after order:', order.orderNumber);
    
    return { success: true };
}

/**
 * Get models for a chapter
 * @param {string} chapterId - e.g., 'chapter-2'
 * @returns {Array<Object>} Array of { id: number, name: string }
 */
function getModelsForChapter(chapterId) {
    if (chapterId === 'chapter-2') {
        return [
            { id: 6, name: 'Maldives' },
            { id: 7, name: 'Palma' },
            { id: 8, name: 'Lago di Como' },
            { id: 9, name: 'Gisele' },
            { id: 10, name: 'Pourville' }
        ];
    } else if (chapterId === 'chapter-1') {
        return [
            { id: 1, name: 'Isole Cayman' },
            { id: 2, name: 'Isola di Necker' },
            { id: 3, name: "Monroe's Kisses" },
            { id: 4, name: 'La Dolce Vita' },
            { id: 5, name: 'Port-Coton' }
        ];
    }
    // Future chapters can be added here
    return [];
}

module.exports = {
    getInventory,
    getInventoryForModel,
    getStock,
    initChapterInventoryIfNeeded,
    decrementInventoryOnPaidOrder,
    getModelsForChapter,
    DEFAULT_SIZE_DISTRIBUTION,
    UNITS_PER_MODEL
};

