/* ========================================
   Sticky Gallery Fix for Product Page (Desktop Only)
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    const gallery = document.querySelector('.product-gallery');
    if (!gallery) return;
    
    const navHeight = 80;
    let isMobile = window.innerWidth <= 768;
    
    // On mobile, ensure natural scrolling (no sticky/fixed)
    if (isMobile) {
        console.log('Mobile detected - using natural scrolling for gallery');
        
        // Remove any fixed/sticky positioning
        gallery.style.position = 'relative';
        gallery.style.top = 'auto';
        gallery.style.left = 'auto';
        gallery.style.right = 'auto';
        gallery.style.width = 'auto';
        gallery.style.zIndex = 'auto';
        gallery.style.background = 'transparent';
        gallery.style.boxShadow = 'none';
        
        // Update on resize
        window.addEventListener('resize', () => {
            const wasMobile = isMobile;
            isMobile = window.innerWidth <= 768;
            if (wasMobile !== isMobile) {
                location.reload(); // Reload on significant size change
            } else if (isMobile) {
                // Ensure it stays relative on mobile
                gallery.style.position = 'relative';
                gallery.style.top = 'auto';
            }
        }, { passive: true });
        
        return; // Exit early on mobile - no sticky behavior
    }
    
    // Desktop: Force sticky positioning via JavaScript if CSS fails
    function enforceSticky() {
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
    
    // Desktop only: Use JavaScript fallback if CSS sticky doesn't work
    if (!checkStickySupport()) {
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

