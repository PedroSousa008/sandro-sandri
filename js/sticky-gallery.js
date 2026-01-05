/* ========================================
   Sticky Gallery Fix for Product Page
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    const gallery = document.querySelector('.product-gallery');
    if (!gallery) return;
    
    const navHeight = 80;
    let isMobile = window.innerWidth <= 768;
    
    // On mobile, use fixed positioning
    function setupMobileFixed() {
        if (!isMobile) return;
        
        gallery.style.position = 'fixed';
        gallery.style.top = navHeight + 'px';
        gallery.style.left = '0';
        gallery.style.right = '0';
        gallery.style.width = '100%';
        gallery.style.zIndex = '100';
        gallery.style.background = '#ffffff';
        gallery.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        
        // Add padding to product section to account for fixed gallery
        const section = gallery.closest('.product-section');
        const details = document.querySelector('.product-details');
        
        if (section) {
            const galleryHeight = gallery.offsetHeight;
            section.style.paddingTop = (galleryHeight + navHeight) + 'px';
        }
        
        if (details) {
            const galleryHeight = gallery.offsetHeight;
            details.style.marginTop = (galleryHeight + navHeight) + 'px';
        }
    }
    
    // Force sticky positioning via JavaScript if CSS fails (desktop)
    function enforceSticky() {
        if (isMobile) {
            setupMobileFixed();
            return;
        }
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const section = gallery.closest('.product-section');
        if (!section) return;
        
        const sectionTop = section.getBoundingClientRect().top + scrollTop;
        const sectionBottom = sectionTop + section.offsetHeight;
        const galleryHeight = gallery.offsetHeight;
        
        // Check if we've scrolled past the section start
        if (scrollTop >= sectionTop - navHeight) {
            // Check if we haven't scrolled past the section end
            if (scrollTop + navHeight + galleryHeight <= sectionBottom) {
                gallery.style.position = 'fixed';
                gallery.style.top = navHeight + 'px';
                gallery.style.left = gallery.getBoundingClientRect().left + 'px';
                gallery.style.width = gallery.getBoundingClientRect().width + 'px';
                gallery.style.zIndex = '10';
            } else {
                // At bottom of section, stick to bottom
                gallery.style.position = 'absolute';
                gallery.style.top = 'auto';
                gallery.style.bottom = '0';
            }
        } else {
            // Before section, use relative positioning
            gallery.style.position = 'relative';
            gallery.style.top = 'auto';
            gallery.style.left = 'auto';
            gallery.style.width = 'auto';
        }
    }
    
    // Check if CSS sticky is working
    function checkStickySupport() {
        const computedStyle = window.getComputedStyle(gallery);
        const isSticky = computedStyle.position === 'sticky' || computedStyle.position === '-webkit-sticky';
        return isSticky;
    }
    
    // Setup based on device
    if (isMobile) {
        console.log('Mobile detected - using fixed positioning for gallery');
        setupMobileFixed();
        
        // Update on resize
        window.addEventListener('resize', () => {
            const wasMobile = isMobile;
            isMobile = window.innerWidth <= 768;
            if (wasMobile !== isMobile) {
                location.reload(); // Reload on significant size change
            } else if (isMobile) {
                setupMobileFixed();
            }
        }, { passive: true });
    } else if (!checkStickySupport()) {
        console.log('CSS sticky not working, using JavaScript fallback');
        
        // Use requestAnimationFrame for smooth scrolling
        let ticking = false;
        function onScroll() {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    enforceSticky();
                    ticking = false;
                });
                ticking = true;
            }
        }
        
        window.addEventListener('scroll', onScroll, { passive: true });
        enforceSticky(); // Initial call
    } else {
        console.log('CSS sticky is working correctly');
    }
});

