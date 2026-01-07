/* ========================================
   Sandro Sandri - Inventory Stock API
   ======================================== */

// Get current inventory status for all products
async function getInventoryStatus() {
    const inventory = await db.getInventory();
    const products = db.getProducts();
    
    const status = products.map(product => {
        const productInventory = inventory[product.id] || {};
        const sizes = product.sizes.map(size => {
            const stock = productInventory[size] || 0;
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

const db = require('../../lib/db');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const status = await getInventoryStatus();
        res.status(200).json(status);
    } catch (error) {
        console.error('Error fetching inventory status:', error);
        res.status(500).json({ error: 'Failed to fetch inventory status' });
    }
};

