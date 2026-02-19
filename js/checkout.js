/* ========================================
   Sandro Sandri - Checkout Page
   ======================================== */

// Shipping fees by country (in EUR) organized by continent
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
    'UK': 9.50,   // United Kingdom
    'GB': 9.50,   // United Kingdom (ISO code)
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

const FREE_SHIPPING_MIN_QUANTITY = 2; // Free shipping if cart has 2+ items
const FREE_SHIPPING_THRESHOLD = 100; // €100 (alternative free shipping threshold)

document.addEventListener('DOMContentLoaded', () => {
    initCheckout();
    // Track that user is on checkout page
    if (window.AdminSystem) {
        window.AdminSystem.trackUserSession();
    }
});

// Global commerce mode
let currentCommerceMode = 'LIVE';

// Load commerce mode from server
async function loadChapterMode() {
    try {
        // Wait for ChapterMode to be available
        if (window.ChapterMode) {
            if (!window.ChapterMode.isInitialized) {
                await window.ChapterMode.loadMode();
            }
            return {
                activeChapterId: window.ChapterMode.getActiveChapterId(),
                activeChapterMode: window.ChapterMode.getActiveChapterMode()
            };
        }
        
        // Fallback: fetch directly
        const response = await fetch('/api/chapter-mode');
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                return {
                    activeChapterId: data.activeChapterId,
                    activeChapterMode: data.activeChapterMode || 'add_to_cart'
                };
            }
        }
    } catch (error) {
        console.error('Error loading chapter mode:', error);
    }
    return {
        activeChapterId: null,
        activeChapterMode: 'add_to_cart'
    };
}

function initCheckout() {
    // Check chapter mode first
    loadChapterMode().then((chapterMode) => {
        // Get cart to check which chapters are in it
        const cart = JSON.parse(localStorage.getItem('sandroSandriCart') || '[]');
        const cartChapters = new Set();
        cart.forEach(item => {
            if (item.productId >= 1 && item.productId <= 5) {
                cartChapters.add('chapter-1');
            } else if (item.productId >= 6 && item.productId <= 10) {
                cartChapters.add('chapter-2');
            }
        });
        
        // Check if any chapter in cart is in waitlist mode or not created
        let shouldBlockCheckout = false;
        let blockMessage = '';
        
        if (window.ChapterMode && window.ChapterMode.chapters) {
            for (const chapterId of cartChapters) {
                const chapter = window.ChapterMode.chapters[chapterId];
                if (chapter) {
                    if (!chapter.created) {
                        shouldBlockCheckout = true;
                        blockMessage = `${chapter.name || chapterId.replace('chapter-', 'Chapter ')} is not available yet.`;
                        break;
                    } else if (chapter.mode === 'waitlist') {
                        shouldBlockCheckout = true;
                        blockMessage = `${chapter.name || chapterId.replace('chapter-', 'Chapter ')} is in waitlist mode. Join the waitlist to be notified when it becomes available.`;
                        break;
                    }
                    // If mode is 'add_to_cart' or 'early_access', allow checkout
                }
            }
        }
        
        if (shouldBlockCheckout) {
            // Block checkout
            const checkoutContainer = document.querySelector('.checkout-container') || document.body;
            checkoutContainer.innerHTML = `
                <div style="max-width: 600px; margin: 100px auto; padding: var(--space-xl); text-align: center;">
                    <h1 style="font-family: var(--font-serif); font-size: 2rem; color: var(--color-navy); margin-bottom: var(--space-md);">
                        Checkout Not Available
                    </h1>
                    <p style="font-family: var(--font-sans); font-size: 1rem; color: var(--color-text); margin-bottom: var(--space-lg);">
                        ${blockMessage}
                    </p>
                    <a href="collection.html" style="display: inline-block; padding: var(--space-sm) var(--space-lg); background: var(--color-navy); color: white; text-decoration: none; font-family: var(--font-sans); font-size: 0.875rem; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 2px;">
                        Back to Collection
                    </a>
                </div>
            `;
            return;
        }
        
        // Continue with normal checkout initialization
        initCheckoutNormal();
    });
}

