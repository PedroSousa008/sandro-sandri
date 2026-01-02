/* ========================================
   Sandro Sandri - Product Page
   ======================================== */

// Wait for both DOM and ProductsAPI to be ready
function waitForProductsAPI() {
    if (window.ProductsAPI) {
        initProductPage();
    } else {
        setTimeout(waitForProductsAPI, 50);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForProductsAPI);
} else {
    waitForProductsAPI();
}

function initProductPage() {
    // Get product ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id') || 1;
    
    // Get product data
    const product = window.ProductsAPI.getById(productId);
    
    if (!product) {
        // Redirect to collection if product not found
        window.location.href = 'collection.html';
        return;
    }

    // Populate page with product data
    populateProduct(product);
    
    // Initialize interactions
    initSizeSelection(product);
    initColorSelection(product);
    initQuantitySelector();
    initAccordions();
    initAddToCartForm(product);
    initFavoritesButton(product);
    loadRelatedProducts(product);
}

function populateProduct(product) {
    // Update page title
    document.title = `${product.name} | Sandro Sandri`;
    
    // Update breadcrumb
    document.getElementById('breadcrumb-product').textContent = product.name;
    
    // Update product info
    document.getElementById('product-title').textContent = product.name;
    document.getElementById('product-price').textContent = window.ProductsAPI.formatPrice(product.price);
    document.getElementById('product-description').textContent = product.description;
    
    // Update form product ID
    document.getElementById('add-to-cart-form').dataset.productId = product.id;
    
    // Update main product image
    const mainImageContainer = document.getElementById('product-image');
    if (mainImageContainer && product.images && product.images.length > 0) {
        // Show first image (front) as main, or back if only one image
        const mainImage = product.images[0];
        mainImageContainer.innerHTML = `<img src="${mainImage}" alt="${product.name}">`;
    }
    
    // Update thumbnails
    const thumbnailsContainer = document.querySelector('.product-thumbnails');
    if (thumbnailsContainer && product.images && product.images.length > 0) {
        thumbnailsContainer.innerHTML = product.images.map((img, index) => `
            <button class="thumbnail ${index === 0 ? 'active' : ''}" data-image="${img}">
                <img src="${img}" alt="${product.name} view ${index + 1}">
            </button>
        `).join('');
        
        // Add click handlers for thumbnails
        const thumbnails = thumbnailsContainer.querySelectorAll('.thumbnail');
        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', () => {
                thumbnails.forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
                mainImageContainer.innerHTML = `<img src="${thumb.dataset.image}" alt="${product.name}">`;
            });
        });
    }
    
    // Populate details list
    const detailsList = document.getElementById('product-details-list');
    if (detailsList && product.details) {
        detailsList.innerHTML = product.details.map(detail => `<li>${detail}</li>`).join('');
    }
    
    // Populate collection section
    const collectionAccordion = document.getElementById('collection-accordion');
    const collectionTitle = document.getElementById('collection-title');
    const collectionDescription = document.getElementById('collection-description');
    
    if (product.collection && collectionAccordion) {
        collectionTitle.textContent = product.collection.title;
        collectionDescription.textContent = product.collection.description;
        collectionAccordion.style.display = 'block';
    } else if (collectionAccordion) {
        collectionAccordion.style.display = 'none';
    }
}

