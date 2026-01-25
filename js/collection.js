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

    // Update chapter filter buttons based on launch dates
    updateChapterFilters();

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

    function updateChapterFilters() {
        // Hide/show chapter filter buttons based on launch dates
        filterButtons.forEach(btn => {
            const chapterId = btn.dataset.chapter;
            if (chapterId && window.FeatureFlags) {
                const shouldShow = window.FeatureFlags.shouldShowChapter(chapterId);
                if (!shouldShow) {
                    btn.style.display = 'none';
                } else {
                    btn.style.display = '';
                }
            }
        });
    }

    function renderProducts() {
        let products = window.ProductsAPI.getAll();
        
        // Filter by chapter (respects launch dates)
        if (currentChapter && window.FeatureFlags) {
            // Only filter if chapter should be shown
            if (window.FeatureFlags.shouldShowChapter(currentChapter)) {
                products = filterByChapter(products, currentChapter);
            } else {
                // If trying to view unpublished chapter, show nothing (or fallback to chapter-1)
                if (!window.FeatureFlags.isPreviewMode()) {
                    products = [];
                }
            }
        }
        
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
                <button class="quick-add" data-product-id="${product.id}">${window.CommerceMode && window.CommerceMode.isWaitlistMode() ? 'Join the Waitlist' : 'Add to Cart'}</button>
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
        
        // Center single product and view-all link
        if (products.length === 1) {
            productsGrid.style.display = 'flex';
            productsGrid.style.flexDirection = 'column';
            productsGrid.style.alignItems = 'center';
            productsGrid.style.justifyContent = 'center';
        } else {
            productsGrid.style.display = '';
            productsGrid.style.flexDirection = '';
            productsGrid.style.alignItems = '';
            productsGrid.style.justifyContent = '';
        }

        // Animate cards
        animateCards();

        // Add quick-add functionality
        initQuickAdd();
    }

    function filterByChapter(products, chapterId) {
        // Map chapter IDs to product IDs
        // Chapter I: Products 1-5 (current t-shirts)
        // Chapter II: Will be products 6+ (add when ready)
        const chapterProductMap = {
            'chapter-1': [1, 2, 3, 4, 5], // Current products
            'chapter-2': [6, 7, 8, 9, 10] // Future Chapter II products (add IDs when ready)
        };
        
        const productIds = chapterProductMap[chapterId];
        if (!productIds) return products; // If chapter not mapped, show all
        
        return products.filter(product => productIds.includes(product.id));
    }

    function filterByCollection(products, collectionKey) {
        const collectionMap = {
            'voglia': 'Voglia di Viaggiare Signature',
            'connoisseur': 'Connoisseur Signature',
            'italia': "L'Italia per un viaggio indimenticabile Signature",
            'rinascimento': 'Rinascimento Couture Signature'
        };
        
        const collectionTitle = collectionMap[collectionKey];
        if (!collectionTitle) return products;
        
        // Filter products by collection title
        return products.filter(product => 
            product.collection && product.collection.title === collectionTitle
        );
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
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const productId = parseInt(btn.dataset.productId);
                const product = window.ProductsAPI.getById(productId);
                if (!product) return;
                
                // Get default size from product or use 'M'
                const defaultSize = product.sizes && product.sizes.length > 0 ? product.sizes[0] : 'M';
                
                // Check if in WAITLIST mode
                if (window.CommerceMode && window.CommerceMode.isWaitlistMode()) {
                    // Check if user is logged in
                    const isLoggedIn = window.CommerceMode.isUserLoggedIn();
                    
                    if (!isLoggedIn) {
                        // Show email form first, then add to cart after email is submitted
                        if (window.showWaitlistEmailForm) {
                            window.showWaitlistEmailForm(product, defaultSize, null, 1, true); // true = add to cart after email
                        } else {
                            // Fallback: show email form from product.js
                            showWaitlistEmailFormForQuickAdd(product, defaultSize);
                        }
                    } else {
                        // User is logged in - add to cart directly
                        if (window.cart) {
                            window.cart.addItem(productId, defaultSize, null, 1);
                            showNotification('Item added to cart!', 'success');
                        }
                    }
                } else {
                    // Normal mode - add to cart directly
                    if (window.cart) {
                        window.cart.addItem(productId, defaultSize, null, 1);
                    }
                }
            });
        });
    }
    
    // Helper function to show email form for quick-add (collection page)
    function showWaitlistEmailFormForQuickAdd(product, size) {
        if (window.showWaitlistEmailForm) {
            window.showWaitlistEmailForm(product, size, null, 1, true);
        }
    }
}