function initCheckoutNormal() {
    // Redirect if cart is empty
    const cart = JSON.parse(localStorage.getItem('sandroSandriCart') || '[]');
    if (cart.length === 0) {
        window.location.href = 'cart.html';
        return;
    }

    renderCheckoutItems(cart);
    initCheckoutForm();
    
    // Initial totals update
    updateCheckoutTotals();
}

function renderCheckoutItems(cart) {
    const itemsContainer = document.getElementById('checkout-items');
    if (!itemsContainer) return;

    // Render items
    itemsContainer.innerHTML = cart.map((item, index) => {
        // Get product image - prefer front image (a version) or use stored image
        let productImage = item.image;
        if (!productImage && item.productId && window.ProductsAPI) {
            const product = window.ProductsAPI.getById(item.productId);
            if (product && product.images && product.images.length > 0) {
                // Use front image (first image, which is the "a" version)
                productImage = product.images[0];
            }
        }
        
        const productUrl = `product.html?id=${item.productId}`;
        
        return `
        <div class="checkout-item">
            <a href="${productUrl}" class="checkout-item-image">
                ${productImage 
                    ? `<img src="${productImage}" alt="${item.name}">`
                    : `<span>${item.sku}</span>`
                }
            </a>
            <div class="checkout-item-details">
                <a href="${productUrl}" class="checkout-item-name">${item.name}</a>
                <p class="checkout-item-variant">${item.size} / ${item.color} × ${item.quantity}</p>
                <div class="checkout-item-actions">
                    <button class="edit-item" data-index="${index}" data-product-id="${item.productId}">Edit</button>
                </div>
            </div>
            <div class="checkout-item-price">
                ${window.ProductsAPI.formatPrice(item.price * item.quantity)}
            </div>
        </div>
        `;
    }).join('');

    // Add edit button event listeners
    itemsContainer.querySelectorAll('.edit-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const index = parseInt(btn.dataset.index);
            const productId = parseInt(btn.dataset.productId);
            if (window.cart && window.cart.openEditModal) {
                window.cart.openEditModal(index, productId);
            }
        });
    });

    // Update totals
    updateCheckoutTotals();
}

function calculateShipping(subtotal, country, cart) {
    // Get cart if not provided
    if (!cart) {
        cart = JSON.parse(localStorage.getItem('sandroSandriCart') || '[]');
    }
    
    // Calculate total quantity
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    // Free shipping if cart has 2+ items (t-shirts)
    if (totalQuantity >= FREE_SHIPPING_MIN_QUANTITY) {
        return 0;
    }
    
    // Alternative: Free shipping if order is over threshold
    if (subtotal >= FREE_SHIPPING_THRESHOLD) {
        return 0;
    }

    // Calculate shipping based on country
    if (!country) {
        return 0; // No shipping fee until country is selected
    }

    return SHIPPING_FEES[country] || SHIPPING_FEES['DEFAULT'];
}

// Make function globally accessible
window.updateCheckoutTotals = function() {
    const cart = JSON.parse(localStorage.getItem('sandroSandriCart') || '[]');
    const country = document.getElementById('country')?.value || '';
    
    // Calculate subtotal
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Calculate total quantity
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    // Calculate shipping
    const shipping = calculateShipping(subtotal, country, cart);
    
    // Calculate total
    const total = subtotal + shipping;
    
    // Update UI
    const subtotalEl = document.querySelector('.summary-subtotal');
    const shippingEl = document.querySelector('.summary-shipping');
    const totalEl = document.querySelector('.summary-total');
    
    if (subtotalEl) subtotalEl.textContent = window.ProductsAPI.formatPrice(subtotal);
    
    if (shippingEl) {
        // Always show "Select country" if no country is selected, regardless of order total
        if (!country || country.trim() === '') {
            shippingEl.textContent = 'Select country';
            shippingEl.classList.remove('free-shipping');
        } else if (shipping === 0) {
            // Show "Free" if shipping is 0 (either 2+ items or over threshold)
            shippingEl.textContent = 'Free';
            shippingEl.classList.add('free-shipping');
        } else {
            shippingEl.textContent = window.ProductsAPI.formatPrice(shipping);
            shippingEl.classList.remove('free-shipping');
        }
    }
    
    if (totalEl) totalEl.textContent = window.ProductsAPI.formatPrice(total);
};

