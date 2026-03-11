/* ========================================
   Sandro Sandri - Product Page
   ======================================== */

/**
 * Mobile detail zoom: source image filename -> detail image filename (in images/).
 * Only 1st and 2nd product images (index 0, 1) show magnify icon when mapped.
 * Add Chapter II, III etc. by adding more entries here.
 */
const DETAIL_IMAGE_MAP = {
    'tshirt-1a.png': 'cayman-front.png',
    'tshirt-1b.png': 'cayman-back.png',
    'tshirt-2a.png': 'necker-front.png',
    'tshirt-2b.png': 'necker-back.png',
    'tshirt-3a.png': 'kisses-front.png',
    'tshirt-3b.png': 'kisses-back.png',
    'tshirt-4a.png': 'sardinia-front.png',
    'tshirt-4b.png': 'sardinia-back.png',
    'tshirt-5a.png': 'port-front.png',
    'tshirt-5b.png': 'port-back.png'
};

function getDetailImageUrl(productImagePath) {
    if (!productImagePath) return null;
    const filename = productImagePath.split('/').pop().split('?')[0];
    const detailFile = DETAIL_IMAGE_MAP[filename];
    return detailFile ? `images/${detailFile}` : null;
}

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

// Chapter Mode is now loaded globally via chapter-mode.js
// No need for local commerce mode loading

