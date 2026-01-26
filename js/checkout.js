/* ========================================
   Sandro Sandri - Checkout Page
   ======================================== */

// Shipping fees by country (in EUR)
// Portugal: 5€
// Europe: 9.5€
// United States/Canada: 14.5€
// Africa/Australia/South America: 13.50€
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
    
    // United States/Canada: 14.5€
    'US': 14.50,  // United States
    'CA': 14.50,  // Canada
    
    // Africa/Australia/South America: 13.50€
    'AU': 13.50,  // Australia
    'NZ': 13.50,  // New Zealand
    'ZA': 13.50,  // South Africa
    'EG': 13.50,  // Egypt
    'MA': 13.50,  // Morocco
    'NG': 13.50,  // Nigeria
    'KE': 13.50,  // Kenya
    'GH': 13.50,  // Ghana
    'AR': 13.50,  // Argentina
    'BR': 13.50,  // Brazil
    'CL': 13.50,  // Chile
    'CO': 13.50,  // Colombia
    'PE': 13.50,  // Peru
    'MX': 13.50,  // Mexico
    'UY': 13.50,  // Uruguay
    'PY': 13.50,  // Paraguay
    'BO': 13.50,  // Bolivia
    'EC': 13.50,  // Ecuador
    'VE': 13.50,  // Venezuela
    
    // Default for other countries: 13.50€
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
async function loadCommerceMode() {
    try {
        const response = await fetch('/api/site-settings/commerce-mode');
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                currentCommerceMode = data.commerce_mode || 'LIVE';
                return currentCommerceMode;
            }
        }
    } catch (error) {
        console.error('Error loading commerce mode:', error);
    }
    return 'LIVE';
}

function initCheckout() {
    // Check commerce mode first
    loadCommerceMode().then(() => {
        if (currentCommerceMode === 'WAITLIST') {
            // Block checkout in WAITLIST mode
            const checkoutContainer = document.querySelector('.checkout-container') || document.body;
            checkoutContainer.innerHTML = `
                <div style="max-width: 600px; margin: 100px auto; padding: var(--space-xl); text-align: center;">
                    <h1 style="font-family: var(--font-serif); font-size: 2rem; color: var(--color-navy); margin-bottom: var(--space-md);">
                        Chapter I is not available yet
                    </h1>
                    <p style="font-family: var(--font-sans); font-size: 1rem; color: var(--color-text); margin-bottom: var(--space-lg);">
                        Join the waitlist to be notified when Chapter I becomes available.
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

    // Update totals when country changes
    const countrySelect = document.getElementById('country');
    if (countrySelect) {
        countrySelect.addEventListener('change', () => {
            updateCheckoutTotals();
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

        // Validate required fields
        if (!customerInfo.email || !customerInfo.firstName || !customerInfo.lastName || 
            !customerInfo.address || !customerInfo.city || !customerInfo.postalCode || !customerInfo.country) {
            alert('Please fill in all required fields');
            return;
        }

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

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to create checkout session');
            }

            // Redirect to Stripe Checkout
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error('No checkout URL received');
            }

        } catch (error) {
            console.error('Checkout error:', error);
            alert(error.message || 'An error occurred. Please try again.');
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


