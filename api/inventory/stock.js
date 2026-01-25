/* ========================================
   Sandro Sandri - Inventory Stock API
   ======================================== */

// Get current inventory status for all products
async function getInventoryStatus(commerceMode = 'LIVE') {
    const inventory = await db.getInventory();
    const products = db.getProducts();
    
    const status = products.map(product => {
        const productInventory = inventory[product.id] || {};
        const sizes = product.sizes.map(size => {
            // Get stock based on commerce mode
            let stock = 0;
            if (commerceMode === 'EARLY_ACCESS') {
                if (productInventory.early_access_stock) {
                    stock = productInventory.early_access_stock[size] || 0;
                } else if (productInventory[size]) {
                    // Legacy format
                    stock = productInventory[size] || 0;
                }
            } else {
                // LIVE mode
                if (productInventory.live_stock) {
                    stock = productInventory.live_stock[size] || 0;
                } else if (productInventory[size]) {
                    // Legacy format
                    stock = productInventory[size] || 0;
                }
            }
            
            return {
                size,
                stock,
                isSoldOut: stock === 0
            };
        });
        
        const totalStock = sizes.reduce((sum, s) => sum + s.stock, 0);
        const isSoldOut = totalStock === 0;
        
        return {
            productId: product.id,
            name: product.name,
            sku: product.sku,
            isSoldOut,
            sizes
        };
    });
    
    return status;
}

const db = require('../../lib/storage');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        // Get commerce mode from query or site settings
        let commerceMode = req.query.mode || 'LIVE';
        if (!['LIVE', 'EARLY_ACCESS'].includes(commerceMode)) {
            // Get from site settings
            await db.initDb();
            const settings = await db.getSiteSettings();
            commerceMode = settings.commerce_mode || 'LIVE';
        }
        
        const status = await getInventoryStatus(commerceMode);
        res.status(200).json(status);
    } catch (error) {
        console.error('Error fetching inventory status:', error);
        res.status(500).json({ error: 'Failed to fetch inventory status' });
    }
};

