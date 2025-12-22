/* ========================================
   Sandro Sandri - Checkout Page
   ======================================== */

// Shipping fees by country (in EUR)
const SHIPPING_FEES = {
    // Domestic
    'PT': 5.00, // Portugal
    
    // EU Countries
    'ES': 8.00, // Spain
    'FR': 8.00, // France
    'IT': 8.00, // Italy
    'DE': 10.00, // Germany
    'NL': 10.00, // Netherlands
    'BE': 10.00, // Belgium
    'AT': 10.00, // Austria
    'CH': 12.00, // Switzerland
    
    // UK
    'UK': 12.00, // United Kingdom
    'GB': 12.00, // United Kingdom (ISO code)
    
    // Rest of Europe
    'IE': 12.00, // Ireland
    'DK': 12.00, // Denmark
    'SE': 12.00, // Sweden
    'NO': 15.00, // Norway
    'FI': 12.00, // Finland
    'PL': 12.00, // Poland
    'CZ': 12.00, // Czech Republic
    'GR': 12.00, // Greece
    
    // Rest of World (default)
    'DEFAULT': 20.00
};

const FREE_SHIPPING_THRESHOLD = 100; // €100

document.addEventListener('DOMContentLoaded', () => {
    initCheckout();
});

function initCheckout() {
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

function calculateShipping(subtotal, country) {
    // Free shipping if order is over threshold
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
    
    // Calculate shipping
    const shipping = calculateShipping(subtotal, country);
    
    // Calculate total
    const total = subtotal + shipping;
    
    // Update UI
    const subtotalEl = document.querySelector('.summary-subtotal');
    const shippingEl = document.querySelector('.summary-shipping');
    const totalEl = document.querySelector('.summary-total');
    
    if (subtotalEl) subtotalEl.textContent = window.ProductsAPI.formatPrice(subtotal);
    
    if (shippingEl) {
        if (shipping === 0) {
            shippingEl.textContent = 'Free';
            shippingEl.classList.add('free-shipping');
        } else {
            shippingEl.textContent = window.ProductsAPI.formatPrice(shipping);
            shippingEl.classList.remove('free-shipping');
        }
    }
    
    if (totalEl) totalEl.textContent = window.ProductsAPI.formatPrice(total);
    
    // Show free shipping message if applicable
    const freeShippingMsg = document.querySelector('.free-shipping-message');
    if (subtotal < FREE_SHIPPING_THRESHOLD && shipping > 0) {
        const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
        if (freeShippingMsg) {
            freeShippingMsg.textContent = `Add ${window.ProductsAPI.formatPrice(remaining)} more for free shipping`;
            freeShippingMsg.style.display = 'block';
        }
    } else if (freeShippingMsg) {
        freeShippingMsg.style.display = 'none';
    }
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

        // Simulate processing
        submitBtn.textContent = 'Processing...';
        submitBtn.disabled = true;

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Save order before clearing cart
        if (window.saveOrder) {
            const cartItems = JSON.parse(localStorage.getItem('sandroSandriCart') || '[]');
            window.saveOrder(cartItems);
        }

        // Clear cart
        localStorage.removeItem('sandroSandriCart');

        // Show success message
        document.querySelector('.checkout-layout').innerHTML = `
            <div class="order-success" style="grid-column: span 2; text-align: center; padding: var(--space-xl) 0;">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--color-navy)" stroke-width="1" style="margin-bottom: var(--space-md);">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M8 12l3 3 5-5"/>
                </svg>
                <h2 style="font-family: var(--font-serif); font-size: 2rem; color: var(--color-navy); margin-bottom: var(--space-md);">
                    Thank you for your order
                </h2>
                <p style="font-family: var(--font-serif); color: var(--color-text-light); margin-bottom: var(--space-lg); max-width: 500px; margin-left: auto; margin-right: auto;">
                    Your order has been placed successfully. You will receive a confirmation email shortly with your order details and tracking information.
                </p>
                <a href="collection.html" class="cta-button">Continue Shopping</a>
            </div>
        `;

        // Update cart count in nav
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            cartCount.textContent = '0';
            cartCount.classList.remove('visible');
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