function initSizeSelection(product) {
    const sizeOptions = document.getElementById('size-options');
    const sizeInput = document.getElementById('selected-size-input');
    
    if (!sizeOptions) {
        console.error('Size options container not found!');
        return;
    }
    
    if (!product || !product.sizes || product.sizes.length === 0) {
        console.error('Product or sizes not found!', product);
        return;
    }
    
    console.log('Initializing size selection with sizes:', product.sizes);
    
    // Clear any existing content
    sizeOptions.innerHTML = '';
    
    // Create a simple click handler function
    function selectSize(size) {
        console.log('Selecting size:', size);
        
        // Update all buttons
        sizeOptions.querySelectorAll('.size-btn').forEach(b => {
            if (b.dataset.size === size) {
                b.classList.add('active');
                b.style.background = '#1a1a2e';
                b.style.color = '#ffffff';
                b.style.borderColor = '#1a1a2e';
            } else {
                b.classList.remove('active');
                b.style.background = '#ffffff';
                b.style.color = '#1a1a2e';
                b.style.borderColor = '#e5e5e5';
            }
        });
        
        // Update hidden input
        if (sizeInput) {
            sizeInput.value = size;
            console.log('Size input updated to:', sizeInput.value);
        } else {
            console.error('Size input element not found!');
        }
        
        // Check inventory and update Add to Cart button
        if (window.updateAddToCartButton) {
            window.updateAddToCartButton(product.id, size);
        }
        
        // Update quantity max based on available inventory
        updateQuantityMax(product.id, size);
    }
    
    // Function to update quantity max based on available inventory
    function updateQuantityMax(productId, size) {
        const quantityInput = document.querySelector('.quantity-input');
        if (!quantityInput) return;
        
        if (window.InventoryAPI) {
            const availableStock = window.InventoryAPI.get(productId, size);
            const currentValue = parseInt(quantityInput.value) || 1;
            
            // Set max to available stock
            quantityInput.max = availableStock;
            quantityInput.setAttribute('max', availableStock);
            
            // If current value exceeds available stock, reduce it
            if (currentValue > availableStock) {
                quantityInput.value = availableStock;
            }
            
            // Ensure minimum is 1
            if (availableStock === 0) {
                quantityInput.value = 0;
                quantityInput.disabled = true;
            } else {
                quantityInput.disabled = false;
                if (quantityInput.value < 1) {
                    quantityInput.value = 1;
                }
            }
            
            console.log('Quantity max updated to:', availableStock, 'for size:', size);
        }
    }
    
    // Render size buttons with simple onclick
    product.sizes.forEach((size, index) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'size-btn';
        btn.dataset.size = size;
        btn.textContent = size;
        
        // Check if size is in stock
        const inStock = window.InventoryAPI && window.InventoryAPI.isInStock(product.id, size);
        
        if (!inStock) {
            btn.classList.add('sold-out');
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        }
        
        // Set default active state
        if (index === 0) {
            btn.classList.add('active');
        }
        
        // Simple inline onclick - most reliable
        btn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (!inStock) return false; // Don't allow selection of sold out sizes
            console.log('Button clicked for size:', size);
            selectSize(size);
            return false;
        };
        
        // Also add addEventListener as backup
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (!inStock) return false; // Don't allow selection of sold out sizes
            console.log('Event listener triggered for size:', size);
            selectSize(size);
        }, false);
        
        sizeOptions.appendChild(btn);
    });
    
    // Set default size
    if (sizeInput) {
        sizeInput.value = product.sizes[0];
        console.log('Default size set to:', sizeInput.value);
        
        // Update Add to Cart button for default size
        if (window.updateAddToCartButton) {
            window.updateAddToCartButton(product.id, product.sizes[0]);
        }
    }
    
    // Define updateAddToCartButton function if not already defined
    if (!window.updateAddToCartButton) {
        window.updateAddToCartButton = function(productId, size) {
            const addToCartBtn = document.querySelector('.add-to-cart-btn');
            if (!addToCartBtn) return;
            
            // Check if size is in stock
            const inStock = window.InventoryAPI && window.InventoryAPI.isInStock(productId, size);
            
            if (inStock) {
                addToCartBtn.textContent = 'Add to Cart';
                addToCartBtn.disabled = false;
                addToCartBtn.style.background = '#1a1a2e';
                addToCartBtn.style.color = '#ffffff';
                addToCartBtn.style.cursor = 'pointer';
                addToCartBtn.style.opacity = '1';
            } else {
                addToCartBtn.textContent = 'Sold Out';
                addToCartBtn.disabled = true;
                addToCartBtn.style.background = '#8a8a8a';
                addToCartBtn.style.color = '#ffffff';
                addToCartBtn.style.cursor = 'not-allowed';
                addToCartBtn.style.opacity = '1';
            }
        };
    }
    
    console.log('Size selection initialized. Total buttons:', sizeOptions.querySelectorAll('.size-btn').length);
}

function initColorSelection(product) {
    const colorOptions = document.getElementById('color-options');
    const colorInput = document.getElementById('selected-color-input');
    const selectedColorText = document.getElementById('selected-color');
    
    if (!colorOptions || !product.colors) return;
    
    // Render color buttons
    colorOptions.innerHTML = product.colors.map((color, index) => `
        <button type="button" class="color-btn ${index === 0 ? 'active' : ''}" 
                data-color="${color.name}" title="${color.name}">
            <span class="color-btn-inner" style="background-color: ${color.code}"></span>
        </button>
    `).join('');
    
    // Set default color
    colorInput.value = product.colors[0].name;
    selectedColorText.textContent = product.colors[0].name;
    
    // Color selection
    const colorButtons = colorOptions.querySelectorAll('.color-btn');
    colorButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            colorButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            colorInput.value = btn.dataset.color;
            selectedColorText.textContent = btn.dataset.color;
        });
    });
}

