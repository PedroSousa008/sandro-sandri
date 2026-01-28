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

        // Update button state
        const originalText = button.textContent;
        button.textContent = 'Subscribing...';
        button.disabled = true;

        try {
            // Send email to Formspree
            const response = await fetch('https://formspree.io/f/meoyldeq', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    _subject: 'New Newsletter Subscription - Join the Few',
                    _replyto: email,
                    message: `A new subscriber has joined the newsletter.\n\nEmail: ${email}\n\nTimestamp: ${new Date().toLocaleString()}`,
                    email: email,
                    source: 'Newsletter Subscription'
                })
            });

            if (response.ok) {
                // Success state
                button.textContent = 'Subscribed!';
                input.value = '';

                setTimeout(() => {
                    button.textContent = originalText;
                    button.disabled = false;
                }, 3000);

                // Show notification
                showNotification('Thank you for subscribing!');
            } else {
                throw new Error('Submission failed');
            }
        } catch (error) {
            console.error('Error submitting newsletter subscription:', error);
            button.textContent = 'Error - Try Again';
            button.disabled = false;
            
            setTimeout(() => {
                button.textContent = originalText;
            }, 3000);
            
            showNotification('Something went wrong. Please try again.');
        }
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
    // Wait a bit for DOM to be fully ready
    setTimeout(() => {
        // Only run on homepage
        const collectionPreview = document.querySelector('.collection-preview');
        if (!collectionPreview) return;
        
        // Get all quick-add buttons
        const quickAddButtons = document.querySelectorAll('.quick-add');
        if (quickAddButtons.length === 0) return;
        
        quickAddButtons.forEach((btn) => {
            // Remove any existing listeners by cloning
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            // Add click listener
            newBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const productId = parseInt(this.dataset.productId);
                if (!productId || !window.ProductsAPI) return;
                
                const product = window.ProductsAPI.getById(productId);
                if (!product || !product.sizes || product.sizes.length === 0) return;
                
                // Check if size selector already exists
                const existingSelector = this.parentElement.querySelector('.inline-size-selector');
                if (existingSelector) {
                    // Toggle visibility
                    existingSelector.classList.toggle('visible');
                    return;
                }
                
                // Create inline size selector
                createInlineSizeSelector(this, product);
            });
        });
    }, 200);
}

