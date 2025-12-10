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

    let currentChapter = 'chapter-1';
    let currentSort = 'featured';
    let currentCollection = null;

    // Check URL params for collection filter (from footer links)
    const urlParams = new URLSearchParams(window.location.search);
    const collectionParam = urlParams.get('collection');
    if (collectionParam) {
        currentCollection = collectionParam;
    }

    // Initial render
    renderProducts();

    // Filter buttons (for chapters)
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentChapter = btn.dataset.chapter;
            currentCollection = null; // Reset collection filter when selecting chapter
            renderProducts();
            
            // Update URL without reload
            history.pushState({}, '', window.location.pathname);
        });
    });

    // Sort select
    sortSelect?.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderProducts();
    });

    function renderProducts() {
        let products = window.ProductsAPI.getAll();
        
        // Filter by collection if set (from footer links)
        if (currentCollection) {
            products = filterByCollection(products, currentCollection);
        }
        
        // Sort products
        products = sortProducts(products, currentSort);

        // Render products
        productsGrid.innerHTML = products.map(product => `
            <article class="product-card" data-product-id="${product.id}">
                <a href="product.html?id=${product.id}" class="product-link">
                    <div class="product-image">
                        <img src="${product.images[1] || product.images[0]}" alt="${product.name}">
                    </div>
                    <div class="product-info">
                        <h3 class="product-name">${product.name}</h3>
                        <p class="product-price">${window.ProductsAPI.formatPrice(product.price)}</p>
                    </div>
                </a>
                <button class="quick-add" data-product-id="${product.id}">Add to Cart</button>
            </article>
        `).join('');

        // Add "View All" link if filtered
        if (currentCollection) {
            productsGrid.insertAdjacentHTML('beforeend', `
                <div class="view-all-container">
                    <a href="collection.html" class="view-all-link">View All Pieces</a>
                </div>
            `);
        }

        // Animate cards
        animateCards();

        // Add quick-add functionality
        initQuickAdd();
    }

    function filterByCollection(products, collectionKey) {
        const collectionMap = {
            'voglia': 'Voglia di Viaggiare',
            'connoisseur': 'Connoisseur',
            'italia': "L'Italia per un viaggio indimenticabile",
            'rinascimento': 'Rinascimento Couture'
        };
        
        const collectionName = collectionMap[collectionKey];
        if (!collectionName) return products;
        
        return products.filter(product => product.collection === collectionName);
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

    function initQuickAdd() {
        const quickAddButtons = productsGrid.querySelectorAll('.quick-add');
        quickAddButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const productId = parseInt(btn.dataset.productId);
                const product = window.ProductsAPI.getById(productId);
                if (product && window.cart) {
                    // Get default size from product or use 'M'
                    const defaultSize = product.sizes && product.sizes.length > 0 ? product.sizes[0] : 'M';
                    window.cart.addItem(productId, defaultSize, null, 1);
                }
            });
        });
    }
}