function initQuantitySelector(product) {
    const quantityContainer = document.querySelector('.product-quantity');
    if (!quantityContainer) return;
    
    const input = quantityContainer.querySelector('.quantity-input');
    const minusBtn = quantityContainer.querySelector('.minus');
    const plusBtn = quantityContainer.querySelector('.plus');
    
    // Function to get current max based on selected size
    function getCurrentMax() {
        const sizeInput = document.getElementById('selected-size-input');
        const selectedSize = sizeInput ? sizeInput.value : null;
        
        if (selectedSize && window.InventoryAPI && product) {
            return window.InventoryAPI.get(product.id, selectedSize);
        }
        
        return parseInt(input.max) || 10;
    }
    
    minusBtn.addEventListener('click', () => {
        const currentVal = parseInt(input.value) || 1;
        if (currentVal > 1) {
            input.value = currentVal - 1;
        }
    });
    
    plusBtn.addEventListener('click', () => {
        const currentVal = parseInt(input.value) || 1;
        const maxVal = getCurrentMax();
        
        if (currentVal < maxVal) {
            input.value = currentVal + 1;
        } else {
            // Show notification if trying to exceed max
            if (window.showNotification) {
                window.showNotification(`Only ${maxVal} available in this size`);
            }
        }
    });
    
    input.addEventListener('change', () => {
        let val = parseInt(input.value) || 1;
        const minVal = parseInt(input.min) || 1;
        const maxVal = getCurrentMax();
        
        if (val < minVal) val = minVal;
        if (val > maxVal) {
            val = maxVal;
            if (window.showNotification) {
                window.showNotification(`Only ${maxVal} available in this size`);
            }
        }
        
        input.value = val;
    });
    
    input.addEventListener('input', () => {
        const maxVal = getCurrentMax();
        const currentVal = parseInt(input.value) || 1;
        
        if (currentVal > maxVal) {
            input.value = maxVal;
            if (window.showNotification) {
                window.showNotification(`Only ${maxVal} available in this size`);
            }
        }
    });
}

function initAccordions() {
    const accordions = document.querySelectorAll('.accordion');
    
    accordions.forEach(accordion => {
        const header = accordion.querySelector('.accordion-header');
        
        header.addEventListener('click', () => {
            // Close other accordions
            accordions.forEach(a => {
                if (a !== accordion) {
                    a.classList.remove('open');
                }
            });
            
            // Toggle current accordion
            accordion.classList.toggle('open');
        });
    });
    
    // Open first accordion by default
    if (accordions.length > 0) {
        accordions[0].classList.add('open');
    }
}

