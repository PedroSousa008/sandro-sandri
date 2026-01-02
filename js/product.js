/* ========================================
   Sandro Sandri - Product Page
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    initProductPage();
});

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
    
    if (!sizeOptions || !product.sizes) return;
    
    // Render size buttons
    sizeOptions.innerHTML = product.sizes.map((size, index) => `
        <button type="button" class="size-btn ${index === 0 ? 'active' : ''}" data-size="${size}">
            ${size}
        </button>
    `).join('');
    
    // Set default size
    sizeInput.value = product.sizes[0];
    
    // Size selection
    const sizeButtons = sizeOptions.querySelectorAll('.size-btn');
    sizeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            sizeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            sizeInput.value = btn.dataset.size;
        });
    });
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

function initQuantitySelector() {
    const quantityContainer = document.querySelector('.product-quantity');
    if (!quantityContainer) return;
    
    const input = quantityContainer.querySelector('.quantity-input');
    const minusBtn = quantityContainer.querySelector('.minus');
    const plusBtn = quantityContainer.querySelector('.plus');
    
    minusBtn.addEventListener('click', () => {
        const currentVal = parseInt(input.value) || 1;
        if (currentVal > 1) {
            input.value = currentVal - 1;
        }
    });
    
    plusBtn.addEventListener('click', () => {
        const currentVal = parseInt(input.value) || 1;
        const maxVal = parseInt(input.max) || 10;
        if (currentVal < maxVal) {
            input.value = currentVal + 1;
        }
    });
    
    input.addEventListener('change', () => {
        let val = parseInt(input.value) || 1;
        const minVal = parseInt(input.min) || 1;
        const maxVal = parseInt(input.max) || 10;
        
        if (val < minVal) val = minVal;
        if (val > maxVal) val = maxVal;
        
        input.value = val;
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
    
    // Remove any existing event listeners by cloning the form
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    // Get fresh references after cloning
    const sizeInput = document.getElementById('selected-size-input');
    const colorInput = document.getElementById('selected-color-input');
    const quantityInput = newForm.querySelector('.quantity-input');
    const submitBtn = newForm.querySelector('button[type="submit"]');
    
    // Re-attach size button listeners after cloning
    const sizeOptions = document.getElementById('size-options');
    if (sizeOptions && sizeInput) {
        const sizeButtons = sizeOptions.querySelectorAll('.size-btn');
        sizeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                sizeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                sizeInput.value = btn.dataset.size;
            });
        });
    }
    
    // Re-attach color button listeners after cloning
    const colorOptions = document.getElementById('color-options');
    const selectedColorText = document.getElementById('selected-color');
    if (colorOptions && colorInput && selectedColorText) {
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
    
    // Re-attach quantity selector listeners after cloning
    if (quantityInput) {
        const quantityContainer = newForm.querySelector('.product-quantity');
        if (quantityContainer) {
            const minusBtn = quantityContainer.querySelector('.minus');
            const plusBtn = quantityContainer.querySelector('.plus');
            
            if (minusBtn) {
                minusBtn.addEventListener('click', () => {
                    const currentVal = parseInt(quantityInput.value) || 1;
                    if (currentVal > 1) {
                        quantityInput.value = currentVal - 1;
                    }
                });
            }
            
            if (plusBtn) {
                plusBtn.addEventListener('click', () => {
                    const currentVal = parseInt(quantityInput.value) || 1;
                    const maxVal = parseInt(quantityInput.max) || 10;
                    if (currentVal < maxVal) {
                        quantityInput.value = currentVal + 1;
                    }
                });
            }
            
            quantityInput.addEventListener('change', () => {
                let val = parseInt(quantityInput.value) || 1;
                const minVal = parseInt(quantityInput.min) || 1;
                const maxVal = parseInt(quantityInput.max) || 10;
                
                if (val < minVal) val = minVal;
                if (val > maxVal) val = maxVal;
                
                quantityInput.value = val;
            });
        }
    }
    
    let isSubmitting = false;
    
    newForm.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopImmediatePropagation(); // Prevent any other handlers
        
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
            window.cart.addItem(product.id, size, color, quantity);
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
    }, { once: false }); // Keep listener but use stopImmediatePropagation
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


