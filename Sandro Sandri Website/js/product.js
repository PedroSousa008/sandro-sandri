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
    loadRelatedProducts(product);
}

function populateProduct(product) {
    // Update page title
    document.title = `${product.name} | Sandro Sandri`;
    
    // Update breadcrumb
    document.getElementById('breadcrumb-product').textContent = product.name;
    
    // Update product info
    document.getElementById('product-sku').textContent = product.sku;
    document.getElementById('product-title').textContent = product.name;
    document.getElementById('product-price').textContent = window.ProductsAPI.formatPrice(product.price);
    document.getElementById('product-description').textContent = product.description;
    
    // Update form product ID
    document.getElementById('add-to-cart-form').dataset.productId = product.id;
    
    // Populate details list
    const detailsList = document.getElementById('product-details-list');
    if (detailsList && product.details) {
        detailsList.innerHTML = product.details.map(detail => `<li>${detail}</li>`).join('');
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
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const size = document.getElementById('selected-size-input').value;
        const color = document.getElementById('selected-color-input').value;
        const quantity = parseInt(document.querySelector('.quantity-input').value) || 1;
        
        // Add to cart
        window.cart.addItem(product.id, size, color, quantity);
        
        // Open cart drawer
        const cartDrawer = document.querySelector('.cart-drawer');
        const cartOverlay = document.querySelector('.cart-overlay');
        if (cartDrawer) {
            cartDrawer.classList.add('open');
            cartOverlay?.classList.add('visible');
            document.body.classList.add('cart-open');
        }
    });
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
                    <div class="image-placeholder product-placeholder">
                        <span>${product.sku}</span>
                    </div>
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


