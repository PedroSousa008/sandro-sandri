/* ========================================
   Sandro Sandri - Collection Page
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Wait for ActiveChapter to load before initializing collection
    // This ensures we know if site is in Chapter I or Upload Chapter II mode
    const checkActiveChapter = () => {
        if (window.ActiveChapter && window.ActiveChapter.currentChapter) {
            initCollection();
        } else {
            // Wait a bit more for ActiveChapter to load
            setTimeout(checkActiveChapter, 100);
        }
    };
    checkActiveChapter();
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

    // Update chapter filter buttons based on active chapter from server
    // IMPORTANT: Chapter II button ONLY appears when site is in "Upload Chapter II" mode
    updateChapterFilters();
    
    // Also listen for chapter mode changes (when owner switches modes in Owner Mode)
    window.addEventListener('activeChapterUpdated', () => {
        updateChapterFilters();
        // Re-render products with correct chapter
        if (window.ActiveChapter) {
            const isChapterIIMode = window.ActiveChapter.isChapterII();
            currentChapter = isChapterIIMode ? 'chapter-2' : 'chapter-1';
            // Update active button
            filterButtons.forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.chapter === currentChapter) {
                    btn.classList.add('active');
                }
            });
            renderProducts();
        }
    });

    // Set initial chapter based on active chapter from server
    // If Chapter II is active, show both buttons and default to Chapter II
    // If Chapter I is active, show only Chapter I button
    if (window.ActiveChapter) {
        const isChapterIIActive = window.ActiveChapter.isChapterII();
        if (isChapterIIActive) {
            // Chapter II is active - show both buttons, default to Chapter II
            currentChapter = 'chapter-2';
        } else {
            // Chapter I is active - show only Chapter I, default to Chapter I
            currentChapter = 'chapter-1';
        }
    } else {
        // Fallback: default to Chapter I
        currentChapter = 'chapter-1';
    }
    
    // Update active button
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.chapter === currentChapter) {
            btn.classList.add('active');
        }
    });

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
        // Show/hide chapter filter buttons based on active chapter from server
        // IMPORTANT: Chapter II button ONLY appears when site is in "Upload Chapter II" mode
        // If Chapter I mode is active, ONLY show Chapter I button
        const chapterIIBtn = document.getElementById('chapter-ii-btn');
        
        // Wait for ActiveChapter to load if not ready
        if (window.ActiveChapter) {
            const isChapterIIMode = window.ActiveChapter.isChapterII();
            
            if (isChapterIIMode) {
                // Site is in "Upload Chapter II" mode - show BOTH buttons (Chapter I and Chapter II)
                if (chapterIIBtn) {
                    chapterIIBtn.style.display = '';
                }
            } else {
                // Site is in "Chapter I" mode - HIDE Chapter II button (only show Chapter I)
                if (chapterIIBtn) {
                    chapterIIBtn.style.display = 'none';
                }
            }
        } else {
            // If ActiveChapter not loaded yet, wait a bit and try again
            setTimeout(() => {
                updateChapterFilters();
            }, 200);
        }
    }

    function renderProducts() {
        // Force refresh products data to ensure we have latest names
        let products = window.ProductsAPI ? window.ProductsAPI.getAll() : [];
        
        // Filter by collection if set (from footer links) - this should show products from BOTH chapters
        if (currentCollection) {
            products = filterByCollection(products, currentCollection);
            // When filtering by collection, show all matching products from ALL created chapters
            // Filter to only show products from chapters that are created
            if (window.ChapterMode && window.ChapterMode.getCreatedChapters) {
                const createdChapters = window.ChapterMode.getCreatedChapters();
                products = products.filter(product => {
                    const productChapter = product.chapter === 'chapter_i' ? 'chapter-1' : 
                                         product.chapter === 'chapter_ii' ? 'chapter-2' : null;
                    return productChapter && createdChapters.includes(productChapter);
                });
            }
        } else {
            // Collection page: Show ALL products from ALL created chapters (not just active)
            // This allows Chapter I and Chapter II to both appear on Collection page
            if (window.ChapterMode && window.ChapterMode.getCreatedChapters) {
                const createdChapters = window.ChapterMode.getCreatedChapters();
                products = products.filter(product => {
                    const productChapter = product.chapter === 'chapter_i' ? 'chapter-1' : 
                                         product.chapter === 'chapter_ii' ? 'chapter-2' : null;
                    return productChapter && createdChapters.includes(productChapter);
                });
            } else if (currentChapter) {
                // Fallback: filter by selected chapter if chapter mode not loaded
                products = filterByChapter(products, currentChapter);
            }
        }
        
        // Sort products
        products = sortProducts(products, currentSort);

        // Render products
        productsGrid.innerHTML = products.map(product => {
            // For Chapter II products (IDs 6-10), use image index 1 (maldives2.png, palma2.png, etc.)
            // For Chapter I products (IDs 1-5), use image index 1 (tshirt-*b.png)
            const imageUrl = product.images && product.images.length > 1 ? product.images[1] : (product.images[0] || '');
            console.log(`Collection - Product ${product.id} (${product.name}): Using image:`, imageUrl, 'All images:', product.images);
            
            // Get product's chapter ID and mode from table
            const productChapter = product.chapter === 'chapter_i' ? 'chapter-1' : 
                                  product.chapter === 'chapter_ii' ? 'chapter-2' : null;
            const isCreated = productChapter && window.ChapterMode?.isChapterCreated(productChapter);
            const chapterMode = productChapter ? window.ChapterMode?.getChapterMode(productChapter) : null;
            
            // Determine button text based on THIS product's chapter mode (from table)
            let buttonText = 'Add to Cart';
            if (isCreated && chapterMode === 'waitlist') {
                buttonText = 'Join the Waitlist';
            }
            
            return `
            <article class="product-card" data-product-id="${product.id}">
                <a href="product.html?id=${product.id}" class="product-link">
                    <div class="product-image">
                        <img src="${imageUrl}?v=3.1" alt="${product.name}" onerror="console.error('Failed to load image:', '${imageUrl}');">
                    </div>
                    <div class="product-info">
                        <h3 class="product-name">${product.name}</h3>
                        <p class="product-price">${window.ProductsAPI.formatPrice(product.price)}</p>
                    </div>
                </a>
                <button class="quick-add ${chapterMode === 'waitlist' ? 'waitlist-btn' : ''}" data-product-id="${product.id}">${buttonText}</button>
            </article>
        `;
        }).join('');

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
        // Chapter II: Products 6-10 (Chapter II t-shirts)
        const chapterProductMap = {
            'chapter-1': [1, 2, 3, 4, 5], // Chapter I products
            'chapter-2': [6, 7, 8, 9, 10] // Chapter II products
        };
        
        const productIds = chapterProductMap[chapterId];
        if (!productIds) return products; // If chapter not mapped, show all
        
        // Filter products and ensure we only return 5 products
        const filtered = products.filter(product => productIds.includes(product.id));
        
        // Limit to 5 products maximum
        return filtered.slice(0, 5);
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
                        // User is logged in - save waitlist entry to database
                        // Get user information
                        const currentUser = window.AuthSystem?.currentUser || window.auth?.currentUser;
                        const userEmail = currentUser?.email || '';
                        const profile = JSON.parse(localStorage.getItem('sandroSandriProfile') || 'null');
                        const userName = profile?.name || userEmail.split('@')[0] || 'Customer';
                        
                        // Get active chapter info
                        const activeChapterId = window.ChapterMode?.getActiveChapterId();
                        const activeChapterMode = window.ChapterMode?.getActiveChapterMode();
                        const chapterNum = activeChapterId ? parseInt(activeChapterId.replace('chapter-', '')) : 1;
                        const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
                        const chapterName = `Chapter ${roman[chapterNum - 1] || chapterNum}`;
                        
                        // Save waitlist entry to database
                        try {
                            const waitlistData = {
                                customer_name: userName,
                                customer_email: userEmail,
                                product_id: product.id,
                                product_name: product.name,
                                product_sku: product.sku || 'N/A',
                                size: defaultSize,
                                color: null,
                                quantity: 1,
                                chapter: chapterName,
                                chapter_id: activeChapterId || 'chapter-1',
                                chapter_mode: activeChapterMode || 'waitlist',
                                page_url: window.location.href,
                                user_status: 'Logged In'
                            };
                            
                            // Send to database (fire and forget - don't wait for response)
                            fetch('/api/waitlist', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Accept': 'application/json'
                                },
                                body: JSON.stringify(waitlistData)
                            }).catch(err => {
                                console.error('Error saving waitlist entry for logged-in user:', err);
                                // Don't show error to user - just log it
                            });
                        } catch (error) {
                            console.error('Error preparing waitlist entry for logged-in user:', error);
                        }
                        
                        // Add to cart
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
