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
        
        // Wait for images to load to get accurate height
        const images = gallery.querySelectorAll('img');
        let imagesLoaded = 0;
        const totalImages = images.length;
        
        function applyFixedPosition() {
            gallery.style.position = 'fixed';
            gallery.style.top = navHeight + 'px';
            gallery.style.left = '0';
            gallery.style.right = '0';
            gallery.style.width = '100%';
            gallery.style.zIndex = '100';
            gallery.style.background = '#ffffff';
            gallery.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
            gallery.style.padding = 'var(--space-md)';
            gallery.style.paddingTop = 'var(--space-md)';
            gallery.style.maxHeight = 'calc(100vh - ' + navHeight + 'px)';
            gallery.style.overflowY = 'auto';
            gallery.style.webkitOverflowScrolling = 'touch';
            
            // Calculate gallery height and add spacing to content below
            const galleryHeight = gallery.offsetHeight;
            const section = gallery.closest('.product-section');
            const details = document.querySelector('.product-details');
            const layout = gallery.closest('.product-layout');
            
            if (section) {
                section.style.paddingTop = (galleryHeight + navHeight + 20) + 'px';
            }
            
            if (details) {
                details.style.marginTop = '0';
                details.style.paddingTop = 'var(--space-lg)';
            }
            
            if (layout) {
                layout.style.display = 'flex';
                layout.style.flexDirection = 'column';
            }
        }
        
        if (totalImages === 0) {
            // No images yet, apply immediately and update when images load
            applyFixedPosition();
            
            // Watch for images being added
            const observer = new MutationObserver(() => {
                const newImages = gallery.querySelectorAll('img');
                if (newImages.length > 0) {
                    setTimeout(applyFixedPosition, 100);
                }
            });
            observer.observe(gallery, { childList: true, subtree: true });
        } else {
            // Wait for all images to load
            images.forEach(img => {
                if (img.complete) {
                    imagesLoaded++;
                    if (imagesLoaded === totalImages) {
                        setTimeout(applyFixedPosition, 50);
                    }
                } else {
                    img.addEventListener('load', () => {
                        imagesLoaded++;
                        if (imagesLoaded === totalImages) {
                            setTimeout(applyFixedPosition, 50);
                        }
                    });
                }
            });
            
            // Fallback: apply after 1 second even if images haven't loaded
            setTimeout(applyFixedPosition, 1000);
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

