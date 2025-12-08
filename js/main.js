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

