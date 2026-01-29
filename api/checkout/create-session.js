/* ========================================
   Sandro Sandri - Stripe Checkout Session Creation
   ======================================== */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../../lib/storage');
const cors = require('../../lib/cors');
const errorHandler = require('../../lib/error-handler');

// Shipping configuration
const SHIPPING_FLAT_RATE = parseFloat(process.env.SHIPPING_FLAT_RATE || '20.00'); // Default €20
const FREE_SHIPPING_MIN_QUANTITY = 2; // Free shipping if cart has 2+ items

// Country-based shipping fees organized by continent
// Portugal: 5€
// Europe: 9.5€
// Americas (North, Central, South): 14.5€
// Africa/Australia/Asia/Oceania: 13.50€
const SHIPPING_FEES = {
    // Portugal: 5€
    'PT': 5.00,
    
    // Europe: 9.5€
    'ES': 9.50,   // Spain
    'FR': 9.50,   // France
    'IT': 9.50,   // Italy
    'DE': 9.50,   // Germany
    'NL': 9.50,   // Netherlands
    'BE': 9.50,   // Belgium
    'AT': 9.50,   // Austria
    'CH': 9.50,   // Switzerland
    'GB': 9.50,   // United Kingdom
    'UK': 9.50,   // United Kingdom (alternative)
    'IE': 9.50,   // Ireland
    'DK': 9.50,   // Denmark
    'SE': 9.50,   // Sweden
    'NO': 9.50,   // Norway
    'FI': 9.50,   // Finland
    'PL': 9.50,   // Poland
    'CZ': 9.50,   // Czech Republic
    'GR': 9.50,   // Greece
    'HU': 9.50,   // Hungary
    'RO': 9.50,   // Romania
    'BG': 9.50,   // Bulgaria
    'HR': 9.50,   // Croatia
    'SK': 9.50,   // Slovakia
    'SI': 9.50,   // Slovenia
    'EE': 9.50,   // Estonia
    'LV': 9.50,   // Latvia
    'LT': 9.50,   // Lithuania
    'LU': 9.50,   // Luxembourg
    'MT': 9.50,   // Malta
    'CY': 9.50,   // Cyprus
    'IS': 9.50,   // Iceland
    'LI': 9.50,   // Liechtenstein
    'MC': 9.50,   // Monaco
    'SM': 9.50,   // San Marino
    'VA': 9.50,   // Vatican City
    'AD': 9.50,   // Andorra
    'RS': 9.50,   // Serbia
    'ME': 9.50,   // Montenegro
    'BA': 9.50,   // Bosnia and Herzegovina
    'MK': 9.50,   // North Macedonia
    'AL': 9.50,   // Albania
    'XK': 9.50,   // Kosovo
    'MD': 9.50,   // Moldova
    'UA': 9.50,   // Ukraine
    'BY': 9.50,   // Belarus
    'RU': 9.50,   // Russia (European part)
    
    // Americas (North, Central, South): 14.5€
    'US': 14.50,  // United States
    'CA': 14.50,  // Canada
    'MX': 14.50,  // Mexico
    'GT': 14.50,  // Guatemala
    'BZ': 14.50,  // Belize
    'SV': 14.50,  // El Salvador
    'HN': 14.50,  // Honduras
    'NI': 14.50,  // Nicaragua
    'CR': 14.50,  // Costa Rica
    'PA': 14.50,  // Panama
    'CU': 14.50,  // Cuba
    'JM': 14.50,  // Jamaica
    'HT': 14.50,  // Haiti
    'DO': 14.50,  // Dominican Republic
    'TT': 14.50,  // Trinidad and Tobago
    'BB': 14.50,  // Barbados
    'BS': 14.50,  // Bahamas
    'AR': 14.50,  // Argentina
    'BR': 14.50,  // Brazil
    'CL': 14.50,  // Chile
    'CO': 14.50,  // Colombia
    'PE': 14.50,  // Peru
    'UY': 14.50,  // Uruguay
    'PY': 14.50,  // Paraguay
    'BO': 14.50,  // Bolivia
    'EC': 14.50,  // Ecuador
    'VE': 14.50,  // Venezuela
    'GY': 14.50,  // Guyana
    'SR': 14.50,  // Suriname
    'GF': 14.50,  // French Guiana
    
    // Africa/Australia/Asia/Oceania: 13.50€
    'AU': 13.50,  // Australia
    'NZ': 13.50,  // New Zealand
    'FJ': 13.50,  // Fiji
    'PG': 13.50,  // Papua New Guinea
    'NC': 13.50,  // New Caledonia
    'PF': 13.50,  // French Polynesia
    'ZA': 13.50,  // South Africa
    'EG': 13.50,  // Egypt
    'MA': 13.50,  // Morocco
    'NG': 13.50,  // Nigeria
    'KE': 13.50,  // Kenya
    'GH': 13.50,  // Ghana
    'ET': 13.50,  // Ethiopia
    'TZ': 13.50,  // Tanzania
    'UG': 13.50,  // Uganda
    'DZ': 13.50,  // Algeria
    'TN': 13.50,  // Tunisia
    'LY': 13.50,  // Libya
    'SD': 13.50,  // Sudan
    'AO': 13.50,  // Angola
    'MZ': 13.50,  // Mozambique
    'ZM': 13.50,  // Zambia
    'ZW': 13.50,  // Zimbabwe
    'BW': 13.50,  // Botswana
    'NA': 13.50,  // Namibia
    'SN': 13.50,  // Senegal
    'CI': 13.50,  // Ivory Coast
    'CM': 13.50,  // Cameroon
    'CN': 13.50,  // China
    'JP': 13.50,  // Japan
    'KR': 13.50,  // South Korea
    'IN': 13.50,  // India
    'ID': 13.50,  // Indonesia
    'TH': 13.50,  // Thailand
    'VN': 13.50,  // Vietnam
    'PH': 13.50,  // Philippines
    'MY': 13.50,  // Malaysia
    'SG': 13.50,  // Singapore
    'HK': 13.50,  // Hong Kong
    'TW': 13.50,  // Taiwan
    'AE': 13.50,  // United Arab Emirates
    'SA': 13.50,  // Saudi Arabia
    'IL': 13.50,  // Israel
    'TR': 13.50,  // Turkey
    'PK': 13.50,  // Pakistan
    'BD': 13.50,  // Bangladesh
    'LK': 13.50,  // Sri Lanka
    
    // Default for other countries: 13.50€ (maximum)
    'DEFAULT': 13.50
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

const db = require('../../lib/storage');

// Validate cart items against inventory
async function validateCartInventory(cart, commerceMode = 'LIVE') {
    const inventoryService = require('../../lib/inventory');
    const errors = [];
    
    for (const item of cart) {
        const productId = item.productId;
        const size = item.size;
        const quantity = item.quantity;
        
        // Determine chapter from product ID
        let chapterId = null;
        if (productId >= 1 && productId <= 5) {
            chapterId = 'chapter-1';
        } else if (productId >= 6 && productId <= 10) {
            chapterId = 'chapter-2';
        }
        
        if (!chapterId) {
            errors.push({
                productId,
                size,
                requested: quantity,
                available: 0,
                productName: item.name,
                error: `Could not determine chapter for product ${productId}`
            });
            continue;
        }
        
        // Get stock from chapter-based inventory
        const availableStock = await inventoryService.getStock(chapterId, productId, size);
        
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
    // Set secure CORS headers (restricted to allowed origins)
    cors.setCORSHeaders(res, req, ['POST', 'OPTIONS']);
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        // Check commerce mode - block checkout in WAITLIST mode
        const db = require('../../lib/storage');
        await db.initDb();
        const settings = await db.getSiteSettings();
        const commerceMode = settings.commerce_mode || 'LIVE';
        
        if (commerceMode === 'WAITLIST') {
            return res.status(403).json({
                error: 'CHECKOUT_DISABLED',
                message: 'Chapter I is not available yet. Join the waitlist to be notified.'
            });
        }
        
        const { cart, customerInfo } = req.body;
        
        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            return res.status(400).json({ error: 'INVALID_CART', message: 'Cart is empty or invalid' });
        }
        
        if (!customerInfo || !customerInfo.email) {
            return res.status(400).json({ error: 'MISSING_CUSTOMER_INFO', message: 'Customer email is required' });
        }
        
        // Validate inventory (soft check at checkout creation) - use correct stock based on mode
        const inventoryErrors = await validateCartInventory(cart, commerceMode);
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
        // SECURITY: Don't expose error details to users
        errorHandler.sendSecureError(res, error, 500, 'Failed to create checkout session. Please try again.', 'PAYMENT_FAILED');
    }
};

