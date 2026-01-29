/* ========================================
   Sandro Sandri - Inventory Management
   ======================================== */

// Reset inventory to full stock (for all products)
function resetInventoryToFull() {
    const products = window.ProductsAPI.getAll();
    const inventory = {};
    
    products.forEach(product => {
        if (product.inventory) {
            inventory[product.id] = { ...product.inventory };
        }
    });
    
    localStorage.setItem('sandroSandriInventory', JSON.stringify(inventory));
    console.log('Inventory reset to full stock:', inventory);
    return inventory;
}

// Initialize inventory from products
function initializeInventory() {
    const products = window.ProductsAPI.getAll();
    const inventory = {};
    
    // Build full inventory from all products
    products.forEach(product => {
        if (product.inventory) {
            inventory[product.id] = { ...product.inventory };
        }
    });
    
    // Check if inventory exists in localStorage
    const savedInventory = localStorage.getItem('sandroSandriInventory');
    
    if (!savedInventory) {
        // First time - initialize with full stock
        localStorage.setItem('sandroSandriInventory', JSON.stringify(inventory));
        return inventory;
    }
    
    // Merge saved inventory with product defaults
    const saved = JSON.parse(savedInventory);
    let needsReset = false;
    
    products.forEach(product => {
        if (product.inventory) {
            // If product doesn't exist in saved inventory, add it
            if (!saved[product.id]) {
                saved[product.id] = { ...product.inventory };
                needsReset = true;
            } else {
                // Check if all sizes are present and have correct max values
                Object.keys(product.inventory).forEach(size => {
                    const maxStock = product.inventory[size];
                    const currentStock = saved[product.id][size];
                    
                    // If size is missing or stock is higher than max (shouldn't happen), reset it
                    if (currentStock === undefined || currentStock > maxStock) {
                        saved[product.id][size] = maxStock;
                        needsReset = true;
                    }
                });
            }
        }
    });
    
    // If any product was missing or had issues, save the corrected inventory
    if (needsReset) {
        localStorage.setItem('sandroSandriInventory', JSON.stringify(saved));
    }
    
    return saved;
}

// Get chapter ID from product
function getChapterIdFromProduct(productId) {
    const product = window.ProductsAPI?.getById(productId);
    if (!product) return null;
    
    if (product.chapter === 'chapter_i') return 'chapter-1';
    if (product.chapter === 'chapter_ii') return 'chapter-2';
    // Future chapters can be added here
    return null;
}

// Get current inventory for a product and size (using chapter-based inventory)
async function getInventory(productId, size) {
    // Try to get from cache first
    const cacheKey = `inventory_${productId}_${size}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached !== null) {
        return parseInt(cached);
    }
    
    const chapterId = getChapterIdFromProduct(productId);
    if (!chapterId) {
        // Fallback to localStorage for products without chapter
        const inventory = JSON.parse(localStorage.getItem('sandroSandriInventory') || '{}');
        return inventory[productId]?.[size] || 0;
    }
    
    try {
        const response = await fetch(`/api/inventory?chapterId=${chapterId}&modelId=${productId}&size=${size}`);
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                const stock = data.stock || 0;
                // Cache for 30 seconds
                sessionStorage.setItem(cacheKey, stock.toString());
                setTimeout(() => sessionStorage.removeItem(cacheKey), 30000);
                return stock;
            }
        }
    } catch (error) {
        console.error('Error fetching inventory:', error);
    }
    
    // Fallback to localStorage
    const inventory = JSON.parse(localStorage.getItem('sandroSandriInventory') || '{}');
    return inventory[productId]?.[size] || 0;
}

// Check if a product size is in stock (async version)
async function isInStockAsync(productId, size) {
    const stock = await getInventory(productId, size);
    return stock > 0;
}

// Check if a product size is in stock (sync version - uses cache)
function isInStock(productId, size) {
    // Try cache first
    const cacheKey = `inventory_${productId}_${size}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached !== null) {
        return parseInt(cached) > 0;
    }
    
    // Fallback to localStorage
    const inventory = JSON.parse(localStorage.getItem('sandroSandriInventory') || '{}');
    return (inventory[productId]?.[size] || 0) > 0;
}

// Decrease inventory when item is added to cart
function decreaseInventory(productId, size, quantity = 1) {
    const inventory = JSON.parse(localStorage.getItem('sandroSandriInventory') || '{}');
    
    if (!inventory[productId]) {
        // Initialize if doesn't exist
        const product = window.ProductsAPI.getById(productId);
        if (product && product.inventory) {
            inventory[productId] = { ...product.inventory };
        } else {
            return false;
        }
    }
    
    const currentStock = inventory[productId][size] || 0;
    if (currentStock < quantity) {
        return false; // Not enough stock
    }
    
    inventory[productId][size] = currentStock - quantity;
    localStorage.setItem('sandroSandriInventory', JSON.stringify(inventory));
    return true;
}

