/* ========================================
   Sandro Sandri - Checkout Page
   ======================================== */

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
}

function renderCheckoutItems(cart) {
    const itemsContainer = document.getElementById('checkout-items');
    const subtotalEl = document.querySelector('.summary-subtotal');
    const totalEl = document.querySelector('.summary-total');

    if (!itemsContainer) return;

    // Calculate total
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Render items
    itemsContainer.innerHTML = cart.map(item => {
        // Get product image - prefer front image (a version) or use stored image
        let productImage = item.image;
        if (!productImage && item.productId && window.ProductsAPI) {
            const product = window.ProductsAPI.getById(item.productId);
            if (product && product.images && product.images.length > 0) {
                // Use front image (first image, which is the "a" version)
                productImage = product.images[0];
            }
        }
        
        return `
        <div class="checkout-item">
            <div class="checkout-item-image">
                ${productImage 
                    ? `<img src="${productImage}" alt="${item.name}">`
                    : `<span>${item.sku}</span>`
                }
            </div>
            <div class="checkout-item-details">
                <p class="checkout-item-name">${item.name}</p>
                <p class="checkout-item-variant">${item.size} / ${item.color} × ${item.quantity}</p>
            </div>
            <div class="checkout-item-price">
                ${window.ProductsAPI.formatPrice(item.price * item.quantity)}
            </div>
        </div>
        `;
    }).join('');

    // Update totals
    if (subtotalEl) subtotalEl.textContent = window.ProductsAPI.formatPrice(total);
    if (totalEl) totalEl.textContent = window.ProductsAPI.formatPrice(total);
}

function initCheckoutForm() {
    const form = document.getElementById('checkout-form');
    if (!form) return;

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