function initAddToCartForm(product) {
    const form = document.getElementById('add-to-cart-form');
    if (!form) return;
    
    // Get references
    const sizeInput = document.getElementById('selected-size-input');
    const colorInput = document.getElementById('selected-color-input');
    const quantityInput = form.querySelector('.quantity-input');
    const submitBtn = form.querySelector('button[type="submit"]');
    
    // Use a flag to prevent duplicate submissions
    let isSubmitting = false;
    
    // Remove any existing submit listeners by using a named function we can remove
    const handleSubmit = (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        
        // Prevent double submission
        if (isSubmitting) {
            console.log('Already submitting, ignoring...');
            return;
        }
        isSubmitting = true;
        
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';
        
        const size = sizeInput ? sizeInput.value : null;
        const color = colorInput ? colorInput.value : null;
        const quantityValue = quantityInput ? quantityInput.value : '1';
        const quantity = parseInt(quantityValue) || 1;
        
        // Validate size is selected
        if (!size || size.trim() === '') {
            showNotification('Please select a size');
            isSubmitting = false;
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            return;
        }
        
        // Check inventory before adding to cart
        if (window.InventoryAPI) {
            const inStock = window.InventoryAPI.isInStock(product.id, size);
            if (!inStock) {
                showNotification('This size is sold out');
                isSubmitting = false;
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                return;
            }
            
            const availableStock = window.InventoryAPI.get(product.id, size);
            if (quantity > availableStock) {
                showNotification(`Only ${availableStock} available in this size. Please reduce quantity.`);
                // Reset quantity to available stock
                if (quantityInput) {
                    quantityInput.value = availableStock;
                }
                isSubmitting = false;
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                return;
            }
            
            // Ensure quantity doesn't exceed available stock
            if (quantity > availableStock) {
                quantity = availableStock;
                if (quantityInput) {
                    quantityInput.value = quantity;
                }
            }
        }
        
        // Ensure quantity is valid
        if (quantity < 1) {
            console.error('Invalid quantity:', quantity);
            showNotification('Please enter a valid quantity');
            isSubmitting = false;
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            return;
        }
        
        console.log('Adding to cart:', { productId: product.id, size, color, quantity, quantityValue });
        
        // Add to cart - only once, with exact quantity
        if (window.cart) {
            const added = window.cart.addItem(product.id, size, color, quantity);
            if (added && window.InventoryAPI) {
                // Decrease inventory when successfully added to cart
                window.InventoryAPI.decrease(product.id, size, quantity);
                // Update button state after adding
                if (window.updateAddToCartButton) {
                    window.updateAddToCartButton(product.id, size);
                }
            }
        } else {
            console.error('Cart not initialized');
        }
        
        // Re-enable button after a short delay
        setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            isSubmitting = false;
        }, 1500);
        
        // Open cart drawer
        const cartDrawer = document.querySelector('.cart-drawer');
        const cartOverlay = document.querySelector('.cart-overlay');
        if (cartDrawer) {
            cartDrawer.classList.add('open');
            cartOverlay?.classList.add('visible');
            document.body.classList.add('cart-open');
        }
    };
    
    // Remove old listener if it exists and add new one
    form.removeEventListener('submit', handleSubmit);
    form.addEventListener('submit', handleSubmit);
}

function initFavoritesButton(product) {
    const favoriteBtn = document.getElementById('favorite-btn');
    if (!favoriteBtn) return;

    // Helper functions for favorites
    const getFavorites = () => {
        const saved = localStorage.getItem('sandroSandriFavorites');
        return saved ? JSON.parse(saved) : [];
    };

    const isFavorited = () => {
        const favorites = getFavorites();
        return favorites.includes(product.id);
    };

    const addToFavorites = () => {
        const favorites = getFavorites();
        if (!favorites.includes(product.id)) {
            favorites.push(product.id);
            localStorage.setItem('sandroSandriFavorites', JSON.stringify(favorites));
            return true;
        }
        return false;
    };

    const removeFromFavorites = () => {
        const favorites = getFavorites();
        const updated = favorites.filter(id => id !== product.id);
        localStorage.setItem('sandroSandriFavorites', JSON.stringify(updated));
    };

    // Check if product is already favorited
    if (isFavorited()) {
        favoriteBtn.classList.add('active');
    }

    favoriteBtn.addEventListener('click', () => {
        if (isFavorited()) {
            removeFromFavorites();
            favoriteBtn.classList.remove('active');
            showNotification('Removed from favorites');
        } else {
            if (addToFavorites()) {
                favoriteBtn.classList.add('active');
                showNotification('Added to favorites');
            }
        }
        
        // Update profile stats if profile page is open
        if (window.updateProfileStats) {
            window.updateProfileStats();
        }
    });
}

function showNotification(message) {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('visible');
    });

    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

function loadRelatedProducts(currentProduct) {
    const relatedGrid = document.getElementById('related-products');
    if (!relatedGrid) return;
    
    // Get products from same category, excluding current product
    let related = window.ProductsAPI.getByCategory(currentProduct.category)
        .filter(p => p.id !== currentProduct.id);
    
    // If not enough, add from other categories
    if (related.length < 4) {
        const others = window.ProductsAPI.getAll()
            .filter(p => p.id !== currentProduct.id && p.category !== currentProduct.category);
        related = [...related, ...others].slice(0, 4);
    } else {
        related = related.slice(0, 4);
    }
    
    relatedGrid.innerHTML = related.map(product => `
        <article class="product-card" data-product-id="${product.id}">
            <a href="product.html?id=${product.id}" class="product-link">
                <div class="product-image">
                    ${product.images && product.images.length > 0 
                        ? `<img src="${product.images[0]}" alt="${product.name}">`
                        : `<div class="image-placeholder product-placeholder"><span>${product.sku}</span></div>`
                    }
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-price">${window.ProductsAPI.formatPrice(product.price)}</p>
                </div>
            </a>
            <button class="quick-add" data-product-id="${product.id}">Add to Cart</button>
        </article>
    `).join('');
}