// Increase inventory when item is removed from cart (for returns/cancellations)
function increaseInventory(productId, size, quantity = 1) {
    const inventory = JSON.parse(localStorage.getItem('sandroSandriInventory') || '{}');
    
    if (!inventory[productId]) {
        const product = window.ProductsAPI.getById(productId);
        if (product && product.inventory) {
            inventory[productId] = { ...product.inventory };
        } else {
            return false;
        }
    }
    
    const currentStock = inventory[productId][size] || 0;
    const maxStock = window.ProductsAPI.getById(productId)?.inventory?.[size] || 0;
    
    // Don't exceed original inventory
    inventory[productId][size] = Math.min(currentStock + quantity, maxStock);
    localStorage.setItem('sandroSandriInventory', JSON.stringify(inventory));
    return true;
}

// Initialize on load - ensure it runs after ProductsAPI is loaded
async function initInventoryWhenReady() {
    if (window.ProductsAPI && window.ProductsAPI.getAll) {
        const products = window.ProductsAPI.getAll();
        if (products && products.length > 0) {
            // First, try to sync from server (server is source of truth)
            const synced = await syncInventoryFromServer();
            
            // If sync failed, fall back to localStorage initialization
            if (!synced) {
                console.log('⚠️ Server sync failed, using localStorage inventory');
                const inventory = initializeInventory();
                
                // Verify all products have inventory - if not, reset
                let needsReset = false;
                products.forEach(product => {
                    if (product.inventory) {
                        if (!inventory[product.id]) {
                            needsReset = true;
                        } else {
                            // Check if any size is missing or has 0 stock when it shouldn't
                            Object.keys(product.inventory).forEach(size => {
                                const expectedStock = product.inventory[size];
                                const currentStock = inventory[product.id][size];
                                if (currentStock === undefined || currentStock === null || currentStock < 0) {
                                    needsReset = true;
                                }
                            });
                        }
                    }
                });
                
                if (needsReset) {
                    console.log('Inventory corrupted or missing - resetting to full stock');
                    resetInventoryToFull();
                }
                
                console.log('Inventory initialized from localStorage:', JSON.parse(localStorage.getItem('sandroSandriInventory') || '{}'));
            }
        } else {
            // Wait a bit and try again
            setTimeout(initInventoryWhenReady, 100);
        }
    } else {
        // Wait a bit and try again
        setTimeout(initInventoryWhenReady, 100);
    }
}

// Try to initialize immediately
if (window.ProductsAPI) {
    initInventoryWhenReady();
} else {
    // Wait for DOM and ProductsAPI
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initInventoryWhenReady);
    } else {
        initInventoryWhenReady();
    }
}

// Fetch inventory from server and sync with localStorage (chapter-based)
async function syncInventoryFromServer() {
    try {
        console.log('🔄 Syncing inventory from server (chapter-based)...');
        
        const products = window.ProductsAPI?.getAll() || [];
        const serverInventory = {};
        
        // Fetch inventory for each chapter
        const chapters = ['chapter-1', 'chapter-2']; // Add more as needed
        
        for (const chapterId of chapters) {
            try {
                const response = await fetch(`/api/inventory?chapterId=${chapterId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.inventory) {
                        // Transform chapter inventory to product-based format
                        Object.keys(data.inventory).forEach(modelId => {
                            if (modelId !== '_initialized' && modelId !== '_initializedAt') {
                                const modelInventory = data.inventory[modelId];
                                serverInventory[modelId] = modelInventory;
                            }
                        });
                    }
                }
            } catch (error) {
                console.warn(`⚠️ Failed to fetch inventory for ${chapterId}:`, error);
            }
        }
        
        // Update localStorage with server inventory (server is source of truth)
        localStorage.setItem('sandroSandriInventory', JSON.stringify(serverInventory));
        
        // Clear cache to force refresh
        Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('inventory_')) {
                sessionStorage.removeItem(key);
            }
        });
        
        console.log('✅ Inventory synced from server:', serverInventory);
        
        // Trigger UI update if products are displayed
        // Dispatch custom event so product pages can refresh
        window.dispatchEvent(new CustomEvent('inventorySynced', { detail: serverInventory }));
        
        // Also call global update function if it exists
        if (typeof window.updateProductInventory === 'function') {
            window.updateProductInventory();
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error syncing inventory from server:', error);
        return false;
    }
}

// Export functions
window.InventoryAPI = {
    get: getInventory,
    isInStock: isInStock,
    isInStockAsync: isInStockAsync,
    decrease: decreaseInventory,
    increase: increaseInventory,
    init: initializeInventory,
    reset: resetInventoryToFull,
    syncFromServer: syncInventoryFromServer,
    getChapterIdFromProduct: getChapterIdFromProduct
};

