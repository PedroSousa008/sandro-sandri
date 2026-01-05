/* ========================================
   Sticky Gallery Fix for Product Page
   - Mobile: Natural scrolling
   - Desktop (wide screens only): Sticky positioning
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    const gallery = document.querySelector('.product-gallery');
    if (!gallery) return;
    
    const navHeight = 80;
    const mobileBreakpoint = 768;
    const desktopStickyBreakpoint = 1200; // Only enable sticky on wide screens
    
    function getViewportWidth() {
        return window.innerWidth || document.documentElement.clientWidth;
    }
    
    function isMobile() {
        return getViewportWidth() <= mobileBreakpoint;
    }
    
    function isWideDesktop() {
        return getViewportWidth() >= desktopStickyBreakpoint;
    }
    
    // On mobile or narrow desktop, ensure natural scrolling (no sticky/fixed)
    if (isMobile() || !isWideDesktop()) {
        console.log('Mobile or narrow desktop detected - using natural scrolling for gallery');
        
        // Remove any fixed/sticky positioning
        gallery.style.position = 'relative';
        gallery.style.top = 'auto';
        gallery.style.left = 'auto';
        gallery.style.right = 'auto';
        gallery.style.width = 'auto';
        gallery.style.zIndex = 'auto';
        gallery.style.background = 'transparent';
        gallery.style.boxShadow = 'none';
        gallery.style.maxHeight = 'none';
        gallery.style.overflow = 'visible';
        
        // Update on resize
        window.addEventListener('resize', () => {
            if (isMobile() || !isWideDesktop()) {
                // Ensure it stays relative on mobile/narrow screens
                gallery.style.position = 'relative';
                gallery.style.top = 'auto';
                gallery.style.zIndex = 'auto';
            }
        }, { passive: true });
        
        return; // Exit early - no sticky behavior
    }
    
    // Wide desktop only: Let CSS handle sticky, but ensure it doesn't overlap
    console.log('Wide desktop detected - sticky positioning enabled');
    
    // Ensure sticky doesn't cause overlapping issues
    const section = gallery.closest('.product-section');
    if (section) {
        // Make sure the section has proper overflow handling
        const computedStyle = window.getComputedStyle(section);
        if (computedStyle.overflow === 'hidden') {
            section.style.overflow = 'visible';
        }
    }
    
    // Monitor scroll to ensure gallery stays within bounds
    let ticking = false;
    function checkStickyBounds() {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                if (isWideDesktop() && !isMobile()) {
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    const section = gallery.closest('.product-section');
                    
                    if (section) {
                        const sectionRect = section.getBoundingClientRect();
                        const galleryRect = gallery.getBoundingClientRect();
                        
                        // If gallery would extend beyond section, adjust
                        if (galleryRect.bottom > sectionRect.bottom) {
                            gallery.style.maxHeight = (sectionRect.bottom - navHeight - 20) + 'px';
                        }
                    }
                }
                ticking = false;
            });
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', checkStickyBounds, { passive: true });
    window.addEventListener('resize', () => {
        if (isMobile() || !isWideDesktop()) {
            // Remove sticky on resize to mobile/narrow
            gallery.style.position = 'relative';
            gallery.style.top = 'auto';
            gallery.style.zIndex = 'auto';
        }
    }, { passive: true });
});

