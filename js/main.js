/* ========================================
   Sandro Sandri - Main JavaScript
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all modules
    initNavigation();
    initMenuToggle();
    initSearchOverlay();
    initCartDrawer();
    initScrollEffects();
    initAnimations();
    initNewsletter();
    initFiltersPanel();
    initHomepageQuickAdd();
});

/* ========================================
   Navigation
   ======================================== */
function initNavigation() {
    const nav = document.querySelector('.main-nav');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;

        // Add scrolled class
        if (currentScroll > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }

        lastScroll = currentScroll;
    });
}

/* ========================================
   Menu Toggle
   ======================================== */
function initMenuToggle() {
    const menuToggle = document.querySelector('.menu-toggle');
    const menuClose = document.querySelector('.menu-close');
    const sideMenu = document.querySelector('.side-menu');
    const menuOverlay = document.querySelector('.menu-overlay');

    if (!menuToggle || !sideMenu) return;

    function openMenu() {
        sideMenu.classList.add('open');
        menuOverlay.classList.add('visible');
        document.body.classList.add('menu-open');
    }

    function closeMenu() {
        sideMenu.classList.remove('open');
        menuOverlay.classList.remove('visible');
        document.body.classList.remove('menu-open');
    }

    menuToggle.addEventListener('click', openMenu);
    menuClose?.addEventListener('click', closeMenu);
    menuOverlay?.addEventListener('click', closeMenu);

    // Close on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sideMenu.classList.contains('open')) {
            closeMenu();
        }
    });
}

/* ========================================
   Search Overlay
   ======================================== */
function initSearchOverlay() {
    const searchToggle = document.querySelector('.search-toggle');
    const searchClose = document.querySelector('.search-close');
    const searchOverlay = document.querySelector('.search-overlay');
    const searchInput = document.querySelector('.search-input');

    if (!searchToggle || !searchOverlay) return;

    function openSearch() {
        searchOverlay.classList.add('open');
        document.body.classList.add('search-open');
        setTimeout(() => searchInput?.focus(), 300);
    }

    function closeSearch() {
        searchOverlay.classList.remove('open');
        document.body.classList.remove('search-open');
    }

    searchToggle.addEventListener('click', openSearch);
    searchClose?.addEventListener('click', closeSearch);

    // Close on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && searchOverlay.classList.contains('open')) {
            closeSearch();
        }
    });
}

/* ========================================
   Cart Drawer
   ======================================== */
function initCartDrawer() {
    const cartIcon = document.querySelector('.cart-icon');
    const cartDrawer = document.querySelector('.cart-drawer');
    const cartClose = document.querySelector('.cart-drawer-close');
    const cartOverlay = document.querySelector('.cart-overlay');

    if (!cartDrawer) return;

    function openCart() {
        cartDrawer.classList.add('open');
        cartOverlay.classList.add('visible');
        document.body.classList.add('cart-open');
    }

    function closeCart() {
        cartDrawer.classList.remove('open');
        cartOverlay.classList.remove('visible');
        document.body.classList.remove('cart-open');
    }

    // Only open drawer on icon click if not navigating to cart page
    cartIcon?.addEventListener('click', (e) => {
        // Check if it's supposed to be a link
        if (cartIcon.tagName === 'A' && cartIcon.getAttribute('href')) {
            // On mobile, prevent navigation and open drawer instead
            if (window.innerWidth < 768) {
                e.preventDefault();
                openCart();
            }
            // On desktop, allow navigation
        } else {
            openCart();
        }
    });

    cartClose?.addEventListener('click', closeCart);
    cartOverlay?.addEventListener('click', closeCart);

    // Close on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && cartDrawer.classList.contains('open')) {
            closeCart();
        }
    });

    // Open cart after adding item (optional, can be enabled)
    // window.addEventListener('itemAdded', openCart);
}

/* ========================================
   Scroll Effects
   ======================================== */
function initScrollEffects() {
    // Scroll-triggered animations
    const animatedElements = document.querySelectorAll('.animate-on-scroll, .stagger-children');

    if (!animatedElements.length) return;

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    animatedElements.forEach(el => observer.observe(el));
}

/* ========================================
   Animations
   ======================================== */
