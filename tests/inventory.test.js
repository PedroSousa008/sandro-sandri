/* ========================================
   Sandro Sandri - Inventory Tests
   ======================================== */

// These tests verify inventory management logic
// Run with: npm test (after setting up Jest)

const db = require('../lib/db');

describe('Inventory Management', () => {
    beforeEach(async () => {
        // Reset inventory before each test
        await db.initDb();
        const inventory = {
            1: { XS: 10, S: 20, M: 50, L: 50, XL: 20 },
            2: { XS: 10, S: 20, M: 50, L: 50, XL: 20 },
            3: { XS: 10, S: 20, M: 50, L: 50, XL: 20 },
            4: { XS: 10, S: 20, M: 50, L: 50, XL: 20 },
            5: { XS: 10, S: 20, M: 50, L: 50, XL: 20 }
        };
        await db.saveInventory(inventory);
    });

    test('Inventory decrements correctly after order', async () => {
        const cart = [
            { productId: 1, size: 'M', quantity: 2 },
            { productId: 1, size: 'L', quantity: 1 }
        ];

        const inventory = await db.getInventory();
        const initialStock = inventory[1].M;

        // Simulate webhook processing
        const result = await decrementInventoryAtomic(cart);
        
        expect(result.success).toBe(true);
        
        const updatedInventory = await db.getInventory();
        expect(updatedInventory[1].M).toBe(initialStock - 2);
        expect(updatedInventory[1].L).toBe(inventory[1].L - 1);
    });

    test('Prevents overselling when stock is insufficient', async () => {
        const cart = [
            { productId: 1, size: 'XS', quantity: 15 } // Only 10 available
        ];

        const result = await decrementInventoryAtomic(cart);
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Insufficient stock');
        
        // Verify inventory was not changed
        const inventory = await db.getInventory();
        expect(inventory[1].XS).toBe(10);
    });

    test('Sold out state updates correctly', async () => {
        // Order all XS items
        const cart = [{ productId: 1, size: 'XS', quantity: 10 }];
        await decrementInventoryAtomic(cart);
        
        const inventory = await db.getInventory();
        expect(inventory[1].XS).toBe(0);
        
        // Try to order more
        const result = await decrementInventoryAtomic([{ productId: 1, size: 'XS', quantity: 1 }]);
        expect(result.success).toBe(false);
    });
});

// Helper function (would be imported from webhook handler)
async function decrementInventoryAtomic(cart) {
    const inventory = await db.getInventory();
    const errors = [];
    const updates = {};
    
    for (const item of cart) {
        const productId = item.productId;
        const size = item.size;
        const quantity = item.quantity;
        
        const currentStock = inventory[productId]?.[size] || 0;
        
        if (currentStock < quantity) {
            errors.push({ productId, size, requested: quantity, available: currentStock });
        } else {
            if (!updates[productId]) {
                updates[productId] = { ...inventory[productId] };
            }
            updates[productId][size] = currentStock - quantity;
        }
    }
    
    if (errors.length > 0) {
        return {
            success: false,
            error: `Insufficient stock for ${errors.map(e => `${e.size} (${e.available} available, ${e.requested} requested)`).join(', ')}`
        };
    }
    
    for (const productId in updates) {
        inventory[productId] = updates[productId];
    }
    
    await db.saveInventory(inventory);
    return { success: true };
}

