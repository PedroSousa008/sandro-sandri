/* ========================================
   Sandro Sandri - Inventory Management
   ======================================== */

// Initialize inventory from products
function initializeInventory() {
    const products = window.ProductsAPI.getAll();
    const inventory = {};
    
    products.forEach(product => {
        if (product.inventory) {
            inventory[product.id] = { ...product.inventory };
        }
    });
    
    // Check if inventory exists in localStorage, if not, initialize it
    const savedInventory = localStorage.getItem('sandroSandriInventory');
    if (!savedInventory) {
        localStorage.setItem('sandroSandriInventory', JSON.stringify(inventory));
        return inventory;
    }
    
    // Merge saved inventory with product defaults (in case new products are added)
    const saved = JSON.parse(savedInventory);
    products.forEach(product => {
        if (product.inventory && !saved[product.id]) {
            saved[product.id] = { ...product.inventory };
        }
    });
    
    localStorage.setItem('sandroSandriInventory', JSON.stringify(saved));
    return saved;
}

// Get current inventory for a product and size
function getInventory(productId, size) {
    const inventory = JSON.parse(localStorage.getItem('sandroSandriInventory') || '{}');
    return inventory[productId]?.[size] || 0;
}

// Check if a product size is in stock
function isInStock(productId, size) {
    return getInventory(productId, size) > 0;
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

// Initialize on load
if (window.ProductsAPI) {
    initializeInventory();
} else {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.ProductsAPI) {
            initializeInventory();
        }
    });
}

// Export functions
window.InventoryAPI = {
    get: getInventory,
    isInStock: isInStock,
    decrease: decreaseInventory,
    increase: increaseInventory,
    init: initializeInventory
};