function initAnimations() {
    // Add animation classes to sections
    const sections = document.querySelectorAll('.featured-section, .collection-preview, .story-section, .newsletter-section');
    
    sections.forEach(section => {
        const cards = section.querySelectorAll('.featured-card, .product-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
        });
    });

    // Intersection observer for section animations
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const cards = entry.target.querySelectorAll('.featured-card, .product-card');
                cards.forEach((card, index) => {
                    setTimeout(() => {
                        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, index * 100);
                });
                sectionObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    sections.forEach(section => sectionObserver.observe(section));

    // Parallax effect on scroll
    const parallaxElements = document.querySelectorAll('.parallax');
    if (parallaxElements.length) {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            parallaxElements.forEach(el => {
                const speed = el.dataset.speed || 0.5;
                el.style.transform = `translateY(${scrolled * speed}px)`;
            });
        });
    }
}

/* ========================================
   Newsletter Form
   ======================================== */
function initNewsletter() {
    const form = document.getElementById('newsletter-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const input = form.querySelector('.newsletter-input');
        const button = form.querySelector('.newsletter-button');
        const email = input.value.trim();

        if (!email) return;

        // Simulate submission
        button.textContent = 'Subscribing...';
        button.disabled = true;

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Success state
        button.textContent = 'Subscribed!';
        input.value = '';

        setTimeout(() => {
            button.textContent = 'Subscribe';
            button.disabled = false;
        }, 3000);

        // Show notification
        showNotification('Thank you for subscribing!');
    });
}

/* ========================================
   Filters Panel
   ======================================== */
function initFiltersPanel() {
    const showFiltersBtn = document.getElementById('show-filters-btn');
    const closeFiltersBtn = document.getElementById('close-filters-btn');
    const filtersPanel = document.getElementById('filters-panel');
    const filtersOverlay = document.getElementById('filters-overlay');
    const clearFiltersBtn = document.querySelector('.clear-filters-btn');
    const applyFiltersBtn = document.querySelector('.apply-filters-btn');

    if (!showFiltersBtn || !filtersPanel) return;

    function openFilters() {
        filtersPanel.classList.add('open');
        filtersOverlay.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }

    function closeFilters() {
        filtersPanel.classList.remove('open');
        filtersOverlay.classList.remove('visible');
        document.body.style.overflow = '';
    }

    showFiltersBtn.addEventListener('click', openFilters);
    closeFiltersBtn?.addEventListener('click', closeFilters);
    filtersOverlay?.addEventListener('click', closeFilters);

    // Clear all filters
    clearFiltersBtn?.addEventListener('click', () => {
        const checkboxes = filtersPanel.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
        showNotification('Filters cleared');
    });

    // Apply filters
    applyFiltersBtn?.addEventListener('click', () => {
        const selectedFilters = [];
        const checkboxes = filtersPanel.querySelectorAll('input[type="checkbox"]:checked');
        checkboxes.forEach(cb => {
            selectedFilters.push({ name: cb.name, value: cb.value });
        });
        
        closeFilters();
        showNotification('Filters applied');
        
        // Here you would typically filter the products based on selectedFilters
        console.log('Applied filters:', selectedFilters);
    });

    // Close on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && filtersPanel.classList.contains('open')) {
            closeFilters();
        }
    });
}

/* ========================================
   Utility Functions
   ======================================== */
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

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href === '#') return;

        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Expose utility functions globally
window.SandroSandri = {
    showNotification
};

/* ========================================
   Collection Filter
   ======================================== */