// Make function globally accessible
window.renderCheckoutItems = renderCheckoutItems;

function initCheckoutForm() {
    const form = document.getElementById('checkout-form');
    if (!form) return;

    const paymentSection = document.getElementById('payment-section');
    const paymentPageBtn = document.getElementById('payment-page-btn');
    const placeOrderBtn = document.getElementById('place-order-btn');
    
    // Required checkout fields (contact + shipping)
    const requiredCheckoutFields = ['email', 'firstName', 'lastName', 'address', 'city', 'postalCode', 'country'];
    
    // Required payment fields
    const requiredPaymentFields = ['cardNumber', 'cardExpiry', 'cardCVC', 'cardholderName'];
    
    // Function to check if checkout info is complete
    function checkCheckoutInfoComplete() {
        return requiredCheckoutFields.every(fieldId => {
            const field = document.getElementById(fieldId);
            return field && field.value.trim() !== '';
        });
    }
    
    // Function to check if payment info is complete
    function checkPaymentInfoComplete() {
        return requiredPaymentFields.every(fieldId => {
            const field = document.getElementById(fieldId);
            return field && field.value.trim() !== '';
        });
    }
    
    // Track if user has opened the payment section (so we don't hide it while they type)
    let paymentSectionRevealed = false;
    
    // Function to update button visibility
    function updateButtonVisibility() {
        const checkoutComplete = checkCheckoutInfoComplete();
        const paymentComplete = checkPaymentInfoComplete();
        
        if (paymentComplete) {
            // Payment info complete - show Place Order button
            if (paymentPageBtn) paymentPageBtn.style.display = 'none';
            if (placeOrderBtn) placeOrderBtn.style.display = 'block';
            if (paymentSection) paymentSection.style.display = 'block';
        } else if (checkoutComplete) {
            // Checkout info complete - show Payment Page button until they open payment; then keep payment section visible
            if (paymentPageBtn) paymentPageBtn.style.display = paymentSectionRevealed ? 'none' : 'block';
            if (placeOrderBtn) placeOrderBtn.style.display = paymentComplete ? 'block' : 'none';
            // Never hide payment section once it has been revealed (user clicked "Payment Page") so typing doesn't close it
            if (paymentSection) paymentSection.style.display = paymentSectionRevealed ? 'block' : 'none';
        } else {
            // Nothing complete - hide both buttons and payment section
            if (paymentPageBtn) paymentPageBtn.style.display = 'none';
            if (placeOrderBtn) placeOrderBtn.style.display = 'none';
            if (paymentSection) paymentSection.style.display = 'none';
        }
    }
    
    // Listen to all form field changes
    const allFields = [...requiredCheckoutFields, ...requiredPaymentFields];
    allFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', updateButtonVisibility);
            field.addEventListener('change', updateButtonVisibility);
        }
    });
    
    // Payment Page button click handler
    if (paymentPageBtn) {
        paymentPageBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Validate checkout info
            if (!checkCheckoutInfoComplete()) {
                alert('Please fill in all required checkout information');
                return;
            }
            
            paymentSectionRevealed = true;
            
            // Show payment section
            if (paymentSection) {
                paymentSection.style.display = 'block';
                paymentSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            
            // Hide Payment Page button, show Place Order button (will be enabled when payment info is filled)
            paymentPageBtn.style.display = 'none';
            if (placeOrderBtn) placeOrderBtn.style.display = 'block';
        });
    }
    
    // Format card number input
    const cardNumberInput = document.getElementById('cardNumber');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\s/g, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            if (formattedValue.length <= 19) {
                e.target.value = formattedValue;
            }
            updateButtonVisibility();
        });
    }
    
    // Format expiry date input
    const cardExpiryInput = document.getElementById('cardExpiry');
    if (cardExpiryInput) {
        cardExpiryInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
            updateButtonVisibility();
        });
    }
    
    // Format CVC input (numbers only)
    const cardCVCInput = document.getElementById('cardCVC');
    if (cardCVCInput) {
        cardCVCInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
            updateButtonVisibility();
        });
    }
    
    // Initial button visibility check
    updateButtonVisibility();

    // Update totals when country changes
    const countrySelect = document.getElementById('country');
    if (countrySelect) {
        countrySelect.addEventListener('change', () => {
            updateCheckoutTotals();
            updateButtonVisibility();
        });
    }

    // Update totals when cart changes (e.g., after editing)
    window.addEventListener('storage', (e) => {
        if (e.key === 'sandroSandriCart') {
            updateCheckoutTotals();
            renderCheckoutItems(JSON.parse(localStorage.getItem('sandroSandriCart') || '[]'));
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('.place-order-btn');
        const originalText = submitBtn.textContent;

        // Get form data
        const formData = new FormData(form);
        const customerInfo = {
            email: formData.get('email'),
            phone: formData.get('phone'),
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            address: formData.get('address'),
            apartment: formData.get('apartment'),
            city: formData.get('city'),
            postalCode: formData.get('postalCode'),
            country: formData.get('country')
        };

        // Get cart
        const cart = JSON.parse(localStorage.getItem('sandroSandriCart') || '[]');
        
        if (cart.length === 0) {
            alert('Your cart is empty');
            return;
        }

        // Validate required checkout fields
        if (!customerInfo.email || !customerInfo.firstName || !customerInfo.lastName || 
            !customerInfo.address || !customerInfo.city || !customerInfo.postalCode || !customerInfo.country) {
            alert('Please fill in all required checkout information');
            return;
        }
        
        // Validate required payment fields
        const cardNumber = formData.get('cardNumber');
        const cardExpiry = formData.get('cardExpiry');
        const cardCVC = formData.get('cardCVC');
        const cardholderName = formData.get('cardholderName');
        
        if (!cardNumber || !cardExpiry || !cardCVC || !cardholderName) {
            alert('Please fill in all payment information');
            return;
        }
        
        // Add payment info to customerInfo (for reference, but Stripe handles actual payment)
        customerInfo.payment = {
            cardNumber: cardNumber.replace(/\s/g, ''),
            cardExpiry: cardExpiry,
            cardCVC: cardCVC,
            cardholderName: cardholderName
        };

        // Update button state
        submitBtn.textContent = 'Processing...';
        submitBtn.disabled = true;

        // Track checkout start
        if (window.ActivityTracker) {
            window.ActivityTracker.trackCheckoutStart(cart);
        }

        try {
            // Create Stripe checkout session
            const response = await fetch('/api/checkout/create-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cart: cart,
                    customerInfo: customerInfo
                })
            });

            const text = await response.text();
            let data = null;
            try {
                data = text ? JSON.parse(text) : null;
            } catch (parseError) {
                console.error('Checkout response was not JSON:', parseError);
                throw new Error('Payment is temporarily unavailable. Please try again later.');
            }

            if (!response.ok) {
                const msg = (data && data.message) ? data.message : 'Failed to create checkout session.';
                throw new Error(msg);
            }

            if (!data || !data.url) {
                throw new Error('No checkout URL received. Please try again.');
            }

            window.location.href = data.url;

        } catch (error) {
            console.error('Checkout error:', error);
            // Never show raw JSON parse / "expected pattern" errors to the user
            const isParseError = error instanceof SyntaxError ||
                (error && error.message && (error.message.includes('expected pattern') || error.message.includes('JSON')));
            const message = isParseError
                ? 'Payment is temporarily unavailable. Please try again later or contact us.'
                : (error.message || 'An error occurred. Please try again.');
            alert(message);
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    // Format card number input
    const cardInput = document.getElementById('cardNumber');
    if (cardInput) {
        cardInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
            let formatted = value.match(/.{1,4}/g)?.join(' ') || '';
            e.target.value = formatted.substring(0, 19);
        });
    }

    // Format expiry input
    const expiryInput = document.getElementById('expiry');
    if (expiryInput) {
        expiryInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
        });
    }

    // Format CVV input
    const cvvInput = document.getElementById('cvv');
    if (cvvInput) {
        cvvInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
        });
    }
}


