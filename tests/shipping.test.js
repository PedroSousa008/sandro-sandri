/* ========================================
   Sandro Sandri - Shipping Tests
   ======================================== */

describe('Shipping Calculation', () => {
    const SHIPPING_FEES = {
        'PT': 5.00,
        'ES': 8.00,
        'FR': 8.00,
        'IT': 8.00,
        'DE': 10.00,
        'CH': 12.00,
        'GB': 12.00,
        'DEFAULT': 20.00
    };
    
    const FREE_SHIPPING_MIN_QUANTITY = 2;

    function calculateShipping(cart, countryCode) {
        const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
        
        if (totalQuantity >= FREE_SHIPPING_MIN_QUANTITY) {
            return 0;
        }
        
        if (countryCode && SHIPPING_FEES[countryCode]) {
            return SHIPPING_FEES[countryCode];
        }
        
        return SHIPPING_FEES['DEFAULT'];
    }

    test('Free shipping for 2+ items', () => {
        const cart = [
            { quantity: 1 },
            { quantity: 1 }
        ];
        
        expect(calculateShipping(cart, 'PT')).toBe(0);
    });

    test('Free shipping for single item with quantity 2', () => {
        const cart = [
            { quantity: 2 }
        ];
        
        expect(calculateShipping(cart, 'PT')).toBe(0);
    });

    test('Paid shipping for single item', () => {
        const cart = [
            { quantity: 1 }
        ];
        
        expect(calculateShipping(cart, 'PT')).toBe(5.00);
        expect(calculateShipping(cart, 'ES')).toBe(8.00);
        expect(calculateShipping(cart, 'DE')).toBe(10.00);
        expect(calculateShipping(cart, 'GB')).toBe(12.00);
    });

    test('Default shipping for unknown country', () => {
        const cart = [{ quantity: 1 }];
        expect(calculateShipping(cart, 'XX')).toBe(20.00);
    });
});

