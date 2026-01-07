/* ========================================
   Sandro Sandri - Profile Page
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    initProfile();
});

function initProfile() {
    // Initialize size tracking listeners
    initSizeTracking();
    initTabs();
    loadProfileData();
    initPersonalForm();
    loadOrders();
    loadFavorites();
    initSettings();
    
    // Note: Overview tab is now "The Atlas of Memories"
    // Atlas initialization is handled by atlas-of-memories.js via MutationObserver
    // No need to add click listener here to avoid conflicts
    
    // Refresh stats when page becomes visible (user navigates back)
    // Note: Don't call loadProfileData() as overview tab no longer has those elements
    // document.addEventListener('visibilitychange', () => {
    //     if (!document.hidden) {
    //         loadProfileData();
    //     }
    // });
}

// Tab Navigation
function initTabs() {
    const tabs = document.querySelectorAll('.profile-tab');
    const tabContents = document.querySelectorAll('.profile-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const targetTab = tab.dataset.tab;
            
            if (!targetTab) return;

            // Remove active from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));

            // Add active to clicked tab and corresponding content
            tab.classList.add('active');
            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
            
            // Refresh data when switching tabs
            if (targetTab === 'overview') {
                // Initialize Atlas of Memories if not already initialized
                if (window.AtlasOfMemories && !window.atlasInitialized) {
                    window.atlasInitialized = true;
                    // Atlas will initialize itself on DOMContentLoaded
                }
            } else if (targetTab === 'orders') {
                loadOrders();
            } else if (targetTab === 'favorites') {
                loadFavorites();
            }
            
            return false;
        });
    });
}

// Load and display profile data
function loadProfileData() {
    const profile = loadProfile();
    const membership = loadMembership();

    if (profile) {
        // Update overview elements only if they exist (they don't exist in Atlas of Memories tab)
        const overviewName = document.getElementById('overview-name');
        const overviewEmail = document.getElementById('overview-email');
        if (overviewName) overviewName.textContent = profile.name || 'Guest User';
        if (overviewEmail) overviewEmail.textContent = profile.email || '';

        // Update membership badge only if it exists
        if (membership) {
            const badge = document.getElementById('membership-badge');
            const tier = document.getElementById('membership-tier');
            if (badge && tier) {
                badge.style.display = 'flex';
                tier.textContent = membership.tier;
                tier.className = `membership-tier ${membership.tier.toLowerCase()}`;
            }
        }

        // Calculate stats - reload fresh data (only update if elements exist)
        const orders = JSON.parse(localStorage.getItem('sandroSandriOrders') || '[]');
        const favorites = JSON.parse(localStorage.getItem('sandroSandriFavorites') || '[]');
        const totalSpent = calculateTotalSpent(orders);

        const ordersCount = document.getElementById('orders-count');
        const favoritesCount = document.getElementById('favorites-count');
        const totalSpentEl = document.getElementById('total-spent');
        
        if (ordersCount) ordersCount.textContent = orders.length;
        if (favoritesCount) favoritesCount.textContent = favorites.length;
        if (totalSpentEl) totalSpentEl.textContent = window.ProductsAPI ? window.ProductsAPI.formatPrice(totalSpent) : `€${totalSpent.toFixed(2)}`;
    }
}

// Personal Information Form
function initPersonalForm() {
    const form = document.getElementById('profile-form-element');
    const profile = loadProfile();

    // Populate form if profile exists
    if (profile) {
        populateForm(profile);
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveProfile();
    });
}

function loadProfile() {
    const saved = localStorage.getItem('sandroSandriProfile');
    return saved ? JSON.parse(saved) : null;
}

function saveProfile() {
    const form = document.getElementById('profile-form-element');
    const formData = new FormData(form);
    
    const oldProfile = loadProfile();
    const profile = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        country: formData.get('country'),
        size: formData.get('size'),
        address: formData.get('address'),
        bio: formData.get('bio'),
        createdAt: oldProfile?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    localStorage.setItem('sandroSandriProfile', JSON.stringify(profile));
    
    // Track size selection by country if size changed
    if (profile.size && profile.country && (!oldProfile || oldProfile.size !== profile.size || oldProfile.country !== profile.country)) {
        trackSizeSelection(profile.country, profile.size);
    }
}

// Track size selection immediately when size dropdown changes
function initSizeTracking() {
    const sizeSelect = document.getElementById('profile-size');
    const countrySelect = document.getElementById('profile-country');
    
    if (sizeSelect && countrySelect) {
        sizeSelect.addEventListener('change', () => {
            const size = sizeSelect.value;
            const country = countrySelect.value;
            
            // Only track if both size and country are selected
            if (size && country) {
                console.log('Size selection detected:', { size, country });
                trackSizeSelection(country, size);
            }
        });
        
        // Also track when country changes if size is already selected
        countrySelect.addEventListener('change', () => {
            const size = sizeSelect.value;
            const country = countrySelect.value;
            
            // Only track if both size and country are selected
            if (size && country) {
                console.log('Country changed with size selected:', { size, country });
                trackSizeSelection(country, size);
            }
        });
    }
    
    showNotification('Profile saved successfully!');
    
    // Reload profile data
    loadProfileData();
    populateForm(profile);
}

// Track size selection by country
function trackSizeSelection(country, size) {
    console.log('trackSizeSelection called:', { country, size });
    const tracking = JSON.parse(localStorage.getItem('sandroSandriSizeTracking') || '{}');
    
    if (!tracking[country]) {
        tracking[country] = { XS: 0, S: 0, M: 0, L: 0, XL: 0 };
    }
    
    // Increment count for this size in this country
    if (tracking[country][size] !== undefined) {
        tracking[country][size]++;
        console.log('Size tracking updated:', tracking);
    }
    
    localStorage.setItem('sandroSandriSizeTracking', JSON.stringify(tracking));
    console.log('Size tracking saved to localStorage:', tracking);
    
    // Trigger custom event for same-tab updates (storage events only work cross-tab)
    window.dispatchEvent(new CustomEvent('sizeTrackingUpdated'));
    
    // Also trigger storage event for cross-tab updates
    // Note: StorageEvent can only be created but won't fire in same tab
    // So we use CustomEvent for same-tab and storage event listener will catch cross-tab
    try {
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'sandroSandriSizeTracking',
            newValue: JSON.stringify(tracking),
            oldValue: localStorage.getItem('sandroSandriSizeTracking')
        }));
    } catch (e) {
        // StorageEvent might not work in all browsers for same-tab, that's fine
        console.log('StorageEvent dispatch:', e);
    }
    
    // Send email notification to owner
    sendSizeSelectionEmail(country, size);
}

// Send email notification to owner when size is selected
async function sendSizeSelectionEmail(country, size) {
    const profile = loadProfile();
    const countryName = document.querySelector(`#profile-country option[value="${country}"]`)?.textContent || country;
    
    try {
        const response = await fetch('https://formspree.io/f/meoyldeq', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                _subject: `New Size Selection - ${size}`,
                _replyto: profile?.email || 'noreply@sandrosandri.com',
                message: `A customer has selected size ${size}.\n\nCustomer Details:\n- Name: ${profile?.name || 'Not provided'}\n- Email: ${profile?.email || 'Not provided'}\n- Country: ${countryName}\n- Size Selected: ${size}\n\nTimestamp: ${new Date().toLocaleString()}`,
                customerName: profile?.name || 'Unknown',
                customerEmail: profile?.email || 'Not provided',
                country: countryName,
                size: size
            })
        });
        
        if (response.ok) {
            console.log('Size selection email sent successfully');
        }
    } catch (error) {
        console.error('Error sending size selection email:', error);
    }
}

function populateForm(profile) {
    if (!profile) return;

    document.getElementById('profile-name').value = profile.name || '';
    document.getElementById('profile-email').value = profile.email || '';
    document.getElementById('profile-phone').value = profile.phone || '';
    document.getElementById('profile-country').value = profile.country || '';
    document.getElementById('profile-size').value = profile.size || '';
    document.getElementById('profile-address').value = profile.address || '';
    document.getElementById('profile-bio').value = profile.bio || '';
}

// Orders
function loadOrders() {
    const saved = localStorage.getItem('sandroSandriOrders');
    const orders = saved ? JSON.parse(saved) : [];
    
    displayOrders(orders);
    return orders;
}

function displayOrders(orders) {
    const ordersList = document.getElementById('orders-list');
    
    if (orders.length === 0) {
        ordersList.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                    <path d="M3 6h18"/>
                    <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
                <p>No orders yet</p>
                <a href="collection.html" class="cta-button">Start Shopping</a>
            </div>
        `;
        return;
    }

    ordersList.innerHTML = orders.map((order, index) => {
        const orderDate = new Date(order.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const orderTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        return `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-info">
                        <h4 class="order-number">Order #${order.orderNumber || String(index + 1).padStart(6, '0')}</h4>
                        <p class="order-date">${orderDate}</p>
                    </div>
                    <div class="order-status">
                        <span class="status-badge ${order.status || 'completed'}">${order.status || 'Completed'}</span>
                    </div>
                </div>
                <div class="order-items">
                    ${order.items.map(item => `
                        <div class="order-item">
                            <img src="${item.image || 'images/placeholder.png'}" alt="${item.name}" class="order-item-image">
                            <div class="order-item-details">
                                <h5 class="order-item-name">${item.name}</h5>
                                <p class="order-item-specs">Size: ${item.size || 'M'} | Quantity: ${item.quantity}</p>
                            </div>
                            <div class="order-item-price">${window.ProductsAPI ? window.ProductsAPI.formatPrice(item.price * item.quantity) : `€${(item.price * item.quantity).toFixed(2)}`}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="order-footer">
                    <div class="order-total">
                        <span>Total:</span>
                        <strong>${window.ProductsAPI ? window.ProductsAPI.formatPrice(orderTotal) : `€${orderTotal.toFixed(2)}`}</strong>
                    </div>
                    <a href="product.html?id=${order.items[0]?.productId}" class="secondary-button">View Details</a>
                </div>
            </div>
        `;
    }).join('');
}

function calculateTotalSpent(orders) {
    return orders.reduce((total, order) => {
        const orderTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        return total + orderTotal;
    }, 0);
}

// Favorites/Wishlist
function loadFavorites() {
    const saved = localStorage.getItem('sandroSandriFavorites');
    const favorites = saved ? JSON.parse(saved) : [];
    
    displayFavorites(favorites);
    return favorites;
}

function displayFavorites(favorites) {
    const favoritesList = document.getElementById('favorites-list');
    
    if (favorites.length === 0) {
        favoritesList.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <p>No favorites yet</p>
                <a href="collection.html" class="cta-button">Browse Collection</a>
            </div>
        `;
        return;
    }

    if (!window.ProductsAPI) {
        favoritesList.innerHTML = '<p>Loading products...</p>';
        return;
    }

    favoritesList.innerHTML = favorites.map(productId => {
        const product = window.ProductsAPI.getById(productId);
        if (!product) return '';

        return `
            <article class="product-card favorite-card">
                <a href="product.html?id=${product.id}" class="product-link">
                    <div class="product-image">
                        <img src="${product.images[1] || product.images[0]}" alt="${product.name}">
                    </div>
                    <div class="product-info">
                        <h3 class="product-name">${product.name}</h3>
                        <p class="product-price">${window.ProductsAPI.formatPrice(product.price)}</p>
                    </div>
                </a>
                <button class="remove-favorite" data-product-id="${product.id}" aria-label="Remove from favorites">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                </button>
            </article>
        `;
    }).join('');

    // Add remove favorite functionality
    favoritesList.querySelectorAll('.remove-favorite').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const productId = parseInt(btn.dataset.productId);
            removeFavorite(productId);
        });
    });
}

function removeFavorite(productId) {
    const favorites = loadFavorites();
    const updated = favorites.filter(id => id !== productId);
    localStorage.setItem('sandroSandriFavorites', JSON.stringify(updated));
    loadFavorites();
    loadProfileData(); // Update stats
    showNotification('Removed from favorites');
}

// Update stats when favorites are added from other pages
window.updateProfileStats = function() {
    if (document.getElementById('favorites-count')) {
        loadProfileData();
    }
};

// Add to favorites (called from other pages)
window.addToFavorites = function(productId) {
    const favorites = loadFavorites();
    if (!favorites.includes(productId)) {
        favorites.push(productId);
        localStorage.setItem('sandroSandriFavorites', JSON.stringify(favorites));
        showNotification('Added to favorites');
        return true;
    }
    return false;
};

window.isFavorite = function(productId) {
    const favorites = loadFavorites();
    return favorites.includes(productId);
};

// Membership
function loadMembership() {
    const saved = localStorage.getItem('sandroSandriMembership');
    return saved ? JSON.parse(saved) : null;
}

// Settings
function initSettings() {
    const settings = loadSettings();
    
    // Load saved settings
    if (settings) {
        document.getElementById('notify-orders').checked = settings.notifyOrders !== false;
        document.getElementById('notify-collections').checked = settings.notifyCollections !== false;
        document.getElementById('notify-exclusive').checked = settings.notifyExclusive || false;
        document.getElementById('privacy-profile').checked = settings.privacyProfile || false;
    }

    // Save settings on change
    document.querySelectorAll('#settings-tab input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', saveSettings);
    });

    // Export data
    document.getElementById('export-data-btn')?.addEventListener('click', exportData);

    // Delete account
    document.getElementById('delete-account-btn')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            deleteAccount();
        }
    });
}

function loadSettings() {
    const saved = localStorage.getItem('sandroSandriSettings');
    return saved ? JSON.parse(saved) : {
        notifyOrders: true,
        notifyCollections: true,
        notifyExclusive: false,
        privacyProfile: false
    };
}

function saveSettings() {
    const settings = {
        notifyOrders: document.getElementById('notify-orders').checked,
        notifyCollections: document.getElementById('notify-collections').checked,
        notifyExclusive: document.getElementById('notify-exclusive').checked,
        privacyProfile: document.getElementById('privacy-profile').checked
    };
    localStorage.setItem('sandroSandriSettings', JSON.stringify(settings));
    showNotification('Settings saved');
}

function exportData() {
    const profile = loadProfile();
    const orders = loadOrders();
    const favorites = loadFavorites();
    const membership = loadMembership();
    const settings = loadSettings();

    const data = {
        profile,
        orders,
        favorites,
        membership,
        settings,
        exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sandro-sandri-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Data exported successfully');
}

function deleteAccount() {
    localStorage.removeItem('sandroSandriProfile');
    localStorage.removeItem('sandroSandriOrders');
    localStorage.removeItem('sandroSandriFavorites');
    localStorage.removeItem('sandroSandriMembership');
    localStorage.removeItem('sandroSandriSettings');
    localStorage.removeItem('sandroSandriCart');
    
    showNotification('Account deleted');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1500);
}

// Notification
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

// Save order when checkout completes (called from checkout.js)
window.saveOrder = function(orderItems) {
    const orders = loadOrders();
    const newOrder = {
        orderNumber: `SS${Date.now().toString().slice(-8)}`,
        date: new Date().toISOString(),
        status: 'completed',
        items: orderItems.map(item => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            size: item.size,
            quantity: item.quantity,
            image: item.image
        }))
    };
    
    orders.unshift(newOrder);
    localStorage.setItem('sandroSandriOrders', JSON.stringify(orders));
};
