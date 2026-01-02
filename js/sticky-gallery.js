/* ========================================
   Sticky Gallery Fix for Product Page
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    const gallery = document.querySelector('.product-gallery');
    if (!gallery) return;
    
    // Force sticky positioning via JavaScript if CSS fails
    function enforceSticky() {
        const rect = gallery.getBoundingClientRect();
        const navHeight = 80;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const sectionTop = gallery.closest('.product-section')?.getBoundingClientRect().top + scrollTop || 0;
        
        if (scrollTop >= sectionTop - navHeight) {
            gallery.style.position = 'fixed';
            gallery.style.top = navHeight + 'px';
            gallery.style.width = rect.width + 'px';
        } else {
            gallery.style.position = 'relative';
            gallery.style.top = 'auto';
            gallery.style.width = 'auto';
        }
    }
    
    // Check if CSS sticky is working
    const computedStyle = window.getComputedStyle(gallery);
    const isSticky = computedStyle.position === 'sticky' || computedStyle.position === '-webkit-sticky';
    
    if (!isSticky) {
        console.log('CSS sticky not working, using JavaScript fallback');
        window.addEventListener('scroll', enforceSticky);
        enforceSticky(); // Initial call
    } else {
        console.log('CSS sticky is working correctly');
    }
});

