/* ========================================
   Sandro Sandri - Stripe Checkout Session Creation
   ======================================== */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../../lib/db');

// Shipping configuration
const SHIPPING_FLAT_RATE = parseFloat(process.env.SHIPPING_FLAT_RATE || '20.00'); // Default €20
const FREE_SHIPPING_MIN_QUANTITY = 2; // Free shipping if cart has 2+ items

// Country-based shipping fees (matching checkout.js logic)
const SHIPPING_FEES = {
    'PT': 5.00,   // Portugal
    'ES': 8.00,   // Spain
    'FR': 8.00,   // France
    'IT': 8.00,   // Italy
    'DE': 10.00,  // Germany
    'NL': 10.00,  // Netherlands
    'BE': 10.00,  // Belgium
    'AT': 10.00,  // Austria
    'CH': 12.00,  // Switzerland
    'GB': 12.00,  // United Kingdom
    'UK': 12.00,  // United Kingdom (alternative)
    'DEFAULT': 20.00
};

// Helper to get shipping cost based on cart
function calculateShipping(cart, countryCode) {
    // Check if total quantity >= 2 for free shipping
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    if (totalQuantity >= FREE_SHIPPING_MIN_QUANTITY) {
        return 0;
    }
    
    // Otherwise use country-based shipping fee
    if (countryCode && SHIPPING_FEES[countryCode]) {
        return SHIPPING_FEES[countryCode];
    }
    
    return SHIPPING_FEES['DEFAULT'];
}

const db = require('../../lib/db');

// Validate cart items against inventory
async function validateCartInventory(cart) {
    const inventory = await db.getInventory();
    const errors = [];
    
    for (const item of cart) {
        const productId = item.productId;
        const size = item.size;
        const quantity = item.quantity;
        
        const availableStock = inventory[productId]?.[size] || 0;
        
        if (availableStock < quantity) {
            errors.push({
                productId,
                size,
                requested: quantity,
                available: availableStock,
                productName: item.name
            });
        }
    }
    
    return errors;
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { cart, customerInfo } = req.body;
        
        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            return res.status(400).json({ error: 'INVALID_CART', message: 'Cart is empty or invalid' });
        }
        
        if (!customerInfo || !customerInfo.email) {
            return res.status(400).json({ error: 'MISSING_CUSTOMER_INFO', message: 'Customer email is required' });
        }
        
        // Validate inventory (soft check at checkout creation)
        const inventoryErrors = await validateCartInventory(cart);
        if (inventoryErrors.length > 0) {
            return res.status(400).json({
                error: 'OUT_OF_STOCK',
                message: 'Some items are out of stock',
                details: inventoryErrors
            });
        }
        
        // Calculate totals
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shippingCost = calculateShipping(cart, customerInfo.country);
        const total = subtotal + shippingCost;
        
        // Convert to cents for Stripe
        const totalCents = Math.round(total * 100);
        const shippingCents = Math.round(shippingCost * 100);
        
        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            customer_email: customerInfo.email,
            line_items: cart.map(item => ({
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: item.name,
                        description: `${item.size} / ${item.color}`,
                        images: item.image ? [new URL(item.image, process.env.SITE_URL || 'https://sandro-sandri.vercel.app').href] : []
                    },
                    unit_amount: Math.round(item.price * 100) // Convert to cents
                },
                quantity: item.quantity
            })),
            shipping_address_collection: {
                allowed_countries: ['AC', 'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AT', 'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU', 'WF', 'WS', 'XK', 'YE', 'YT', 'ZA', 'ZM', 'ZW']
            },
            shipping_options: shippingCost > 0 ? [{
                shipping_rate_data: {
                    type: 'fixed_amount',
                    fixed_amount: {
                        amount: shippingCents,
                        currency: 'eur'
                    },
                    display_name: 'Standard Shipping'
                }
            }] : [],
            metadata: {
                cart: JSON.stringify(cart.map(item => ({
                    productId: item.productId,
                    size: item.size,
                    color: item.color,
                    quantity: item.quantity,
                    price: item.price
                }))),
                customerEmail: customerInfo.email,
                customerName: customerInfo.firstName && customerInfo.lastName 
                    ? `${customerInfo.firstName} ${customerInfo.lastName}` 
                    : '',
                shippingCountry: customerInfo.country || ''
            },
            success_url: `${process.env.SITE_URL || 'https://sandro-sandri.vercel.app'}/order-success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.SITE_URL || 'https://sandro-sandri.vercel.app'}/checkout.html?canceled=true`,
            expires_at: Math.floor(Date.now() / 1000) + (30 * 60) // 30 minutes
        });
        
        res.status(200).json({
            sessionId: session.id,
            url: session.url
        });
        
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({
            error: 'PAYMENT_FAILED',
            message: error.message || 'Failed to create checkout session'
        });
    }
};