function initProductPage() {
    // Get product ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id') || 1;
    
    // Get product data
    const product = window.ProductsAPI.getById(productId);
    
    console.log(`Product Page - Loading product ID: ${productId}`);
    console.log('Product data:', product);
    
    if (!product) {
        console.error(`Product Page - Product ID ${productId} not found!`);
        // Redirect to collection if product not found
        window.location.href = 'collection.html';
        return;
    }
    
    if (!product.images || product.images.length === 0) {
        console.error(`Product Page - No images found for product ID ${productId} (${product.name})`);
    }

    // Populate page with product data
    populateProduct(product);
    
    // Initialize interactions immediately (sizes render from product data, then refresh in background)
    initSizeSelection(product);
    initColorSelection(product);
    initQuantitySelector();
    initAccordions();
    initAddToCartForm(product);
    initFavoritesButton(product);
    waitForChapterModeAndUpdateButton(product);
    
    // Listen for favorites sync events to update button state
    window.addEventListener('favoritesSynced', (e) => {
        const syncedFavorites = e.detail || [];
        if (syncedFavorites.includes(product.id)) {
            favoriteBtn.classList.add('active');
        } else {
            favoriteBtn.classList.remove('active');
        }
    });
    
    // Listen for inventory sync events to refresh inventory display
    window.addEventListener('inventorySynced', () => {
        console.log('📦 Inventory synced, refreshing product page...');
        const selectedSize = document.getElementById('selected-size-input')?.value;
        if (selectedSize) {
            // Update quantity max for selected size
            if (window.updateQuantityMax) {
                window.updateQuantityMax(product.id, selectedSize);
            }
            // Update add to cart button state
            if (window.updateAddToCartButton) {
                window.updateAddToCartButton(product.id, selectedSize);
            }
            // Refresh size buttons (sold out states)
            initSizeSelection(product);
        }
    });
    
    // Listen for chapter mode updates to refresh button text
    window.addEventListener('chapterModeUpdated', () => {
        console.log('📋 Chapter mode updated, refreshing product button...');
        updateProductButtonForMode(product);
        // Also update button if size is selected
        const selectedSize = document.getElementById('selected-size-input')?.value;
        if (selectedSize && window.updateAddToCartButton) {
            window.updateAddToCartButton(product.id, selectedSize);
        }
    });
    loadRelatedProducts(product);
    
    // Initialize swipe navigation on mobile
    initSwipeNavigation(product);
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
    
    // Update main product image - OPTIMIZED: Preload all images and keep in DOM for instant switching
    const mainImageContainer = document.getElementById('product-image');
    if (mainImageContainer && product.images && product.images.length > 0) {
        console.log(`Product Page - Loading images for ${product.name} (ID: ${product.id}):`, product.images);
        // Clear any existing content (zoom wrap + images)
        mainImageContainer.innerHTML = '';
        // Zoom wrap for hover-to-zoom (desktop)
        const zoomWrap = document.createElement('div');
        zoomWrap.className = 'product-image-zoom-wrap';
        const zoomLens = document.createElement('div');
        zoomLens.className = 'product-zoom-lens';
        zoomLens.setAttribute('aria-hidden', 'true');
        const zoomInner = document.createElement('div');
        zoomInner.className = 'product-zoom-inner';
        zoomLens.appendChild(zoomInner);
        zoomWrap.appendChild(zoomLens);
        // Preload all images for instant switching
        product.images.forEach((imgSrc, index) => {
            const img = new Image();
            // Add cache busting to ensure latest images are loaded
            const imageUrl = imgSrc.includes('?') ? `${imgSrc}&v=3.2` : `${imgSrc}?v=3.2`;
            img.src = imageUrl;
            img.alt = `${product.name} view ${index + 1}`;
            img.style.display = index === 0 ? 'block' : 'none';
            img.style.width = '100%';
            img.style.height = 'auto';
            img.style.transition = 'opacity 0.15s ease-in-out';
            img.loading = 'eager'; // Load immediately
            img.onerror = function() {
                console.error(`Failed to load image ${index + 1} for ${product.name}:`, imageUrl);
            };
            img.onload = function() {
                console.log(`Successfully loaded image ${index + 1} for ${product.name}:`, imageUrl);
            };
            zoomWrap.appendChild(img);
        });
        mainImageContainer.appendChild(zoomWrap);
        // Mobile: pagination dots (one image at a time, dots under image)
        const galleryDots = document.createElement('div');
        galleryDots.className = 'product-gallery-dots';
        galleryDots.setAttribute('aria-label', 'Image gallery pagination');
        product.images.forEach((_, index) => {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = `product-gallery-dot${index === 0 ? ' active' : ''}`;
            dot.setAttribute('aria-label', `View image ${index + 1} of ${product.images.length}`);
            dot.dataset.index = String(index);
            dot.addEventListener('click', () => switchToImage(index, product));
            galleryDots.appendChild(dot);
        });
        mainImageContainer.appendChild(galleryDots);
        // Mobile only: magnify overlay on 1st/2nd image when detail image exists
        const detailOverlay = document.createElement('button');
        detailOverlay.type = 'button';
        detailOverlay.className = 'product-detail-zoom-overlay';
        detailOverlay.setAttribute('aria-label', 'View detail');
        detailOverlay.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>`;
        detailOverlay.style.display = 'none';
        zoomWrap.appendChild(detailOverlay);
        window._productDetailOverlay = detailOverlay;
        window._productDetailOverlayProduct = product;
        // Detail lightbox modal (one per page, reused)
        if (!document.getElementById('product-detail-lightbox')) {
            const lb = document.createElement('div');
            lb.id = 'product-detail-lightbox';
            lb.className = 'product-detail-lightbox';
            lb.innerHTML = `
                <button type="button" class="product-detail-lightbox-close" aria-label="Close">&times;</button>
                <div class="product-detail-lightbox-content"><img src="" alt="Detail" /></div>
            `;
            document.body.appendChild(lb);
            lb.querySelector('.product-detail-lightbox-close').addEventListener('click', closeDetailLightbox);
            lb.addEventListener('click', (e) => { if (e.target === lb) closeDetailLightbox(); });
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDetailLightbox(); });
        }
        detailOverlay.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const url = detailOverlay.dataset.detailUrl;
            if (url) openDetailLightbox(url);
        });
        // Hover-to-zoom (desktop): show lens and move with mouse
        initProductImageZoom(zoomWrap, zoomLens, zoomInner, product);
        updateMobileDetailOverlay(product);
    } else {
        console.error(`Product Page - No images found for ${product.name} (ID: ${product.id})`);
    }
    
    // Update thumbnails
    const thumbnailsContainer = document.querySelector('.product-thumbnails');
    if (thumbnailsContainer && product.images && product.images.length > 0) {
        thumbnailsContainer.innerHTML = product.images.map((img, index) => {
            // Add cache busting to thumbnails
            const imageUrl = img.includes('?') ? `${img}&v=3.2` : `${img}?v=3.2`;
            return `
            <button class="thumbnail ${index === 0 ? 'active' : ''}" data-image="${imageUrl}" data-index="${index}">
                <img src="${imageUrl}" alt="${product.name} view ${index + 1}" onerror="console.error('Failed to load thumbnail ${index + 1}:', '${imageUrl}');">
            </button>
        `;
        }).join('');
        
        // Add click handlers for thumbnails
        const thumbnails = thumbnailsContainer.querySelectorAll('.thumbnail');
        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', () => {
                const imageIndex = parseInt(thumb.dataset.index);
                switchToImage(imageIndex, product);
            });
        });
    }
    
    // Store current image index for swipe navigation
    if (!window.currentProductImageIndex) {
        window.currentProductImageIndex = {};
    }
    window.currentProductImageIndex[product.id] = 0;
    
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
    
    const existingButtons = sizeOptions.querySelectorAll('.size-btn');
    const hasPreRenderedSizes = existingButtons.length > 0;
    
    if (!hasPreRenderedSizes) {
        sizeOptions.innerHTML = '';
    }
    
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
        
        // Check inventory and update Add to Cart button (async)
        if (window.updateAddToCartButton) {
            window.updateAddToCartButton(product.id, size);
        }
        
        // Update quantity max based on available inventory (async)
        updateQuantityMaxAsync(product.id, size);
    }
    
    // Function to update quantity max based on available inventory (async)
    async function updateQuantityMaxAsync(productId, size) {
        const quantityInput = document.querySelector('.quantity-input');
        if (!quantityInput) return;
        
        if (window.InventoryAPI) {
            const availableStock = await window.InventoryAPI.get(productId, size);
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
    
    // Keep old function for backward compatibility
    function updateQuantityMax(productId, size) {
        updateQuantityMaxAsync(productId, size);
    }
    
    const defaultStock = { XS: 10, S: 20, M: 50, L: 50, XL: 20 };
    
    // When sizes are pre-rendered in HTML, just attach behaviour so they show instantly
    function attachPreRenderedSizeHandlers() {
        const currentSize = (sizeInput && sizeInput.value) || product.sizes[0] || 'M';
        sizeOptions.querySelectorAll('.size-btn').forEach(function(btn) {
            const size = btn.dataset.size;
            if (!size) return;
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (btn.disabled) return false;
                selectSize(size);
                return false;
            }, false);
        });
        selectSize(currentSize);
    }
    
    // Render size buttons when not in HTML (fallback)
    function renderSizeButtonsImmediate() {
        const fragment = document.createDocumentFragment();
        for (let index = 0; index < product.sizes.length; index++) {
            const size = product.sizes[index];
            const stockCount = product.inventory?.[size] ?? defaultStock[size] ?? 0;
            const inStock = stockCount > 0;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'size-btn';
            btn.dataset.size = size;
            btn.textContent = size;
            if (stockCount === 0) {
                btn.classList.add('sold-out');
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
                btn.textContent = `${size} - Sold Out`;
                btn.disabled = true;
            }
            if (index === 0 && inStock) btn.classList.add('active');
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (!inStock || btn.disabled) return false;
                selectSize(size);
                return false;
            }, false);
            fragment.appendChild(btn);
        }
        sizeOptions.appendChild(fragment);
        const firstAvailableSize = product.sizes.find((s, i) => (product.inventory?.[s] ?? defaultStock[s] ?? 0) > 0);
        if (firstAvailableSize && sizeInput) {
            sizeInput.value = firstAvailableSize;
            selectSize(firstAvailableSize);
        } else if (sizeInput && product.sizes.length > 0) {
            sizeInput.value = product.sizes[0];
        }
    }
    
    // Load inventory and update size buttons (sold out, etc.) in background
    async function refreshSizeButtonsFromInventory() {
        const chapterId = window.InventoryAPI?.getProductChapterId?.(product);
        if (chapterId && window.InventoryAPI?.syncChapterInventory) {
            await window.InventoryAPI.syncChapterInventory(chapterId);
        }
        const stockCounts = await Promise.all(
            product.sizes.map(async (size) => {
                if (window.InventoryAPI) return await window.InventoryAPI.get(product.id, size);
                const count = product.inventory?.[size];
                if (count !== undefined && count !== null) return count;
                return defaultStock[size] ?? 0;
            })
        );
        const buttons = sizeOptions.querySelectorAll('.size-btn');
        if (buttons.length > 0) {
            // Update existing buttons in place (no replace)
            buttons.forEach(function(btn, index) {
                const size = product.sizes[index];
                if (!size) return;
                const stockCount = stockCounts[index] || 0;
                const inStock = stockCount > 0;
                btn.textContent = inStock ? size : `${size} - Sold Out`;
                btn.disabled = !inStock;
                btn.classList.toggle('sold-out', !inStock);
                btn.style.opacity = inStock ? '' : '0.5';
                btn.style.cursor = inStock ? '' : 'not-allowed';
            });
            // Preserve current size if still in stock; only reset to first available if current is out of stock or unset
            const currentSize = sizeInput && sizeInput.value ? sizeInput.value.trim() : '';
            const currentIndex = currentSize ? product.sizes.indexOf(currentSize) : -1;
            const currentInStock = currentIndex >= 0 && (stockCounts[currentIndex] || 0) > 0;
            const firstAvailableSize = product.sizes.find((_, i) => stockCounts[i] > 0);
            if (sizeInput) {
                if (currentInStock) {
                    selectSize(currentSize);
                } else if (firstAvailableSize) {
                    sizeInput.value = firstAvailableSize;
                    selectSize(firstAvailableSize);
                }
            }
        } else {
            sizeOptions.innerHTML = '';
            const fragment = document.createDocumentFragment();
            for (let index = 0; index < product.sizes.length; index++) {
                const size = product.sizes[index];
                const stockCount = stockCounts[index];
                const inStock = stockCount > 0;
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'size-btn';
                btn.dataset.size = size;
                btn.textContent = size;
                if (stockCount === 0) {
                    btn.classList.add('sold-out');
                    btn.style.opacity = '0.5';
                    btn.style.cursor = 'not-allowed';
                    btn.textContent = `${size} - Sold Out`;
                    btn.disabled = true;
                }
                if (index === 0 && inStock) btn.classList.add('active');
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!inStock || btn.disabled) return false;
                    selectSize(size);
                    return false;
                }, false);
                fragment.appendChild(btn);
            }
            sizeOptions.appendChild(fragment);
            const firstAvailableSize = product.sizes.find((_, i) => stockCounts[i] > 0);
            if (firstAvailableSize && sizeInput) {
                sizeInput.value = firstAvailableSize;
                selectSize(firstAvailableSize);
            } else if (sizeInput && product.sizes.length > 0) {
                sizeInput.value = product.sizes[0];
            }
        }
    }
    
    if (hasPreRenderedSizes) {
        attachPreRenderedSizeHandlers();
    } else {
        renderSizeButtonsImmediate();
    }
    refreshSizeButtonsFromInventory();
    
    // Define updateAddToCartButton function if not already defined
    if (!window.updateAddToCartButton) {
        window.updateAddToCartButton = async function(productId, size) {
            const addToCartBtn = document.querySelector('.add-to-cart-btn');
            if (!addToCartBtn) return;
            
            // Get the product to determine its chapter
            const product = window.ProductsAPI?.getById(productId);
            if (!product) return;
            
            // Check if size is in stock (async)
            let inStock = false;
            if (window.InventoryAPI) {
                inStock = await window.InventoryAPI.isInStock(productId, size);
            }
            
            // Also check if size is selected
            const sizeSelected = size && size.trim() !== '';
            
            // Get label from chapter mode (never show "Select a Size" - only Join the Waitlist / Add to Cart / Early Access)
            const getButtonLabelForMode = () => {
                const productChapter = product.chapter === 'chapter_i' ? 'chapter-1' : 
                                      product.chapter === 'chapter_ii' ? 'chapter-2' : null;
                if (productChapter && window.ChapterMode && window.ChapterMode.isInitialized) {
                    const isCreated = window.ChapterMode.isChapterCreated(productChapter);
                    const chapterMode = window.ChapterMode.getChapterMode(productChapter);
                    if (isCreated && chapterMode === 'waitlist') return 'Join the Waitlist';
                    if (isCreated && chapterMode === 'early_access') return 'Early Access';
                }
                return 'Add to Cart';
            };

            if (inStock && sizeSelected) {
                addToCartBtn.textContent = getButtonLabelForMode();
                if (addToCartBtn.textContent === 'Join the Waitlist') {
                    addToCartBtn.classList.add('waitlist-btn');
                } else {
                    addToCartBtn.classList.remove('waitlist-btn');
                }
                addToCartBtn.disabled = false;
                addToCartBtn.style.background = '#1a1a2e';
                addToCartBtn.style.color = '#ffffff';
                addToCartBtn.style.cursor = 'pointer';
                addToCartBtn.style.opacity = '1';
            } else if (!sizeSelected) {
                addToCartBtn.textContent = getButtonLabelForMode();
                if (addToCartBtn.textContent === 'Join the Waitlist') {
                    addToCartBtn.classList.add('waitlist-btn');
                } else {
                    addToCartBtn.classList.remove('waitlist-btn');
                }
                addToCartBtn.disabled = true;
                addToCartBtn.style.background = '#8a8a8a';
                addToCartBtn.style.color = '#ffffff';
                addToCartBtn.style.cursor = 'not-allowed';
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

// Update product button based on chapter mode
// Wait for ChapterMode to be initialized before updating button
function waitForChapterModeAndUpdateButton(product) {
    if (window.ChapterMode && window.ChapterMode.isInitialized) {
        updateProductButtonForMode(product);
    } else {
        // Wait a bit and try again
        setTimeout(() => {
            if (window.ChapterMode && window.ChapterMode.isInitialized) {
                updateProductButtonForMode(product);
            } else {
                // If still not loaded after 1 second, try loading it
                if (window.ChapterMode && window.ChapterMode.loadMode) {
                    window.ChapterMode.loadMode().then(() => {
                        updateProductButtonForMode(product);
                    });
                } else {
                    // Fallback: default to Add to Cart
                    const submitBtn = document.querySelector('.add-to-cart-btn');
                    if (submitBtn) {
                        submitBtn.textContent = 'Add to Cart';
                        submitBtn.classList.remove('waitlist-btn');
                    }
                }
            }
        }, 200);
    }
}

function updateProductButtonForMode(product) {
    const submitBtn = document.querySelector('.add-to-cart-btn');
    if (!submitBtn) return;
    
    // Get product's chapter ID
    // ALL products (including Chapter I) should respect the chapter mode set in Owner Mode
    const productChapter = product.chapter === 'chapter_i' ? 'chapter-1' : 
                          product.chapter === 'chapter_ii' ? 'chapter-2' : null;
    
    if (!productChapter || !window.ChapterMode || !window.ChapterMode.isInitialized) {
        // Default to Add to Cart if chapter mode not available
        submitBtn.textContent = 'Add to Cart';
        submitBtn.classList.remove('waitlist-btn');
        return;
    }
    
    // Check if this chapter is created
    const isCreated = window.ChapterMode.isChapterCreated(productChapter);
    if (!isCreated) {
        // Chapter not created - default to Add to Cart (shouldn't appear, but just in case)
        submitBtn.textContent = 'Add to Cart';
        submitBtn.classList.remove('waitlist-btn');
        return;
    }
    
    // Get the mode for THIS product's chapter (from the table)
    const chapterMode = window.ChapterMode.getChapterMode(productChapter);
    
    // Only 3 button labels: Join the Waitlist, Early Access, Add to Cart
    if (chapterMode === 'waitlist') {
        submitBtn.textContent = 'Join the Waitlist';
        submitBtn.classList.add('waitlist-btn');
    } else if (chapterMode === 'early_access') {
        submitBtn.textContent = 'Early Access';
        submitBtn.classList.remove('waitlist-btn');
    } else {
        submitBtn.textContent = 'Add to Cart';
        submitBtn.classList.remove('waitlist-btn');
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
    const handleSubmit = async (e) => {
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
        
        // Check if this chapter is created and get its mode from the table
        // ALL products (including Chapter I) should respect the chapter mode set in Owner Mode
        const productChapter = product.chapter === 'chapter_i' ? 'chapter-1' : 
                              product.chapter === 'chapter_ii' ? 'chapter-2' : null;
        const isCreated = productChapter && window.ChapterMode?.isChapterCreated(productChapter);
        const chapterMode = productChapter ? window.ChapterMode?.getChapterMode(productChapter) : null;
        
        // Handle WAITLIST mode - show email form if not logged in
        // Apply waitlist mode if THIS product's chapter is in waitlist mode (from table)
        if (isCreated && chapterMode === 'waitlist') {
            console.log('🛒 Waitlist mode detected for product:', product.id, 'chapter:', productChapter, 'mode:', chapterMode);
            
            // Check if user is logged in
            const isLoggedIn = window.ChapterMode.isUserLoggedIn();
            console.log('🛒 User logged in status:', isLoggedIn);
        
            if (!isLoggedIn) {
                console.log('🛒 Showing waitlist form for non-logged-in user');
                // Show email form - waitlist mode does NOT add to cart, only sends waitlist entry
                showWaitlistEmailForm(product, size, color, quantity, false); // false = do NOT add to cart
                // Reset submission state and return early - don't proceed with normal add to cart
                isSubmitting = false;
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                return;
            } else {
                // User is logged in - send waitlist entry to Owner Mode page (NO cart addition)
                // Get user information
                const currentUser = window.AuthSystem?.currentUser || window.auth?.currentUser;
                const userEmail = currentUser?.email || '';
                const profile = JSON.parse(localStorage.getItem('sandroSandriProfile') || 'null');
                const userName = profile?.name || userEmail.split('@')[0] || 'Customer';
                
                // Get active chapter info
                const activeChapterId = window.ChapterMode?.getActiveChapterId();
                const activeChapterMode = window.ChapterMode?.getActiveChapterMode();
                const chapterNum = activeChapterId ? parseInt(activeChapterId.replace('chapter-', '')) : 1;
                const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
                const chapterName = `Chapter ${roman[chapterNum - 1] || chapterNum}`;
                
                // Submit waitlist entry to database for logged-in users
                // IMPORTANT: Waitlist mode does NOT add items to cart - only sends waitlist entry
                try {
                    const waitlistData = {
                        customer_name: userName,
                        customer_email: userEmail,
                        product_id: product.id,
                        product_name: product.name,
                        product_sku: product.sku || 'N/A',
                        size: size,
                        color: color || 'Navy',
                        quantity: quantity,
                        chapter: chapterName,
                        chapter_id: activeChapterId || 'chapter-1',
                        chapter_mode: activeChapterMode || 'waitlist',
                        page_url: window.location.href,
                        user_status: 'Logged In'
                    };
                    
                    console.log('📧 Submitting waitlist entry (logged in):', waitlistData);
                    
                    // Send to database
                    const response = await fetch('/api/waitlist', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(waitlistData)
                    });
                    
                    if (response.ok) {
                        showNotification('Successfully joined the waitlist! You will be notified when this product becomes available.', 'success');
                    } else {
                        showNotification('Error joining waitlist. Please try again.', 'error');
                    }
                } catch (error) {
                    console.error('Error saving waitlist entry for logged-in user:', error);
                    showNotification('Error joining waitlist. Please try again.', 'error');
                }
                
                // Reset submission state and return early - don't add to cart
                isSubmitting = false;
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                return;
            }
        }
        
        // Normal add to cart flow (for Chapter I or non-waitlist chapters)
        submitBtn.textContent = 'Adding...';
        
        // Check inventory before adding to cart
        if (window.InventoryAPI) {
            const inStock = await window.InventoryAPI.isInStock(product.id, size);
            if (!inStock) {
                showNotification('This size is sold out');
                isSubmitting = false;
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                return;
            }
            
            const availableStock = await window.InventoryAPI.get(product.id, size);
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
        // Note: cart.addItem now handles inventory checking and decreasing
        if (window.cart) {
            const added = window.cart.addItem(product.id, size, color, quantity);
            if (added) {
                // Update button state after adding
                if (window.updateAddToCartButton) {
                    window.updateAddToCartButton(product.id, size);
                }
                // Update quantity max after adding
                const updateQuantityMax = window.updateQuantityMax || function(productId, size) {
                    const quantityInput = document.querySelector('.quantity-input');
                    if (quantityInput && window.InventoryAPI) {
                        const availableStock = window.InventoryAPI.get(productId, size);
                        quantityInput.max = availableStock;
                        quantityInput.setAttribute('max', availableStock);
                    }
                };
                updateQuantityMax(product.id, size);
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
            
            // Track activity
            if (window.ActivityTracker) {
                window.ActivityTracker.trackAddFavorite(product.id, product.name);
            }
            
            // Trigger immediate sync to server (instant, non-blocking)
            if (window.userSync && window.userSync.userEmail) {
                // Fire and forget - instant user feedback, sync happens in background
                window.userSync.forceSync().catch(() => {}); // Ignore errors for speed
            }
            return true;
        }
        return false;
    };

    const removeFromFavorites = () => {
        const favorites = getFavorites();
        const updated = favorites.filter(id => id !== product.id);
        localStorage.setItem('sandroSandriFavorites', JSON.stringify(updated));
        
        // Track activity
        if (window.ActivityTracker) {
            window.ActivityTracker.trackRemoveFavorite(product.id, product.name);
        }
        
        // Trigger immediate sync to server (instant, non-blocking)
        if (window.userSync && window.userSync.userEmail) {
            // Fire and forget - instant user feedback, sync happens in background
            window.userSync.forceSync().catch(() => {}); // Ignore errors for speed
        }
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

function showNotification(message, type = 'info') {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type === 'success') {
        toast.style.background = '#4caf50';
        toast.style.color = 'white';
    }
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

// Switch to a specific image index - OPTIMIZED for instant response
function switchToImage(imageIndex, product) {
    if (!product || !product.images || product.images.length === 0) return;
    
    // Ensure index is within bounds
    if (imageIndex < 0) imageIndex = 0;
    if (imageIndex >= product.images.length) imageIndex = product.images.length - 1;
    
    const mainImageContainer = document.getElementById('product-image');
    const thumbnailsContainer = document.querySelector('.product-thumbnails');
    
    // OPTIMIZED: Use requestAnimationFrame for instant visual update
    requestAnimationFrame(() => {
        if (mainImageContainer) {
            // Get all preloaded images
            const images = mainImageContainer.querySelectorAll('img');
            images.forEach((img, index) => {
                if (index === imageIndex) {
                    // Show target image instantly
                    img.style.display = 'block';
                    img.style.opacity = '1';
                } else {
                    // Hide other images instantly
                    img.style.display = 'none';
                    img.style.opacity = '0';
                }
            });
        }
        
        // Update thumbnails
        if (thumbnailsContainer) {
            const thumbnails = thumbnailsContainer.querySelectorAll('.thumbnail');
            thumbnails.forEach((thumb, index) => {
                if (index === imageIndex) {
                    thumb.classList.add('active');
                } else {
                    thumb.classList.remove('active');
                }
            });
        }
        // Update mobile pagination dots
        const galleryDots = mainImageContainer && mainImageContainer.querySelector('.product-gallery-dots');
        if (galleryDots) {
            galleryDots.querySelectorAll('.product-gallery-dot').forEach((dot, index) => {
                dot.classList.toggle('active', index === imageIndex);
            });
        }
    });
    
    // Update current image index
    if (!window.currentProductImageIndex) {
        window.currentProductImageIndex = {};
    }
    window.currentProductImageIndex[product.id] = imageIndex;

    // Keep zoom lens in sync with current image
    const zoomWrap = mainImageContainer && mainImageContainer.querySelector('.product-image-zoom-wrap');
    const zoomInner = zoomWrap && zoomWrap.querySelector('.product-zoom-inner');
    const imgs = zoomWrap && zoomWrap.querySelectorAll('img');
    const currentImg = imgs && imgs[imageIndex];
    if (zoomInner && currentImg && currentImg.src) {
        zoomInner.style.backgroundImage = `url(${currentImg.src})`;
    }
    updateMobileDetailOverlay(product);
}

function updateMobileDetailOverlay(product) {
    const overlay = window._productDetailOverlay;
    if (!overlay || !product || !product.images) return;
    let index = window.currentProductImageIndex && window.currentProductImageIndex[product.id];
    if (typeof index !== 'number' || isNaN(index)) {
        index = 0; // default to first image on initial load
    }
    if (index !== 0 && index !== 1) {
        overlay.style.display = 'none';
        return;
    }
    const imagePath = product.images[index];
    const detailUrl = getDetailImageUrl(imagePath);
    if (!detailUrl) {
        overlay.style.display = 'none';
        return;
    }
    overlay.dataset.detailUrl = detailUrl;
    overlay.style.display = 'flex';
}

function openDetailLightbox(url) {
    const lb = document.getElementById('product-detail-lightbox');
    if (!lb) return;
    const img = lb.querySelector('img');
    if (img) img.src = url;
    lb.classList.add('is-open');
    document.body.style.overflow = 'hidden';
}

function closeDetailLightbox() {
    const lb = document.getElementById('product-detail-lightbox');
    if (!lb) return;
    lb.classList.remove('is-open');
    document.body.style.overflow = '';
}

// Hover-to-zoom on product main image (desktop)
function initProductImageZoom(zoomWrap, zoomLens, zoomInner, product) {
    if (!zoomWrap || !zoomLens || !zoomInner) return;
    const LENS_SIZE = 180;
    const visibleImg = () => zoomWrap.querySelector('img[style*="display: block"]') || zoomWrap.querySelector('img');
    const updateZoomImage = () => {
        const img = visibleImg();
        if (img && img.src) zoomInner.style.backgroundImage = `url(${img.src})`;
    };
    updateZoomImage();
    zoomWrap.addEventListener('mouseenter', (e) => {
        if (window.matchMedia('(hover: none)').matches) return;
        zoomLens.classList.add('is-visible');
    });
    zoomWrap.addEventListener('mouseleave', () => {
        zoomLens.classList.remove('is-visible');
    });
    zoomWrap.addEventListener('mousemove', (e) => {
        if (window.matchMedia('(hover: none)').matches) return;
        const rect = zoomWrap.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
            zoomLens.classList.remove('is-visible');
            return;
        }
        zoomLens.classList.add('is-visible');
        const px = -2 * x + LENS_SIZE / 2;
        const py = -2 * y + LENS_SIZE / 2;
        zoomInner.style.backgroundPosition = `${px}px ${py}px`;
        const lensX = Math.max(0, Math.min(rect.width - LENS_SIZE, x - LENS_SIZE / 2));
        const lensY = Math.max(0, Math.min(rect.height - LENS_SIZE, y - LENS_SIZE / 2));
        zoomLens.style.left = `${lensX}px`;
        zoomLens.style.top = `${lensY}px`;
    });
    // When thumbnails switch image, zoom uses the new visible img (handled in switchToImage)
}

// Initialize swipe navigation - OPTIMIZED for instant response (mobile + desktop)
function initSwipeNavigation(product) {
    if (!product || !product.images || product.images.length <= 1) return;
    
    const gallery = document.querySelector('.product-gallery');
    const mainImageContainer = document.getElementById('product-image');
    
    if (!gallery || !mainImageContainer) return;
    
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    let isSwiping = false;
    const minSwipeDistance = 30; // REDUCED from 50px to 30px for faster response
    
    // Desktop: Mouse wheel support for instant scrolling
    let wheelTimeout = null;
    gallery.addEventListener('wheel', (e) => {
        // Only handle horizontal scrolling
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
            e.preventDefault();
            
            // Clear any pending wheel event
            if (wheelTimeout) clearTimeout(wheelTimeout);
            
            // Instant response - no debounce for maximum speed
            const currentIndex = window.currentProductImageIndex[product.id] || 0;
            let newIndex = currentIndex;
            
            // Scroll right (positive deltaX) = next image
            if (e.deltaX > 10) {
                newIndex = currentIndex + 1;
                if (newIndex >= product.images.length) {
                    newIndex = 0; // Loop to first
                }
            }
            // Scroll left (negative deltaX) = previous image
            else if (e.deltaX < -10) {
                newIndex = currentIndex - 1;
                if (newIndex < 0) {
                    newIndex = product.images.length - 1; // Loop to last
                }
            }
            
            if (newIndex !== currentIndex) {
                switchToImage(newIndex, product);
            }
        }
    }, { passive: false });
    
    // Desktop: Keyboard arrow keys for instant navigation
    document.addEventListener('keydown', (e) => {
        // Only handle if gallery is visible and user is on product page
        if (!gallery || !mainImageContainer || !document.getElementById('product-title')) return;
        
        const currentIndex = window.currentProductImageIndex[product.id] || 0;
        let newIndex = currentIndex;
        
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            newIndex = currentIndex + 1;
            if (newIndex >= product.images.length) newIndex = 0;
            switchToImage(newIndex, product);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            newIndex = currentIndex - 1;
            if (newIndex < 0) newIndex = product.images.length - 1;
            switchToImage(newIndex, product);
        }
    });
    
    // Touch start - OPTIMIZED for instant response
    gallery.addEventListener('touchstart', (e) => {
        if (!e.touches.length) return;
        touchStartX = e.touches[0].screenX;
        touchStartY = e.touches[0].screenY;
        isSwiping = true;
    }, { passive: true });
    
    // Touch move - prevent default scrolling while swiping horizontally
    gallery.addEventListener('touchmove', (e) => {
        if (!isSwiping || !e.touches.length) return;
        
        const currentX = e.touches[0].screenX;
        const currentY = e.touches[0].screenY;
        const deltaX = Math.abs(currentX - touchStartX);
        const deltaY = Math.abs(currentY - touchStartY);
        
        // If horizontal movement is greater than vertical, prevent vertical scroll
        if (deltaX > deltaY && deltaX > 10) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Touch end
    gallery.addEventListener('touchend', (e) => {
        if (!isSwiping) return;
        
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        
        // OPTIMIZED: Process swipe instantly with reduced threshold
        if (absDeltaX > absDeltaY && absDeltaX > minSwipeDistance) {
            const currentIndex = window.currentProductImageIndex[product.id] || 0;
            let newIndex = currentIndex;
            
            // Swipe left (right to left) = next image
            if (deltaX < 0) {
                newIndex = currentIndex + 1;
                if (newIndex >= product.images.length) {
                    newIndex = 0; // Loop to first image
                }
            }
            // Swipe right (left to right) = previous image
            else if (deltaX > 0) {
                newIndex = currentIndex - 1;
                if (newIndex < 0) {
                    newIndex = product.images.length - 1; // Loop to last image
                }
            }
            
            // Instant switch - no delay
            if (newIndex !== currentIndex) {
                switchToImage(newIndex, product);
            }
        }
        
        isSwiping = false;
    }, { passive: true });
    
    // Touch cancel
    gallery.addEventListener('touchcancel', () => {
        isSwiping = false;
    }, { passive: true });
}

function loadRelatedProducts(currentProduct) {
    const relatedGrid = document.getElementById('related-products');
    if (!relatedGrid) return;
    
    // Get products from the SAME chapter, excluding current product
    let related = [];
    
    if (currentProduct.chapter) {
        // Get all products from the same chapter
        related = window.ProductsAPI.getByChapter(currentProduct.chapter)
            .filter(p => p.id !== currentProduct.id);
    }
    
    // If not enough products in same chapter, fall back to same category
    if (related.length < 4) {
        const categoryProducts = window.ProductsAPI.getByCategory(currentProduct.category)
            .filter(p => p.id !== currentProduct.id && (!currentProduct.chapter || p.chapter !== currentProduct.chapter));
        related = [...related, ...categoryProducts].slice(0, 4);
    } else {
        // Show only 4 products from same chapter
        related = related.slice(0, 4);
    }
    
    // Final fallback: if still not enough, add any other products
    if (related.length < 4) {
        const others = window.ProductsAPI.getAll()
            .filter(p => p.id !== currentProduct.id && !related.find(r => r.id === p.id));
        related = [...related, ...others].slice(0, 4);
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
            <button class="quick-add" data-product-id="${product.id}">${(() => {
                // CRITICAL: Chapter I products (IDs 1-5) ALWAYS show "Add to Cart"
                if (product.id >= 1 && product.id <= 5) {
                    return 'Add to Cart';
                }
                const productChapter = product.chapter === 'chapter_i' ? 'chapter-1' : 
                                      product.chapter === 'chapter_ii' ? 'chapter-2' : null;
                const isCreated = productChapter && window.ChapterMode?.isChapterCreated(productChapter);
                const chapterMode = productChapter ? window.ChapterMode?.getChapterMode(productChapter) : null;
                if (isCreated && chapterMode === 'waitlist') {
                    return 'Join the Waitlist';
                }
                return 'Add to Cart';
            })()}</button>
        </article>
    `).join('');
}