function initCollectionFilter() {
    const urlParams = new URLSearchParams(window.location.search);
    const collection = urlParams.get('collection');
    
    if (!collection) return;
    
    // Collection to product IDs mapping
    const collectionProducts = {
        'voglia': [1, 2],        // Isole Cayman, Isola di Necker
        'connoisseur': [3],      // Monroe's Kisses
        'italia': [4],           // Sardinia
        'rinascimento': [5]      // Port-Coton
    };
    
    const productIds = collectionProducts[collection];
    if (!productIds) return;
    
    // Hide products not in this collection
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        const productId = parseInt(card.dataset.productId);
        if (!productIds.includes(productId)) {
            card.style.display = 'none';
        }
    });
    
    // Update the section title to show collection name
    const collectionNames = {
        'voglia': 'Voglia di Viaggiare',
        'connoisseur': 'Connoisseur',
        'italia': "L'Italia per un viaggio indimenticabile",
        'rinascimento': 'Rinascimento Couture'
    };
    
    const sectionTitle = document.querySelector('#collection-section .section-title');
    if (sectionTitle && collectionNames[collection]) {
        sectionTitle.textContent = collectionNames[collection];
    }
    
    // Add a "View All" link
    const productsGrid = document.querySelector('.products-grid');
    if (productsGrid) {
        const viewAllLink = document.createElement('div');
        viewAllLink.style.cssText = 'grid-column: 1 / -1; text-align: center; margin-top: 2rem;';
        viewAllLink.innerHTML = '<a href="index.html#collection-section" style="font-family: Arapey, serif; color: var(--color-navy); text-decoration: underline;">← View All Pieces</a>';
        productsGrid.parentNode.insertBefore(viewAllLink, productsGrid.nextSibling);
    }
}

// Initialize collection filter on page load
document.addEventListener('DOMContentLoaded', initCollectionFilter);

/* ========================================
   Homepage Quick Add with Size Selection
   ======================================== */
function initHomepageQuickAdd() {
    // Only run on homepage
    if (!document.querySelector('.collection-preview')) return;

    const quickAddButtons = document.querySelectorAll('.quick-add');
    
    quickAddButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const productId = parseInt(btn.dataset.productId);
            if (!productId || !window.ProductsAPI) return;
            
            const product = window.ProductsAPI.getById(productId);
            if (!product) return;
            
            // Open size selection modal
            openSizeSelectionModal(product);
        });
    });
}

function openSizeSelectionModal(product) {
    // Create or get size selection modal
    let sizeModal = document.getElementById('size-selection-modal');
    if (!sizeModal) {
        sizeModal = document.createElement('div');
        sizeModal.id = 'size-selection-modal';
        sizeModal.className = 'size-selection-modal';
        document.body.appendChild(sizeModal);
    }

    // Generate size options
    const sizeOptions = product.sizes.map(size => 
        `<button type="button" class="size-selection-btn" data-size="${size}">${size}</button>`
    ).join('');

    sizeModal.innerHTML = `
        <div class="size-modal-overlay"></div>
        <div class="size-modal-content">
            <div class="size-modal-header">
                <h3>Select Size</h3>
                <button class="size-modal-close" aria-label="Close">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="size-modal-body">
                <p class="size-modal-product-name">${product.name}</p>
                <div class="size-selection-options">
                    ${sizeOptions}
                </div>
            </div>
            <div class="size-modal-footer">
                <button type="button" class="size-add-btn" data-product-id="${product.id}">Add to Cart</button>
            </div>
        </div>
    `;

    // Show modal
    sizeModal.classList.add('visible');
    document.body.style.overflow = 'hidden';

    let selectedSize = null;

    // Size selection
    const sizeButtons = sizeModal.querySelectorAll('.size-selection-btn');
    sizeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            sizeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedSize = btn.dataset.size;
            
            // Enable add button
            const addBtn = sizeModal.querySelector('.size-add-btn');
            if (addBtn) {
                addBtn.disabled = false;
                addBtn.style.opacity = '1';
            }
        });
    });

    // Add to cart
    const addBtn = sizeModal.querySelector('.size-add-btn');
    addBtn.disabled = true;
    addBtn.style.opacity = '0.5';
    addBtn.addEventListener('click', () => {
        if (!selectedSize) return;
        
        if (window.cart) {
            window.cart.addItem(product.id, selectedSize, null, 1);
        }
        closeSizeSelectionModal();
    });

    // Close modal
    const closeBtn = sizeModal.querySelector('.size-modal-close');
    const overlay = sizeModal.querySelector('.size-modal-overlay');

    [closeBtn, overlay].forEach(el => {
        el?.addEventListener('click', () => {
            closeSizeSelectionModal();
        });
    });
}

function closeSizeSelectionModal() {
    const sizeModal = document.getElementById('size-selection-modal');
    if (sizeModal) {
        sizeModal.classList.remove('visible');
        document.body.style.overflow = '';
    }
}


