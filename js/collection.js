/* ========================================
   Sandro Sandri - Collection Page
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    initCollection();
});

function initCollection() {
    const productsGrid = document.getElementById('products-grid');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const sortSelect = document.getElementById('sort-select');
    
    if (!productsGrid) return;

    let currentCategory = 'all';
    let currentSort = 'featured';

    // Check URL params for category
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    if (categoryParam) {
        currentCategory = categoryParam;
        filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === categoryParam);
        });
    }

    // Initial render
    renderProducts();

    // Filter buttons
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            renderProducts();
            
            // Update URL without reload
            const newUrl = currentCategory === 'all' 
                ? window.location.pathname 
                : `${window.location.pathname}?category=${currentCategory}`;
            history.pushState({}, '', newUrl);
        });
    });

    // Sort select
    sortSelect?.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderProducts();
    });

    function renderProducts() {
        let products = window.ProductsAPI.getByCategory(currentCategory);
        
        // Sort products
        products = sortProducts(products, currentSort);

        // Render products
        productsGrid.innerHTML = products.map(product => `
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

        // Animate cards
        animateCards();
    }

    function sortProducts(products, sortType) {
        const sorted = [...products];
        
        switch (sortType) {
            case 'price-low':
                sorted.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                sorted.sort((a, b) => b.price - a.price);
                break;
            case 'name':
                sorted.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'featured':
            default:
                sorted.sort((a, b) => b.featured - a.featured);
                break;
        }
        
        return sorted;
    }

    function animateCards() {
        const cards = productsGrid.querySelectorAll('.product-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            
            setTimeout(() => {
                card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }
}