// Show waitlist email form modal
// addToCartAfterEmail: if true, add to cart after email is submitted (for quick-add buttons)
function showWaitlistEmailForm(product, size, color, quantity, addToCartAfterEmail = false) {
    // Check if modal already exists
    let modal = document.getElementById('waitlist-email-modal');
    if (modal) {
        modal.remove();
    }
    
    // Check if user is logged in
    const isLoggedIn = window.ChapterMode?.isUserLoggedIn() || 
                      !!(window.AuthSystem?.currentUser || window.auth?.currentUser);
    
    // Get user info if logged in
    let userName = '';
    let userEmail = '';
    if (isLoggedIn) {
        const currentUser = window.AuthSystem?.currentUser || window.auth?.currentUser;
        userEmail = currentUser?.email || '';
        const profile = JSON.parse(localStorage.getItem('sandroSandriProfile') || 'null');
        userName = profile?.name || userEmail.split('@')[0] || '';
    }
    
    // Create modal
    modal = document.createElement('div');
    modal.id = 'waitlist-email-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--space-lg);
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        max-width: 500px;
        width: 100%;
        padding: var(--space-xl);
        border-radius: 4px;
        position: relative;
    `;
    
    // Build form HTML with conditional name field
    let formHTML = `
        <button class="close-waitlist-modal" style="position: absolute; top: var(--space-md); right: var(--space-md); background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--color-text-light); line-height: 1;">&times;</button>
        <h2 style="font-family: var(--font-serif); font-size: 1.5rem; color: var(--color-navy); margin-bottom: var(--space-md);">
            Join the Waitlist
        </h2>
        <p style="font-family: var(--font-sans); font-size: 0.875rem; color: var(--color-text); margin-bottom: var(--space-lg);">
            Please provide your information to join the waitlist and be notified when this product becomes available.
        </p>
        <form id="waitlist-email-form" style="margin-top: var(--space-lg);">
    `;
    
    // Add name field if user is not logged in
    if (!isLoggedIn) {
        formHTML += `
            <div class="form-group" style="margin-bottom: var(--space-md);">
                <label class="form-label" for="waitlist-name" style="display: block; font-family: var(--font-sans); font-size: 0.875rem; color: var(--color-text); margin-bottom: var(--space-xs);">
                    Name *
                </label>
                <input 
                    type="text" 
                    id="waitlist-name" 
                    name="name" 
                    required 
                    autocomplete="name"
                    style="width: 100%; padding: var(--space-sm); font-family: var(--font-sans); font-size: 0.875rem; border: 1px solid var(--color-gray); border-radius: 2px; box-sizing: border-box;"
                    placeholder="Your full name"
                >
            </div>
        `;
    }
    
    formHTML += `
            <div class="form-group" style="margin-bottom: var(--space-md);">
                <label class="form-label" for="waitlist-email" style="display: block; font-family: var(--font-sans); font-size: 0.875rem; color: var(--color-text); margin-bottom: var(--space-xs);">
                    Email Address *
                </label>
                <input 
                    type="email" 
                    id="waitlist-email" 
                    name="email" 
                    required 
                    autocomplete="email"
                    value="${userEmail}"
                    style="width: 100%; padding: var(--space-sm); font-family: var(--font-sans); font-size: 0.875rem; border: 1px solid var(--color-gray); border-radius: 2px; box-sizing: border-box;"
                    placeholder="your.email@example.com"
                >
            </div>
            <div id="waitlist-error" style="display: none; padding: var(--space-sm); background: #fee; border: 1px solid #fcc; color: #c00; border-radius: 2px; margin-bottom: var(--space-md); font-size: 0.875rem;"></div>
            <div id="waitlist-success" style="display: none; padding: var(--space-sm); background: #efe; border: 1px solid #cfc; color: #0c0; border-radius: 2px; margin-bottom: var(--space-md); font-size: 0.875rem;"></div>
            <div style="display: flex; gap: var(--space-sm); justify-content: flex-end;">
                <button type="submit" id="waitlist-submit-btn" style="width: 100%; padding: 18px 24px; font-family: var(--font-sans); font-size: 1rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; background: var(--color-navy); color: white; border: none; border-radius: 2px; cursor: pointer; min-height: 56px;">
                    Join Waitlist
                </button>
            </div>
        </form>
    `;
    
    modalContent.innerHTML = formHTML;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Store product info for later use
    modal.dataset.productId = product.id;
    modal.dataset.size = size;
    modal.dataset.color = color || '';
    modal.dataset.quantity = quantity;
    modal.dataset.addToCartAfter = addToCartAfterEmail ? 'true' : 'false';
    
    // Close modal handlers
    const closeBtn = modal.querySelector('.close-waitlist-modal');
    const closeModal = () => {
        modal.remove();
    };
    
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Form submission
    const form = document.getElementById('waitlist-email-form');
    const emailInput = document.getElementById('waitlist-email');
    const nameInput = document.getElementById('waitlist-name');
    const errorEl = document.getElementById('waitlist-error');
    const successEl = document.getElementById('waitlist-success');
    const submitBtn = document.getElementById('waitlist-submit-btn');
    
    // Prevent duplicate event listeners - remove any existing listener first
    const existingHandler = form._waitlistSubmitHandler;
    if (existingHandler) {
        form.removeEventListener('submit', existingHandler);
    }
    
    // Create a named handler function that we can track
    const waitlistSubmitHandler = async (e) => {
        e.preventDefault();
        e.stopImmediatePropagation(); // Prevent any other handlers from running
        
        // Prevent duplicate submissions
        if (form._isSubmitting) {
            console.log('Waitlist form already submitting, ignoring duplicate submission');
            return;
        }
        form._isSubmitting = true;
        
        const email = emailInput.value.trim();
        const name = nameInput ? nameInput.value.trim() : (userName || 'Customer');
        
        // Validate name if not logged in
        if (!isLoggedIn && !name) {
            errorEl.textContent = 'Please enter your name';
            errorEl.style.display = 'block';
            successEl.style.display = 'none';
            return;
        }
        
        if (!email) {
            errorEl.textContent = 'Please enter your email address';
            errorEl.style.display = 'block';
            successEl.style.display = 'none';
            return;
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errorEl.textContent = 'Please enter a valid email address';
            errorEl.style.display = 'block';
            successEl.style.display = 'none';
            return;
        }
        
        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        errorEl.style.display = 'none';
        successEl.style.display = 'none';
        
        try {
            // CRITICAL: Use the quantity that was passed when the form was created
            // The quantity input on the product page might have changed, but we want the quantity
            // that was selected when the user clicked "Join the Waitlist"
            // However, if the user wants to use the current quantity input, we can read it
            // But to be safe, use the quantity parameter that was passed (which is the quantity at click time)
            const actualQuantity = parseInt(quantity) || 1;
            
            // Ensure quantity is valid
            if (actualQuantity < 1) {
                errorEl.textContent = 'Quantity must be at least 1';
                errorEl.style.display = 'block';
                successEl.style.display = 'none';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Join Waitlist';
                form._isSubmitting = false;
                return;
            }
            
            console.log('🛒 Waitlist form: Adding to cart with quantity:', actualQuantity, 'for product:', product.id, 'size:', size);
            
            // Get active chapter info
            const activeChapterId = window.ChapterMode?.getActiveChapterId();
            const activeChapterMode = window.ChapterMode?.getActiveChapterMode();
            const chapterNum = activeChapterId ? parseInt(activeChapterId.replace('chapter-', '')) : 1;
            const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
            const chapterName = `Chapter ${roman[chapterNum - 1] || chapterNum}`;
            
            // Submit waitlist entry to database
            const waitlistData = {
                customer_name: name,
                customer_email: email,
                product_id: product.id,
                product_name: product.name,
                product_sku: product.sku || 'N/A',
                size: size,
                color: color || 'Navy',
                quantity: actualQuantity, // Use the actual quantity from input field
                chapter: chapterName,
                chapter_id: activeChapterId || 'chapter-1',
                chapter_mode: activeChapterMode || 'waitlist',
                page_url: window.location.href,
                user_status: isLoggedIn ? 'Logged In' : 'Guest'
            };
            
            console.log('📧 Submitting waitlist entry:', waitlistData);
            
            const response = await fetch('/api/waitlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(waitlistData)
            });
            
            console.log('📧 Waitlist API response status:', response.status);
            
            if (response.ok) {
                const responseData = await response.json().catch(() => ({}));
                console.log('✅ Waitlist entry saved successfully:', responseData);
                
                successEl.textContent = 'Successfully joined the waitlist! You will be notified when this product becomes available.';
                successEl.style.display = 'block';
                
                // IMPORTANT: Waitlist mode does NOT add items to cart
                // It only sends the waitlist entry to the Owner Mode page
                // The customer will be notified when the product becomes available
                
                // Close modal after 2 seconds
                setTimeout(() => {
                    closeModal();
                    showNotification('Successfully joined the waitlist!', 'success');
                }, 2000);
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('❌ Waitlist submission failed:', errorData);
                throw new Error(errorData.error || 'Failed to submit waitlist request');
            }
        } catch (error) {
            console.error('Error submitting waitlist:', error);
            errorEl.textContent = `Error joining waitlist: ${error.message || 'Please try again.'}`;
            errorEl.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Join Waitlist';
            form._isSubmitting = false;
        }
    };
    
    // Store the handler so we can remove it later if needed
    form._waitlistSubmitHandler = waitlistSubmitHandler;
    form.addEventListener('submit', waitlistSubmitHandler);
    
    // Focus first input
    setTimeout(() => {
        if (nameInput && !isLoggedIn) {
            nameInput.focus();
        } else {
            emailInput.focus();
        }
    }, 100);
}

// Make function globally accessible
window.showWaitlistEmailForm = showWaitlistEmailForm;

