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
        
        // Listen for cart sync events
        window.addEventListener('cartSynced', (e) => {
            console.log('Cart synced event received:', e.detail);
            this.items = e.detail || [];
            this.updateCartUI();
        });
        
        // Listen for storage events (cross-tab sync)
        window.addEventListener('storage', (e) => {
            if (e.key === 'sandroSandriCart') {
                console.log('Cart storage event received');
                this.items = e.newValue ? JSON.parse(e.newValue) : [];
                this.updateCartUI();
            }
        });
        
        // Listen for custom cart updated event
        window.addEventListener('cartUpdated', () => {
            console.log('Cart updated event received');
            this.items = this.loadCart();
            this.updateCartUI();
        });
    }

    // Load cart from localStorage (API sync happens via user-sync.js)
    loadCart() {
        const savedCart = localStorage.getItem('sandroSandriCart');
        return savedCart ? JSON.parse(savedCart) : [];
    }

    // Save cart to localStorage
    saveCart() {
        // Update UI immediately (optimistic update - feels instant)
        localStorage.setItem('sandroSandriCart', JSON.stringify(this.items));
        
        // Sync to server immediately (non-blocking - doesn't slow down user)
        if (window.userSync && window.userSync.userEmail) {
            // Fire and forget - user sees instant feedback, sync happens in background
            window.userSync.forceSync().catch(() => {}); // Ignore errors for speed
        }
    }

    // Add item to cart
    addItem(productId, size = null, color = null, quantity = 1) {
        // Prevent rapid duplicate calls
        const callKey = `${productId}-${size}-${color}-${Date.now()}`;
        if (this._lastAddCall && Date.now() - this._lastAddCall.time < 500 && this._lastAddCall.key === `${productId}-${size}-${color}`) {
            console.log('Duplicate addItem call prevented');
            return false;
        }
        this._lastAddCall = { key: `${productId}-${size}-${color}`, time: Date.now() };
        
        const product = window.ProductsAPI.getById(productId);
        if (!product) return false;

        // Ensure quantity is a valid number
        quantity = parseInt(quantity) || 1;
        if (quantity < 1) quantity = 1;

        // Normalize size and color values for comparison
        const normalizedSize = (size || product.sizes[0] || '').toString().trim();
        const normalizedColor = (color || product.colors[0]?.name || '').toString().trim();

        // Check inventory BEFORE adding to cart
        if (window.InventoryAPI) {
            // Ensure inventory is initialized
            if (window.InventoryAPI.init) {
                window.InventoryAPI.init();
            }
            
            // First check if size is in stock at all
            const inStock = window.InventoryAPI.isInStock(productId, normalizedSize);
            if (!inStock) {
                this.showNotification(`${product.name} - Size ${normalizedSize} is sold out`);
                return false;
            }
            
            // Get available stock from inventory
            const availableStock = window.InventoryAPI.get(productId, normalizedSize);
            
            // If no stock available, block
            if (availableStock <= 0) {
                this.showNotification(`${product.name} - Size ${normalizedSize} is sold out`);
                return false;
            }
            
            // Find existing item in cart to calculate total quantity
            const existingItem = this.items.find(item => {
                const itemSize = (item.size || '').toString().trim();
                const itemColor = (item.color || '').toString().trim();
                return item.productId === productId && 
                       itemSize === normalizedSize && 
                       itemColor === normalizedColor;
            });
            
            const currentCartQuantity = existingItem ? existingItem.quantity : 0;
            const requestedTotal = currentCartQuantity + quantity;
            
            // Only block if the total requested exceeds available stock
            // This allows normal purchases (1, 2, etc.) but blocks excessive quantities (51 when only 50 available)
            if (requestedTotal > availableStock) {
                const maxCanAdd = availableStock - currentCartQuantity;
                if (maxCanAdd <= 0) {
                    this.showNotification(`${product.name} - Size ${normalizedSize} is sold out (${currentCartQuantity} already in cart)`);
                } else {
                    this.showNotification(`Only ${availableStock} available in size ${normalizedSize}. You can add ${maxCanAdd} more (${currentCartQuantity} already in cart)`);
                }
                return false; // BLOCK the action - don't add to cart
            }
            
            // If we get here, the quantity is valid - proceed with adding to cart
        }

        // Find existing item with matching productId, size, and color
        const existingItem = this.items.find(item => {
            const itemSize = (item.size || '').toString().trim();
            const itemColor = (item.color || '').toString().trim();
            return item.productId === productId && 
                   itemSize === normalizedSize && 
                   itemColor === normalizedColor;
        });

        if (existingItem) {
            // Update quantity of existing item
            const oldQuantity = existingItem.quantity;
            existingItem.quantity += quantity;
            this.saveCart();
            this.updateCartUI();
            this.showNotification(`${product.name} quantity updated`);
            
            // Track activity
            if (window.ActivityTracker) {
                window.ActivityTracker.trackUpdateCartQuantity(productId, product.name, oldQuantity, existingItem.quantity);
            }
        } else {
            // Add new item with exact quantity specified
            this.items.push({
                productId,
                name: product.name,
                price: product.price,
                size: normalizedSize,
                color: normalizedColor,
                quantity: quantity, // Use exact quantity, not default
                sku: product.sku,
                image: product.images && product.images.length > 0 ? product.images[0] : null
            });
            this.saveCart();
            this.updateCartUI();
            this.showNotification(`${product.name} added to cart`);
            
            // Track activity
            if (window.ActivityTracker) {
                window.ActivityTracker.trackAddToCart(productId, product.name, normalizedSize, normalizedColor, quantity);
            }
        }
        
        // Decrease inventory when successfully added to cart
        if (window.InventoryAPI) {
            window.InventoryAPI.decrease(productId, normalizedSize, quantity);
        }
        
        // Open cart drawer automatically
        this.openCartDrawer();
        
        return true;
    }

    // Remove item from cart
    removeItem(index) {
        if (index >= 0 && index < this.items.length) {
            const removedItem = this.items.splice(index, 1)[0];
            
            // Track activity
            if (window.ActivityTracker) {
                window.ActivityTracker.trackRemoveFromCart(removedItem.productId, removedItem.name);
            }
            
            // Increase inventory when item is removed from cart
            if (window.InventoryAPI && removedItem.productId && removedItem.size) {
                window.InventoryAPI.increase(removedItem.productId, removedItem.size, removedItem.quantity);
            }
            
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
                return;
            }
            
            const item = this.items[index];
            const oldQuantity = item.quantity;
            
            // Check inventory before updating quantity
            if (window.InventoryAPI && item.productId && item.size) {
                const availableStock = window.InventoryAPI.get(item.productId, item.size);
                
                // Calculate how many are already in cart (excluding current item)
                const otherItemsQuantity = this.items
                    .filter((it, idx) => idx !== index && it.productId === item.productId && it.size === item.size)
                    .reduce((sum, it) => sum + it.quantity, 0);
                
                const maxAllowed = availableStock - otherItemsQuantity;
                
                if (quantity > maxAllowed) {
                    this.showNotification(`Only ${availableStock} available. Maximum ${maxAllowed} allowed (${otherItemsQuantity} already in cart)`);
                    // Set to max allowed
                    quantity = maxAllowed;
                    if (quantity <= 0) {
                        this.removeItem(index);
                        return;
                    }
                }
            }
            
            this.items[index].quantity = quantity;
            
            // Track activity
            if (window.ActivityTracker) {
                window.ActivityTracker.trackUpdateCartQuantity(item.productId, item.name, oldQuantity, quantity);
            }
            
            // Update inventory if quantity changed
            if (window.InventoryAPI && item.productId && item.size) {
                const quantityDiff = quantity - oldQuantity;
                if (quantityDiff > 0) {
                    // Increasing quantity - decrease inventory
                    window.InventoryAPI.decrease(item.productId, item.size, quantityDiff);
                } else if (quantityDiff < 0) {
                    // Decreasing quantity - increase inventory
                    window.InventoryAPI.increase(item.productId, item.size, Math.abs(quantityDiff));
                }
            }
            
            this.saveCart();
            this.updateCartUI();
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
            cartItems.innerHTML = this.items.map((item, index) => {
                const productUrl = `product.html?id=${item.productId}`;
                return `
                <div class="cart-item" data-index="${index}">
                    <a href="${productUrl}" class="cart-item-image">
                        ${item.image ? `<img src="${item.image}" alt="${item.name}">` : item.sku}
                    </a>
                    <div class="cart-item-details">
                        <a href="${productUrl}" class="cart-item-name">${item.name}</a>
                        <p class="cart-item-price">${window.ProductsAPI.formatPrice(item.price)}</p>
                        <p class="cart-item-variant">${item.size} / ${item.color}</p>
                        <div class="cart-item-actions">
                            <div class="quantity-selector">
                                <button class="quantity-btn minus" data-index="${index}">−</button>
                                <span class="quantity-value">${item.quantity}</span>
                                <button class="quantity-btn plus" data-index="${index}">+</button>
                            </div>
                            <div class="cart-item-buttons">
                                <button class="remove-item" data-index="${index}">Remove</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            }).join('');
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

            // Ensure all items have complete product data
            this.items = this.items.map(item => {
                // If item is missing name, price, or image, fetch from ProductsAPI
                if (!item.name || !item.price || !item.image) {
                    const product = window.ProductsAPI?.getById(item.productId);
                    if (product) {
                        return {
                            ...item,
                            name: item.name || product.name || 'Product',
                            price: item.price || product.price || 0,
                            image: item.image || (product.images && product.images.length > 0 ? product.images[0] : null),
                            sku: item.sku || product.sku || ''
                        };
                    }
                }
                return item;
            });
            
            // Save updated items back to cart
            this.saveCart();

            cartContainer.innerHTML = this.items.map((item, index) => {
                const productUrl = `product.html?id=${item.productId}`;
                const itemName = item.name || 'Product';
                const itemPrice = item.price || 0;
                const itemImage = item.image || null;
                const itemSku = item.sku || '';
                
                return `
                <div class="cart-page-item" data-index="${index}">
                    <a href="${productUrl}" class="cart-page-item-image">
                        ${itemImage ? `<img src="${itemImage}" alt="${itemName}">` : `<div class="image-placeholder">${itemSku || 'Image'}</div>`}
                    </a>
                    <div class="cart-page-item-details">
                        <a href="${productUrl}" class="cart-page-item-name">${itemName}</a>
                        <p class="cart-page-item-variant">Size: ${item.size || 'N/A'} | Color: ${item.color || 'N/A'}</p>
                        <div class="cart-page-item-quantity">
                            <div class="quantity-selector">
                                <button class="quantity-btn minus" data-index="${index}">−</button>
                                <span class="quantity-value">${item.quantity || 1}</span>
                                <button class="quantity-btn plus" data-index="${index}">+</button>
                            </div>
                        </div>
                    </div>
                    <div class="cart-page-item-price">
                        <p class="item-total">${window.ProductsAPI?.formatPrice(itemPrice * (item.quantity || 1)) || '0.00 €'}</p>
                        <div class="cart-page-item-buttons">
                            <button class="remove-item" data-index="${index}">Remove</button>
                            <button class="edit-item" data-index="${index}" data-product-id="${item.productId}">Edit</button>
                        </div>
                    </div>
                </div>
            `;
            }).join('');

            // Update summary
            const subtotal = document.querySelector('.summary-subtotal');
            const total = document.querySelector('.summary-total');
            const cartTotal = this.getTotal();
            if (subtotal) subtotal.textContent = window.ProductsAPI?.formatPrice(cartTotal) || '0.00 €';
            if (total) total.textContent = window.ProductsAPI?.formatPrice(cartTotal) || '0.00 €';
        }
    }

    // Bind events
    bindEvents() {
        // Quick add buttons
        // NOTE: Homepage quick-add is handled in main.js with size selection
        // This handler only applies to collection page and other pages
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-add')) {
                // Skip if on homepage (has collection-preview section)
                if (document.querySelector('.collection-preview')) {
                    return; // Let main.js handle it with size selection
                }
                const productId = e.target.dataset.productId;
                this.addItem(parseInt(productId));
            }
        });

        // Quantity buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quantity-btn')) {
                const index = parseInt(e.target.dataset.index);
                
                // Check if item exists
                if (!this.items[index]) {
                    console.error('Item not found at index:', index);
                    return;
                }
                
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

        // Edit buttons - use event delegation for dynamically rendered buttons
        document.addEventListener('click', (e) => {
            // Check if clicked element or its parent is an edit-item button
            const editButton = e.target.closest('.edit-item');
            if (editButton) {
                e.preventDefault();
                e.stopPropagation();
                const index = parseInt(editButton.dataset.index);
                const productId = parseInt(editButton.dataset.productId);
                console.log('Edit button clicked:', { index, productId });
                if (!isNaN(index) && !isNaN(productId)) {
                    this.openEditModal(index, productId);
                } else {
                    console.error('Invalid index or productId:', { index, productId });
                }
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

    // Open cart drawer
    openCartDrawer() {
        const cartDrawer = document.querySelector('.cart-drawer');
        const cartOverlay = document.querySelector('.cart-overlay');
        
        if (cartDrawer && cartOverlay) {
            cartDrawer.classList.add('open');
            cartOverlay.classList.add('visible');
            document.body.classList.add('cart-open');
        }
    }

    // Open edit modal
    openEditModal(index, productId) {
        const item = this.items[index];
        if (!item) return;

        const product = window.ProductsAPI.getById(productId);
        if (!product) return;

        // Create or get edit modal
        let editModal = document.getElementById('edit-item-modal');
        if (!editModal) {
            editModal = document.createElement('div');
            editModal.id = 'edit-item-modal';
            editModal.className = 'edit-item-modal';
            document.body.appendChild(editModal);
        }

        // Generate size options
        const sizeOptions = product.sizes.map(size => 
            `<button type="button" class="edit-size-btn ${item.size === size ? 'active' : ''}" data-size="${size}">${size}</button>`
        ).join('');

        editModal.innerHTML = `
            <div class="edit-modal-overlay"></div>
            <div class="edit-modal-content">
                <div class="edit-modal-header">
                    <h3>Edit ${item.name}</h3>
                    <button class="edit-modal-close" aria-label="Close">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <div class="edit-modal-body">
                    <div class="edit-section">
                        <label class="edit-label">Size</label>
                        <div class="edit-size-options" id="edit-size-options">
                            ${sizeOptions}
                        </div>
                    </div>
                    <div class="edit-section">
                        <label class="edit-label">Quantity</label>
                        <div class="edit-quantity-selector">
                            <button type="button" class="edit-quantity-btn minus" data-action="minus">−</button>
                            <input type="number" class="edit-quantity-input" value="${item.quantity}" min="1" id="edit-quantity">
                            <button type="button" class="edit-quantity-btn plus" data-action="plus">+</button>
                        </div>
                    </div>
                </div>
                <div class="edit-modal-footer">
                    <button type="button" class="edit-apply-btn" data-index="${index}">Apply</button>
                </div>
            </div>
        `;

        // Show modal
        editModal.classList.add('visible');
        document.body.style.overflow = 'hidden';

        // Size selection
        const sizeButtons = editModal.querySelectorAll('.edit-size-btn');
        sizeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                sizeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Quantity controls
        const quantityInput = editModal.querySelector('#edit-quantity');
        const quantityMinus = editModal.querySelector('.edit-quantity-btn.minus');
        const quantityPlus = editModal.querySelector('.edit-quantity-btn.plus');

        quantityMinus.addEventListener('click', () => {
            const current = parseInt(quantityInput.value) || 1;
            if (current > 1) {
                quantityInput.value = current - 1;
            }
        });

        quantityPlus.addEventListener('click', () => {
            const current = parseInt(quantityInput.value) || 1;
            quantityInput.value = current + 1;
        });

        // Apply changes
        const applyBtn = editModal.querySelector('.edit-apply-btn');
        applyBtn.addEventListener('click', () => {
            const selectedSize = editModal.querySelector('.edit-size-btn.active')?.dataset.size || item.size;
            const newQuantity = parseInt(quantityInput.value) || 1;

            // Update item
            this.updateItem(index, selectedSize, newQuantity);
            this.closeEditModal();
        });

        // Close modal
        const closeBtn = editModal.querySelector('.edit-modal-close');
        const overlay = editModal.querySelector('.edit-modal-overlay');

        [closeBtn, overlay].forEach(el => {
            el?.addEventListener('click', () => {
                this.closeEditModal();
            });
        });
    }

    // Close edit modal
    closeEditModal() {
        const editModal = document.getElementById('edit-item-modal');
        if (editModal) {
            editModal.classList.remove('visible');
            document.body.style.overflow = '';
        }
    }

    // Update cart item
    updateItem(index, newSize, newQuantity) {
        if (index < 0 || index >= this.items.length) return;

        const item = this.items[index];
        const oldSize = item.size;
        const oldQuantity = item.quantity;

        // Check if same product with new size already exists
        const existingItem = this.items.find((it, idx) => 
            idx !== index &&
            it.productId === item.productId && 
            it.size === newSize && 
            it.color === item.color
        );

        if (existingItem) {
            // Merge with existing item
            existingItem.quantity += newQuantity;
            this.removeItem(index);
            this.showNotification('Item updated and merged with existing');
        } else {
            // Update current item
            item.size = newSize;
            item.quantity = newQuantity;
            this.saveCart();
            this.updateCartUI();
            this.showNotification('Item updated');
        }

        // Trigger checkout totals update if on checkout page
        if (window.updateCheckoutTotals) {
            window.updateCheckoutTotals();
            // Re-render checkout items
            if (document.getElementById('checkout-items')) {
                const cart = JSON.parse(localStorage.getItem('sandroSandriCart') || '[]');
                window.renderCheckoutItems(cart);
            }
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
    window.ShoppingCart = ShoppingCart;
    window.ShoppingCart.instance = window.cart;
});


