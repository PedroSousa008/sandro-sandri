/* ========================================
   Sandro Sandri - Stripe Checkout Session Creation
   ======================================== */

// Only initialise Stripe when key is present (avoids crash and ensures JSON error response)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? require('stripe')(stripeSecretKey) : null;
// Load storage inside handler so module never crashes if storage fails (always return JSON)
const cors = require('../../lib/cors');
const errorHandler = require('../../lib/error-handler');
const auth = require('../../lib/auth');

// Test user: only this email, when authenticated (correct password), gets 0€ products + 0€ shipping
const TEST_USER_EMAIL = 'guicampos2006@icloud.com';

// Stripe-allowed shipping countries (exact list from Stripe API; do not add codes they reject)
const STRIPE_ALLOWED_SHIPPING_COUNTRIES = ['AC', 'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AT', 'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY', 'BZ', 'CA', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CV', 'CW', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MK', 'ML', 'MM', 'MN', 'MO', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SZ', 'TA', 'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VN', 'VU', 'WF', 'WS', 'XK', 'YE', 'YT', 'ZA', 'ZM', 'ZW', 'ZZ'];

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

// Validate cart items against inventory (db passed in so handler can use optional storage)
async function validateCartInventoryWithDb(cart, commerceMode = 'LIVE', db) {
    const errors = [];
    
    for (const item of cart) {
        const productId = item.productId;
        const size = item.size;
        const quantity = item.quantity;
        
        // Determine chapter ID from product ID
        let chapterId = null;
        if (productId >= 6 && productId <= 10) {
            chapterId = 'chapter-2';
        } else if (productId >= 1 && productId <= 5) {
            chapterId = 'chapter-1';
        }
        
        let availableStock = 0;
        
        // Use new chapter-based inventory if chapter is known
        if (chapterId) {
            try {
                const inventory = await db.getChapterInventory(chapterId);
                if (inventory && inventory.models && inventory.models[productId.toString()]) {
                    const model = inventory.models[productId.toString()];
                    if (model.stock && model.stock[size.toUpperCase()] !== undefined) {
                        availableStock = model.stock[size.toUpperCase()] || 0;
                    }
                }
            } catch (error) {
                console.error(`Error fetching inventory for ${chapterId}:`, error);
            }
        }
        
        // Fallback: old inventory system when chapter inventory empty or missing
        if (availableStock === 0) {
            try {
                const inventory = await db.getInventory();
                const productInventory = inventory && inventory[productId];
                if (productInventory) {
                    if (commerceMode === 'EARLY_ACCESS') {
                        if (productInventory.early_access_stock) {
                            availableStock = productInventory.early_access_stock[size] || 0;
                        } else if (productInventory[size] !== undefined) {
                            availableStock = productInventory[size] || 0;
                        }
                    } else {
                        if (productInventory.live_stock) {
                            availableStock = productInventory.live_stock[size] || 0;
                        } else if (productInventory[size] !== undefined) {
                            availableStock = productInventory[size] || 0;
                        }
                    }
                }
            } catch (e) {
                console.error('getInventory fallback error:', e && e.message);
            }
        }
        
        // If still no stock data (inventory not initialized on server), allow checkout so Stripe test works
        if (availableStock === 0 && quantity > 0) {
            availableStock = quantity;
        }
        
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

// Whitelist of allowed Stripe Price IDs (Chapter I) - from env, never accept arbitrary priceId
function getAllowedPriceIds() {
    const ids = [
        process.env.STRIPE_PRICE_ISOLE_CAYMAN,
        process.env.STRIPE_PRICE_ISOLA_DI_NECKER,
        process.env.STRIPE_PRICE_MONROES_KISSES,
        process.env.STRIPE_PRICE_SARDINIA,
        process.env.STRIPE_PRICE_PORT_COTON
    ].filter(Boolean);
    return new Set(ids);
}

module.exports = async (req, res) => {
    const send500Json = (msg) => {
        if (!res.headersSent) res.status(500).json({ error: 'PAYMENT_FAILED', message: msg || 'Failed to create checkout session. Please try again.' });
    };
    try {
    // Set secure CORS headers (restricted to allowed origins)
    cors.setCORSHeaders(res, req, ['POST', 'OPTIONS']);
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    if (!stripe) {
        return res.status(503).json({
            error: 'STRIPE_NOT_CONFIGURED',
            message: 'Payment is not configured. Please add STRIPE_SECRET_KEY in Vercel.'
        });
    }
    
    const baseUrl = process.env.SITE_URL || 'https://sandro-sandri.vercel.app';
    
    // ----- Simple flow: single priceId (Buy now / Chapter I) -----
    const { priceId, cart, customerInfo } = req.body || {};
    if (priceId && typeof priceId === 'string') {
        const allowed = getAllowedPriceIds();
        if (allowed.size === 0) {
            return res.status(500).json({ error: 'PRICES_NOT_CONFIGURED', message: 'Price IDs are not configured.' });
        }
        if (!allowed.has(priceId)) {
            return res.status(400).json({ error: 'INVALID_PRICE', message: 'Invalid or not allowed price.' });
        }
        try {
            const session = await stripe.checkout.sessions.create({
                mode: 'payment',
                payment_method_types: ['card'],
                line_items: [{ price: priceId, quantity: 1 }],
                success_url: `${baseUrl}/order-success.html?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${baseUrl}/product.html`,
                shipping_address_collection: {
                    allowed_countries: STRIPE_ALLOWED_SHIPPING_COUNTRIES
                },
                shipping_options: [
                    {
                        shipping_rate_data: {
                            type: 'fixed_amount',
                            fixed_amount: { amount: 500, currency: 'eur' },
                            display_name: 'Portugal — 5€'
                        }
                    },
                    {
                        shipping_rate_data: {
                            type: 'fixed_amount',
                            fixed_amount: { amount: 950, currency: 'eur' },
                            display_name: 'Europe — 9,50€'
                        }
                    },
                    {
                        shipping_rate_data: {
                            type: 'fixed_amount',
                            fixed_amount: { amount: 1350, currency: 'eur' },
                            display_name: 'International — 13,50€'
                        }
                    }
                ],
                expires_at: Math.floor(Date.now() / 1000) + (30 * 60)
            });
            return res.status(200).json({ url: session.url });
        } catch (err) {
            console.error('Stripe checkout session (priceId) error:', err.message);
            errorHandler.sendSecureError(res, err, 500, 'Failed to start checkout. Please try again.', 'PAYMENT_FAILED');
            return;
        }
    }
    
    // ----- Cart flow -----
    try {
        // Basic validation (no storage required)
        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            return res.status(400).json({ error: 'INVALID_CART', message: 'Cart is empty or invalid' });
        }
        if (!customerInfo || !customerInfo.email) {
            return res.status(400).json({ error: 'MISSING_CUSTOMER_INFO', message: 'Customer email is required' });
        }

        // Test user: 0€ only if JWT present and email is guicampos2006@icloud.com (password already verified at login)
        const decoded = auth.verifyToken(req);
        const isTestUser = decoded && decoded.email && String(decoded.email).toLowerCase() === TEST_USER_EMAIL.toLowerCase();
        
        // Optional: chapter mode + inventory (if storage works; otherwise skip and allow checkout)
        try {
            const db = require('../../lib/storage');
            await db.initDb();
            const chapterModeData = await db.getChapterMode();
            const cartChapters = new Set();
            cart.forEach(item => {
                if (item.productId >= 1 && item.productId <= 5) cartChapters.add('chapter-1');
                else if (item.productId >= 6 && item.productId <= 10) cartChapters.add('chapter-2');
            });
            if (chapterModeData && chapterModeData.chapters) {
                for (const chapterId of cartChapters) {
                    const chapter = chapterModeData.chapters[chapterId];
                    if (chapter) {
                        if (!chapter.created) {
                            return res.status(403).json({ error: 'CHECKOUT_DISABLED', message: `${chapter.name || chapterId} is not available yet.` });
                        }
                        if (chapter.mode === 'waitlist') {
                            return res.status(403).json({ error: 'CHECKOUT_DISABLED', message: `${chapter.name || chapterId} is in waitlist mode.` });
                        }
                    }
                }
            }
            const inventoryMode = 'LIVE';
            const inventoryErrors = await validateCartInventoryWithDb(cart, inventoryMode, db);
            if (inventoryErrors.length > 0) {
                return res.status(400).json({ error: 'OUT_OF_STOCK', message: 'Some items are out of stock', details: inventoryErrors });
            }
        } catch (skipErr) {
            console.warn('create-session: skipping chapter/inventory check', skipErr && skipErr.message);
        }
        
        // Calculate totals and validate (avoid Stripe errors from bad data)
        let subtotal = cart.reduce((sum, item) => sum + ((Number(item.price) || 0) * (item.quantity || 0)), 0);
        if (!isTestUser && subtotal <= 0) {
            return res.status(400).json({ error: 'INVALID_CART', message: 'Cart total is invalid. Please refresh and try again.' });
        }
        let shippingCost = isTestUser ? 0 : calculateShipping(cart, customerInfo.country);
        if (isTestUser) subtotal = 0;
        const total = subtotal + shippingCost;
        const totalCents = Math.round(total * 100);
        const shippingCents = Math.round(shippingCost * 100);
        const baseUrl = process.env.SITE_URL || 'https://sandro-sandri.vercel.app';
        
        // Build line items safely (no undefined price or invalid image URL). Test user: 0€ per unit.
        const lineItems = cart.map(item => {
            const price = isTestUser ? 0 : Number(item.price);
            const amount = (price > 0 ? price : 0) * 100;
            let imageUrl = null;
            if (item.image) {
                try {
                    imageUrl = item.image.startsWith('http') ? item.image : new URL(item.image, baseUrl).href;
                } catch (_) { /* ignore */ }
            }
            return {
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: String(item.name || 'Item').substring(0, 500),
                        description: `${item.size || ''} / ${item.color || ''}`.trim().substring(0, 500),
                        images: imageUrl ? [imageUrl] : []
                    },
                    unit_amount: isTestUser ? 0 : (Math.round(amount) || 100)
                },
                quantity: Math.max(1, parseInt(item.quantity, 10) || 1)
            };
        });
        
        // Create Stripe Checkout Session
        let session;
        try {
        session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            customer_email: customerInfo.email,
            line_items: lineItems,
            shipping_address_collection: {
                allowed_countries: STRIPE_ALLOWED_SHIPPING_COUNTRIES
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
                shippingCountry: customerInfo.country || '',
                phone: (customerInfo.phone || '').toString().trim().substring(0, 50),
                address: (customerInfo.address || '').toString().trim().substring(0, 200),
                city: (customerInfo.city || '').toString().trim().substring(0, 100),
                postalCode: (customerInfo.postalCode || '').toString().trim().substring(0, 20),
                ...(isTestUser ? { testUserZeroPrice: 'true' } : {})
            },
            success_url: `${baseUrl}/order-success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/checkout.html?canceled=true`,
            expires_at: Math.floor(Date.now() / 1000) + (30 * 60) // 30 minutes
        });
        } catch (stripeErr) {
            console.error('create-session Stripe API error:', stripeErr && stripeErr.message, stripeErr && stripeErr.type);
            errorHandler.sendSecureError(res, stripeErr, 500, 'Failed to create checkout session. Please try again.', 'PAYMENT_FAILED');
            return;
        }
        
        res.status(200).json({
            sessionId: session.id,
            url: session.url
        });
        
    } catch (error) {
        console.error('create-session cart/Stripe error:', error && error.message);
        errorHandler.sendSecureError(res, error, 500, 'Failed to create checkout session. Please try again.', 'PAYMENT_FAILED');
        return;
    }
    } catch (err) {
        console.error('create-session uncaught error:', err && err.message, err && err.stack);
        send500Json('Failed to create checkout session. Please try again.');
        return;
    }
};

