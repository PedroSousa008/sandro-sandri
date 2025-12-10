/* ========================================
   Sandro Sandri - Shopping Cart
   ======================================== */

class ShoppingCart {
    constructor() {
        this.items = this.loadCart();
        this.init();
    }

    init() {
        this.updateCartUI();
        this.bindEvents();
    }

    // Load cart from localStorage
    loadCart() {
        const savedCart = localStorage.getItem('sandroSandriCart');
        return savedCart ? JSON.parse(savedCart) : [];
    }

    // Save cart to localStorage
    saveCart() {
        localStorage.setItem('sandroSandriCart', JSON.stringify(this.items));
    }

    // Add item to cart
    addItem(productId, size = null, color = null, quantity = 1) {
        const product = window.ProductsAPI.getById(productId);
        if (!product) return false;

        const existingItem = this.items.find(item => 
            item.productId === productId && 
            item.size === size && 
            item.color === color
        );

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.items.push({
                productId,
                name: product.name,
                price: product.price,
                size: size || product.sizes[0],
                color: color || product.colors[0]?.name,
                quantity,
                sku: product.sku,
                image: product.images && product.images.length > 0 ? product.images[0] : null
            });
        }

        this.saveCart();
        this.updateCartUI();
        this.showNotification(`${product.name} added to cart`);
        return true;
    }

    // Remove item from cart
    removeItem(index) {
        if (index >= 0 && index < this.items.length) {
            const removedItem = this.items.splice(index, 1)[0];
            this.saveCart();
            this.updateCartUI();
            this.showNotification(`${removedItem.name} removed from cart`);
        }
    }

    // Update item quantity
    updateQuantity(index, quantity) {
        if (index >= 0 && index < this.items.length) {
            if (quantity <= 0) {
                this.removeItem(index);
            } else {
                this.items[index].quantity = quantity;
                this.saveCart();
                this.updateCartUI();
            }
        }
    }

    // Get cart total
    getTotal() {
        return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    // Get item count
    getItemCount() {
        return this.items.reduce((count, item) => count + item.quantity, 0);
    }

    // Clear cart
    clearCart() {
        this.items = [];
        this.saveCart();
        this.updateCartUI();
    }

    // Update cart UI
    updateCartUI() {
        // Update cart count
        const cartCountElements = document.querySelectorAll('.cart-count');
        const itemCount = this.getItemCount();
        
        cartCountElements.forEach(el => {
            el.textContent = itemCount;
            el.classList.toggle('visible', itemCount > 0);
        });

        // Update cart drawer
        this.renderCartDrawer();

        // Update cart page if exists
        if (document.querySelector('.cart-page')) {
            this.renderCartPage();
        }
    }

    // Render cart drawer
    renderCartDrawer() {
        const cartItems = document.querySelector('.cart-drawer .cart-items');
        const cartEmpty = document.querySelector('.cart-drawer .cart-empty');
        const subtotalAmount = document.querySelector('.subtotal-amount');

        if (!cartItems) return;

        if (this.items.length === 0) {
            cartItems.innerHTML = '';
            if (cartEmpty) cartEmpty.style.display = 'block';
        } else {
            if (cartEmpty) cartEmpty.style.display = 'none';
            cartItems.innerHTML = this.items.map((item, index) => `
                <div class="cart-item" data-index="${index}">
                    <div class="cart-item-image">
                        ${item.image ? `<img src="${item.image}" alt="${item.name}">` : item.sku}
                    </div>
                    <div class="cart-item-details">
                        <h4 class="cart-item-name">${item.name}</h4>
                        <p class="cart-item-price">${window.ProductsAPI.formatPrice(item.price)}</p>
                        <p class="cart-item-variant">${item.size} / ${item.color}</p>
                        <div class="cart-item-actions">
                            <div class="quantity-selector">
                                <button class="quantity-btn minus" data-index="${index}">−</button>
                                <span class="quantity-value">${item.quantity}</span>
                                <button class="quantity-btn plus" data-index="${index}">+</button>
                            </div>
                            <button class="remove-item" data-index="${index}">Remove</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        if (subtotalAmount) {
            subtotalAmount.textContent = window.ProductsAPI.formatPrice(this.getTotal());
        }
    }

    // Render cart page
    renderCartPage() {
        const cartContainer = document.querySelector('.cart-items-container');
        const cartSummary = document.querySelector('.cart-summary');
        const emptyCart = document.querySelector('.empty-cart-message');

        if (!cartContainer) return;

        if (this.items.length === 0) {
            cartContainer.innerHTML = '';
            if (emptyCart) emptyCart.style.display = 'block';
            if (cartSummary) cartSummary.style.display = 'none';
        } else {
            if (emptyCart) emptyCart.style.display = 'none';
            if (cartSummary) cartSummary.style.display = 'block';

            cartContainer.innerHTML = this.items.map((item, index) => `
                <div class="cart-page-item" data-index="${index}">
                    <div class="cart-page-item-image">
                        ${item.image ? `<img src="${item.image}" alt="${item.name}">` : `<div class="image-placeholder">${item.sku}</div>`}
                    </div>
                    <div class="cart-page-item-details">
                        <h3 class="cart-page-item-name">${item.name}</h3>
                        <p class="cart-page-item-variant">Size: ${item.size} | Color: ${item.color}</p>
                        <div class="cart-page-item-quantity">
                            <div class="quantity-selector">
                                <button class="quantity-btn minus" data-index="${index}">−</button>
                                <span class="quantity-value">${item.quantity}</span>
                                <button class="quantity-btn plus" data-index="${index}">+</button>
                            </div>
                        </div>
                    </div>
                    <div class="cart-page-item-price">
                        <p class="item-total">${window.ProductsAPI.formatPrice(item.price * item.quantity)}</p>
                        <button class="remove-item" data-index="${index}">Remove</button>
                    </div>
                </div>
            `).join('');

            // Update summary
            const subtotal = document.querySelector('.summary-subtotal');
            const total = document.querySelector('.summary-total');
            if (subtotal) subtotal.textContent = window.ProductsAPI.formatPrice(this.getTotal());
            if (total) total.textContent = window.ProductsAPI.formatPrice(this.getTotal());
        }
    }

    // Bind events
    bindEvents() {
        // Quick add buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-add')) {
                const productId = e.target.dataset.productId;
                this.addItem(parseInt(productId));
            }
        });

        // Quantity buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quantity-btn')) {
                const index = parseInt(e.target.dataset.index);
                const currentQty = this.items[index].quantity;
                
                if (e.target.classList.contains('plus')) {
                    this.updateQuantity(index, currentQty + 1);
                } else if (e.target.classList.contains('minus')) {
                    this.updateQuantity(index, currentQty - 1);
                }
            }
        });

        // Remove buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-item')) {
                const index = parseInt(e.target.dataset.index);
                this.removeItem(index);
            }
        });

        // Add to cart form (product page)
        const addToCartForm = document.querySelector('.add-to-cart-form');
        if (addToCartForm) {
            addToCartForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const productId = parseInt(addToCartForm.dataset.productId);
                const size = addToCartForm.querySelector('[name="size"]')?.value;
                const color = addToCartForm.querySelector('[name="color"]')?.value;
                const quantity = parseInt(addToCartForm.querySelector('[name="quantity"]')?.value) || 1;
                
                this.addItem(productId, size, color, quantity);
            });
        }
    }

    // Show notification
    showNotification(message) {
        // Remove existing toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        // Create new toast
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('visible');
        });

        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }
}

// Initialize cart when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.cart = new ShoppingCart();
});