function createInlineSizeSelector(button, product) {
    // Find the product card
    const productCard = button.closest('.product-card');
    if (!productCard) return;
    
    // Remove existing selector if any
    const existingSelector = productCard.querySelector('.inline-size-selector');
    if (existingSelector) {
        existingSelector.remove();
    }
    
    // Create size selector container
    const sizeSelector = document.createElement('div');
    sizeSelector.className = 'inline-size-selector visible';
    
    // Create size buttons with separators
    product.sizes.forEach((size, index) => {
        const sizeBtn = document.createElement('button');
        sizeBtn.type = 'button';
        sizeBtn.className = 'inline-size-btn';
        sizeBtn.textContent = size;
        sizeBtn.dataset.size = size;
        
        sizeBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Check if in WAITLIST mode
            if (window.CommerceMode && window.CommerceMode.isWaitlistMode()) {
                // Check if user is logged in
                const isLoggedIn = window.CommerceMode.isUserLoggedIn();
                
                if (!isLoggedIn) {
                    // Show email form first, then add to cart after email is submitted
                    if (window.showWaitlistEmailForm) {
                        window.showWaitlistEmailForm(product, size, null, 1, true); // true = add to cart after email
                    }
                    // Remove size selector
                    sizeSelector.remove();
                } else {
                    // User is logged in - send Formspree and add to cart
                    // Get user information
                    const currentUser = window.AuthSystem?.currentUser || window.auth?.currentUser;
                    const userEmail = currentUser?.email || '';
                    const profile = JSON.parse(localStorage.getItem('sandroSandriProfile') || 'null');
                    const userName = profile?.name || userEmail.split('@')[0] || 'Customer';
                    
                    // Send to Formspree for logged-in users
                    try {
                        // Determine chapter for the product
                        const isChapterII = product.id >= 6 && product.id <= 10;
                        const chapter = isChapterII ? 'Chapter II' : 'Chapter I';
                        
                        const waitlistData = {
                            _subject: `Waitlist Request - ${product.name} (${chapter}) - Logged In User`,
                            product_id: product.id,
                            product_name: product.name,
                            chapter: chapter,
                            size: size,
                            color: null,
                            quantity: 1,
                            customer_email: userEmail,
                            customer_name: userName,
                            timestamp: new Date().toISOString(),
                            _replyto: userEmail,
                            user_status: 'Logged In'
                        };
                        
                        // Send to Formspree (fire and forget - don't wait for response)
                        fetch('https://formspree.io/f/meoyldeq', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify(waitlistData)
                        }).catch(err => {
                            console.error('Error sending waitlist Formspree for logged-in user:', err);
                            // Don't show error to user - just log it
                        });
                    } catch (error) {
                        console.error('Error preparing waitlist Formspree for logged-in user:', error);
                    }
                    
                    // Add to cart
                    if (window.cart) {
                        window.cart.addItem(product.id, size, null, 1);
                        showNotification('Item added to cart!', 'success');
                    }
                    // Remove size selector
                    sizeSelector.remove();
                }
            } else {
                // Normal mode - add to cart directly
                if (window.cart) {
                    window.cart.addItem(product.id, size, null, 1);
                }
                // Remove size selector
                sizeSelector.remove();
            }
        });
        
        sizeSelector.appendChild(sizeBtn);
        
        // Add separator after each button except the last one
        if (index < product.sizes.length - 1) {
            const separator = document.createElement('span');
            separator.className = 'size-separator';
            separator.textContent = ' / ';
            sizeSelector.appendChild(separator);
        }
    });
    
    // Insert right after the Add to Cart button
    button.insertAdjacentElement('afterend', sizeSelector);
    
    // Close when clicking outside
    setTimeout(() => {
        const closeOnOutsideClick = (e) => {
            if (!sizeSelector.contains(e.target) && !button.contains(e.target) && !productCard.contains(e.target)) {
                sizeSelector.remove();
                document.removeEventListener('click', closeOnOutsideClick);
            }
        };
        document.addEventListener('click', closeOnOutsideClick);
    }, 10);
}

function openSizeSelectionModal(product) {
    console.log('=== OPENING SIZE MODAL ===');
    console.log('Product:', product);
    
    // Remove existing modal if any
    const existingModal = document.getElementById('size-selection-modal');
    if (existingModal) {
        console.log('Removing existing modal');
        existingModal.remove();
    }
    
    // Create new modal
    const sizeModal = document.createElement('div');
    sizeModal.id = 'size-selection-modal';
    sizeModal.className = 'size-selection-modal';
    document.body.appendChild(sizeModal);
    console.log('Modal element created and added to body');

    // Check if product has sizes
    if (!product.sizes || product.sizes.length === 0) {
        console.error('Product has no sizes:', product);
        // Fallback: add to cart with default
        if (window.cart) {
            window.cart.addItem(product.id, null, null, 1);
        }
        return;
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
                <button type="button" class="size-add-btn" data-product-id="${product.id}" disabled>Add to Cart</button>
            </div>
        </div>
    `;

    // Show modal immediately - force all styles
    console.log('Setting modal to visible...');
    sizeModal.style.cssText = 'position: fixed; inset: 0; z-index: 10000; display: flex !important; align-items: center; justify-content: center; opacity: 1 !important; visibility: visible !important; pointer-events: auto !important;';
    sizeModal.classList.add('visible');
    document.body.style.overflow = 'hidden';
    
    console.log('Modal should now be visible');
    console.log('Modal element:', sizeModal);
    console.log('Modal classes:', sizeModal.className);
    console.log('Modal styles:', {
        display: sizeModal.style.display,
        opacity: sizeModal.style.opacity,
        visibility: sizeModal.style.visibility
    });

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
        sizeModal.style.display = 'none';
        document.body.style.overflow = '';
    }
}


