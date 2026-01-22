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
    initLogout();
    
    // Listen for profile sync events
    window.addEventListener('profileSynced', (e) => {
        const profile = e.detail;
        if (profile) {
            populateForm(profile);
            loadProfileData();
        }
    });
    
    // Listen for favorites sync events
    window.addEventListener('favoritesSynced', (e) => {
        console.log('❤️ Favorites synced event received on profile page, reloading favorites...');
        const syncedFavorites = e.detail || [];
        console.log('   Synced favorites:', syncedFavorites);
        loadFavorites(); // Reload favorites when sync happens
        loadProfileData(); // Update stats
    });
    
    // Refresh stats when switching to overview tab
    const overviewTab = document.querySelector('[data-tab="overview"]');
    if (overviewTab) {
        overviewTab.addEventListener('click', () => {
            loadProfileData();
        });
    }
    
    // Refresh stats when page becomes visible (user navigates back)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            loadProfileData();
        }
    });
}

// Tab Navigation
function initTabs() {
    const tabs = document.querySelectorAll('.profile-tab');
    const tabContents = document.querySelectorAll('.profile-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            // Remove active from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));

            // Add active to clicked tab and corresponding content
            tab.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
            
            // Refresh data when switching tabs
            if (targetTab === 'overview') {
                loadProfileData();
            } else if (targetTab === 'orders') {
                loadOrders();
            } else if (targetTab === 'favorites') {
                loadFavorites();
            }
        });
    });
}

// Load and display profile data
function loadProfileData() {
    // First, verify the current logged-in user
    const currentUser = window.AuthSystem?.currentUser || window.auth?.currentUser;
    const currentEmail = currentUser?.email;
    
    if (!currentEmail) {
        // Not logged in - clear profile and redirect
        console.warn('No user logged in, clearing profile data');
        localStorage.removeItem('sandroSandriProfile');
        localStorage.removeItem('sandroSandriOrders');
        localStorage.removeItem('sandroSandriFavorites');
        localStorage.removeItem('sandroSandriCart');
        if (window.location.pathname.includes('profile')) {
            window.location.href = 'login.html';
        }
        return;
    }
    
    const profile = loadProfile(); // This now verifies email match
    
    // Security check: Ensure profile belongs to current user
    if (profile && profile.email && profile.email !== currentEmail) {
        console.warn(`Profile email (${profile.email}) does not match current user (${currentEmail}). Clearing old profile data.`);
        // Clear mismatched profile data
        localStorage.removeItem('sandroSandriProfile');
        localStorage.removeItem('sandroSandriOrders');
        localStorage.removeItem('sandroSandriFavorites');
        localStorage.removeItem('sandroSandriCart');
        // Reload data from server for current user
        if (window.userSync) {
            window.userSync.loadAllData();
        }
        return;
    }
    
    const membership = loadMembership();

    if (profile) {
        // Double-check email matches
        if (profile.email !== currentEmail) {
            console.error('Profile email mismatch detected!');
            return;
        }
        
        // Update overview
        const overviewName = document.getElementById('overview-name');
        const overviewEmail = document.getElementById('overview-email');
        if (overviewName) overviewName.textContent = profile.name || 'Guest User';
        if (overviewEmail) overviewEmail.textContent = profile.email || '';

        // Update membership badge
        if (membership) {
            const badge = document.getElementById('membership-badge');
            const tier = document.getElementById('membership-tier');
            if (badge && tier) {
                badge.style.display = 'flex';
                tier.textContent = membership.tier;
                tier.className = `membership-tier ${membership.tier.toLowerCase()}`;
            }
        }

        // Calculate stats - filter orders to only current user's orders
        const allOrders = JSON.parse(localStorage.getItem('sandroSandriOrders') || '[]');
        const orders = allOrders.filter(order => order.email === currentEmail);
        const favorites = JSON.parse(localStorage.getItem('sandroSandriFavorites') || '[]');
        const totalSpent = calculateTotalSpent(orders);

        const ordersCount = document.getElementById('orders-count');
        const favoritesCount = document.getElementById('favorites-count');
        const totalSpentEl = document.getElementById('total-spent');
        
        if (ordersCount) ordersCount.textContent = orders.length;
        if (favoritesCount) favoritesCount.textContent = favorites.length;
        if (totalSpentEl) totalSpentEl.textContent = window.ProductsAPI ? window.ProductsAPI.formatPrice(totalSpent) : `€${totalSpent.toFixed(2)}`;
    } else {
        // No profile found - try to load from server
        if (window.userSync) {
            window.userSync.loadAllData();
        }
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
    // Verify current user before loading profile
    const currentUser = window.AuthSystem?.currentUser || window.auth?.currentUser;
    const currentEmail = currentUser?.email;
    
    if (!currentEmail) {
        return null; // Not logged in
    }
    
    const saved = localStorage.getItem('sandroSandriProfile');
    if (!saved) {
        return null;
    }
    
    const profile = JSON.parse(saved);
    
    // Security check: Only return profile if it belongs to current user
    if (profile.email && profile.email !== currentEmail) {
        console.warn(`Profile email (${profile.email}) does not match current user (${currentEmail}). Clearing old profile.`);
        // Clear the mismatched profile
        localStorage.removeItem('sandroSandriProfile');
        localStorage.removeItem('sandroSandriOrders');
        localStorage.removeItem('sandroSandriFavorites');
        localStorage.removeItem('sandroSandriCart');
        return null;
    }
    
    return profile;
}

function saveProfile() {
    const form = document.getElementById('profile-form-element');
    if (!form) return;

    // Verify user is logged in
    const currentUser = window.AuthSystem?.currentUser || window.auth?.currentUser;
    const currentEmail = currentUser?.email;
    
    if (!currentEmail) {
        alert('You must be logged in to save your profile.');
        window.location.href = 'login.html';
        return;
    }

    const formData = new FormData(form);
    
    const oldProfile = loadProfile();
    
    // Ensure profile email matches current user (if old profile exists)
    if (oldProfile && oldProfile.email && oldProfile.email !== currentEmail) {
        console.error('Cannot save profile: email mismatch');
        alert('Profile email mismatch. Please log out and log back in.');
        return;
    }
    
    const profile = {
        name: formData.get('name'),
        email: currentEmail, // Always use current logged-in user's email
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
    
    // Sync to server immediately
    if (window.userSync && window.userSync.userEmail) {
        window.userSync.forceSync();
    }
    
    showNotification('Profile saved successfully!');
    
    // Reload profile data
    loadProfileData();
    populateForm(profile);
}

// Track size selection immediately when size dropdown changes
// Auto-submit form when size is selected (if country is also selected)
function initSizeTracking() {
    const sizeSelect = document.getElementById('profile-size');
    const countrySelect = document.getElementById('profile-country');
    
    if (sizeSelect && countrySelect) {
        sizeSelect.addEventListener('change', () => {
            const size = sizeSelect.value;
            const country = countrySelect.value;
            
            // Only track and auto-submit if both size and country are selected
            if (size && country) {
                console.log('Size selection detected:', { size, country });
                trackSizeSelection(country, size);
                
                // Auto-submit the form to save the profile
                const form = document.getElementById('profile-form-element');
                if (form) {
                    // Trigger form submission which will call saveProfile()
                    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                }
            }
        });
        
        // Also track when country changes if size is already selected
        countrySelect.addEventListener('change', () => {
            const size = sizeSelect.value;
            const country = countrySelect.value;
            
            // Only track and auto-submit if both size and country are selected
            if (size && country) {
                console.log('Country changed with size selected:', { size, country });
                trackSizeSelection(country, size);
                
                // Auto-submit the form to save the profile
                const form = document.getElementById('profile-form-element');
                if (form) {
                    // Trigger form submission which will call saveProfile()
                    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                }
            }
        });
    }
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
    // Verify current user
    const currentUser = window.AuthSystem?.currentUser || window.auth?.currentUser;
    const currentEmail = currentUser?.email;
    
    if (!currentEmail) {
        return; // Not logged in
    }
    
    const saved = localStorage.getItem('sandroSandriOrders');
    const allOrders = saved ? JSON.parse(saved) : [];
    
    // Filter orders to only show current user's orders
    const orders = allOrders.filter(order => order.email === currentEmail);
    
    displayOrders(orders);
    return orders;
}

function displayOrders(orders) {
    const ordersList = document.getElementById('orders-list');
    if (!ordersList) return;
    
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
    // Verify current user
    const currentUser = window.AuthSystem?.currentUser || window.auth?.currentUser;
    const currentEmail = currentUser?.email;
    
    if (!currentEmail) {
        return []; // Not logged in
    }
    
    // Load from localStorage first for instant display
    const saved = localStorage.getItem('sandroSandriFavorites');
    const favorites = saved ? JSON.parse(saved) : [];
    
    // Display immediately
    displayFavorites(favorites);
    
    // Then ensure we have latest from server (if user is logged in)
    if (window.userSync && window.userSync.userEmail) {
        // Trigger a sync to get latest from server
        // The sync will update localStorage and call loadFavorites again via event
        window.userSync.loadAllData();
    }
    
    return favorites;
}

function displayFavorites(favorites) {
    const favoritesList = document.getElementById('favorites-list');
    if (!favoritesList) return;
    
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
    // Trigger immediate sync to server
    if (window.userSync && window.userSync.userEmail) {
        console.log('❤️ Favorite removed, syncing to server immediately...');
        window.userSync.forceSync(); // Use forceSync for immediate sync
    }
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
        // Trigger immediate sync to server
        if (window.userSync && window.userSync.userEmail) {
            console.log('❤️ Favorite added, syncing to server immediately...');
            window.userSync.forceSync(); // Use forceSync for immediate sync
        }
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

// Logout functionality
function initLogout() {
    const logoutBtn = document.getElementById('profile-logout-btn');
    if (!logoutBtn) return;
    
    logoutBtn.addEventListener('click', () => {
        // Confirm logout
        if (!confirm('Are you sure you want to log out? You will need to log in again to access your account.')) {
            return;
        }
        
        // Call logout from auth system
        if (window.AuthSystem && window.AuthSystem.logout) {
            window.AuthSystem.logout();
        } else if (window.auth && window.auth.logout) {
            window.auth.logout();
        } else {
            // Fallback: manually clear data and redirect
            localStorage.removeItem('sandroSandri_user');
            localStorage.removeItem('sandroSandriProfile');
            localStorage.removeItem('sandroSandriOrders');
            localStorage.removeItem('sandroSandriFavorites');
            localStorage.removeItem('sandroSandriCart');
            localStorage.removeItem('sandroSandriAtlas');
            
            // Clear all password storage
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('sandroSandri_password_')) {
                    localStorage.removeItem(key);
                }
            });
        }
        
        // Redirect to home page
        window.location.href = 'index.html';
    });
}

// Settings
function initSettings() {
    const settings = loadSettings();
    
    // Load saved settings
    if (settings) {
        const notifyOrders = document.getElementById('notify-orders');
        const notifyCollections = document.getElementById('notify-collections');
        const notifyExclusive = document.getElementById('notify-exclusive');
        
        if (notifyOrders) notifyOrders.checked = settings.notifyOrders !== false;
        if (notifyCollections) notifyCollections.checked = settings.notifyCollections !== false;
        if (notifyExclusive) notifyExclusive.checked = settings.notifyExclusive || false;
    }

    // Save settings on change
    document.querySelectorAll('#settings-tab input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', saveSettings);
    });
    
    // Initialize password change form
    initPasswordChangeForm();
    
    // Initialize payment methods
    initPaymentMethods();

    // Export data
    const exportBtn = document.getElementById('export-data-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }

    // Delete account
    const deleteBtn = document.getElementById('delete-account-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                deleteAccount();
            }
        });
    }
}

function loadSettings() {
    const saved = localStorage.getItem('sandroSandriSettings');
    return saved ? JSON.parse(saved) : {
        notifyOrders: true,
        notifyCollections: true,
        notifyExclusive: false
    };
}

function saveSettings() {
    const notifyOrders = document.getElementById('notify-orders');
    const notifyCollections = document.getElementById('notify-collections');
    const notifyExclusive = document.getElementById('notify-exclusive');
    
    const settings = {
        notifyOrders: notifyOrders ? notifyOrders.checked : true,
        notifyCollections: notifyCollections ? notifyCollections.checked : true,
        notifyExclusive: notifyExclusive ? notifyExclusive.checked : false
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

// Password Change Form
function initPasswordChangeForm() {
    const form = document.getElementById('change-password-form');
    if (!form) return;
    
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const saveButton = document.getElementById('save-password-btn');
    
    // Enable new password field when current password is entered
    currentPasswordInput.addEventListener('input', () => {
        if (currentPasswordInput.value.trim().length > 0) {
            newPasswordInput.disabled = false;
        } else {
            newPasswordInput.disabled = true;
            newPasswordInput.value = '';
            confirmPasswordInput.disabled = true;
            confirmPasswordInput.value = '';
            saveButton.disabled = true;
        }
    });
    
    // Enable confirm password field when new password is entered
    newPasswordInput.addEventListener('input', () => {
        if (newPasswordInput.value.trim().length > 0) {
            confirmPasswordInput.disabled = false;
        } else {
            confirmPasswordInput.disabled = true;
            confirmPasswordInput.value = '';
            saveButton.disabled = true;
        }
        
        // Check if passwords match
        if (confirmPasswordInput.value === newPasswordInput.value && 
            confirmPasswordInput.value.trim().length > 0 &&
            newPasswordInput.value.trim().length > 0) {
            saveButton.disabled = false;
        } else {
            saveButton.disabled = true;
        }
    });
    
    // Enable save button when passwords match
    confirmPasswordInput.addEventListener('input', () => {
        if (confirmPasswordInput.value === newPasswordInput.value && 
            confirmPasswordInput.value.trim().length > 0 &&
            newPasswordInput.value.trim().length > 0) {
            saveButton.disabled = false;
        } else {
            saveButton.disabled = true;
        }
    });
    
    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const currentPassword = currentPasswordInput.value;
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        // Validate passwords match
        if (newPassword !== confirmPassword) {
            showNotification('New passwords do not match');
            return;
        }
        
        // Validate password length
        if (newPassword.length < 6) {
            showNotification('New password must be at least 6 characters');
            return;
        }
        
        // Get current user email
        const userEmail = window.AuthSystem?.currentUser?.email || 
                         (window.AuthSystem?.loadUser && window.AuthSystem.loadUser()?.email);
        
        if (!userEmail) {
            showNotification('You must be logged in to change your password');
            return;
        }
        
        // Verify current password (check against stored password or auth system)
        const storedPassword = localStorage.getItem(`sandroSandri_password_${userEmail}`);
        
        // Also check against owner password if it's the owner account
        let passwordValid = false;
        if (userEmail === 'sandrosandri.bysousa@gmail.com') {
            const ownerPassword = 'pmpcsousa10';
            if (currentPassword === ownerPassword || (storedPassword && storedPassword === currentPassword)) {
                passwordValid = true;
            }
        } else {
            // For regular users, check stored password
            if (storedPassword && storedPassword === currentPassword) {
                passwordValid = true;
            } else if (!storedPassword) {
                // First time setting password - no current password required
                passwordValid = true;
            }
        }
        
        if (!passwordValid) {
            showNotification('Current password is incorrect');
            currentPasswordInput.value = '';
            currentPasswordInput.focus();
            return;
        }
        
        // Save new password
        localStorage.setItem(`sandroSandri_password_${userEmail}`, newPassword);
        
        // Track activity
        if (window.ActivityTracker) {
            window.ActivityTracker.trackPasswordChange();
        }
        
        // Sync password to server immediately
        if (window.userSync && window.userSync.userEmail) {
            window.userSync.syncPassword(newPassword);
        }
        
        // Clear form
        form.reset();
        newPasswordInput.disabled = true;
        confirmPasswordInput.disabled = true;
        saveButton.disabled = true;
        
        showNotification('Password changed successfully!');
    });
}

// Payment Methods
function initPaymentMethods() {
    const currentCardDisplay = document.getElementById('current-card-display');
    const addCardFormContainer = document.getElementById('add-card-form-container');
    const addCardForm = document.getElementById('add-card-form');
    const replaceCardBtn = document.getElementById('replace-card-btn');
    const cancelCardBtn = document.getElementById('cancel-card-btn');
    const cardNumberInput = document.getElementById('card-number');
    const cardExpiryInput = document.getElementById('card-expiry');
    const cardCvvInput = document.getElementById('card-cvv');
    const cardTypeBadge = document.getElementById('card-type-badge');
    
    if (!addCardForm) return;
    
    // Load and display current card
    loadAndDisplayCard();
    
    // Card number formatting and validation
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\s/g, '');
            value = value.replace(/\D/g, '');
            
            // Format with spaces every 4 digits
            let formatted = value.match(/.{1,4}/g)?.join(' ') || value;
            e.target.value = formatted;
            
            // Detect card type
            const cardType = detectCardType(value);
            if (cardType) {
                cardTypeBadge.textContent = cardType;
                cardTypeBadge.className = `card-type-badge visible ${cardType.toLowerCase()}`;
            } else {
                cardTypeBadge.className = 'card-type-badge';
            }
            
            // Validate card number (Luhn algorithm)
            if (value.length >= 13) {
                const isValid = validateCardNumber(value);
                if (!isValid && value.length >= 13) {
                    e.target.setCustomValidity('Invalid card number');
                } else {
                    e.target.setCustomValidity('');
                }
            }
        });
    }
    
    // Expiry date formatting
    if (cardExpiryInput) {
        cardExpiryInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
            
            // Validate expiry date
            if (value.length === 5) {
                const [month, year] = value.split('/');
                const currentDate = new Date();
                const currentYear = currentDate.getFullYear() % 100;
                const currentMonth = currentDate.getMonth() + 1;
                
                if (parseInt(month) < 1 || parseInt(month) > 12) {
                    e.target.setCustomValidity('Invalid month');
                } else if (parseInt(year) < currentYear || 
                          (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
                    e.target.setCustomValidity('Card has expired');
                } else {
                    e.target.setCustomValidity('');
                }
            }
        });
    }
    
    // CVV formatting (numbers only)
    if (cardCvvInput) {
        cardCvvInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }
    
    // Replace card button
    if (replaceCardBtn) {
        replaceCardBtn.addEventListener('click', () => {
            currentCardDisplay.style.display = 'none';
            addCardFormContainer.style.display = 'block';
            if (cancelCardBtn) cancelCardBtn.style.display = 'inline-block';
        });
    }
    
    // Cancel button
    if (cancelCardBtn) {
        cancelCardBtn.addEventListener('click', () => {
            addCardForm.reset();
            loadAndDisplayCard();
            cancelCardBtn.style.display = 'none';
        });
    }
    
    // Form submission
    addCardForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const cardNumber = cardNumberInput.value.replace(/\s/g, '');
        const cardExpiry = cardExpiryInput.value;
        const cardCvv = cardCvvInput.value;
        const cardName = document.getElementById('card-name').value;
        
        // Validate all fields
        if (!validateCardNumber(cardNumber)) {
            showNotification('Invalid card number');
            return;
        }
        
        if (!cardExpiry || cardExpiry.length !== 5) {
            showNotification('Invalid expiry date');
            return;
        }
        
        if (!cardCvv || cardCvv.length < 3) {
            showNotification('Invalid CVV');
            return;
        }
        
        if (!cardName.trim()) {
            showNotification('Cardholder name is required');
            return;
        }
        
        // Get current user email
        const userEmail = window.AuthSystem?.currentUser?.email || 
                         (window.AuthSystem?.loadUser && window.AuthSystem.loadUser()?.email);
        
        if (!userEmail) {
            showNotification('You must be logged in to save payment methods');
            return;
        }
        
        // Save card (masked for security)
        const cardData = {
            last4: cardNumber.slice(-4),
            expiry: cardExpiry,
            type: detectCardType(cardNumber),
            name: cardName,
            savedAt: new Date().toISOString()
        };
        
        localStorage.setItem(`sandroSandri_payment_${userEmail}`, JSON.stringify(cardData));
        
        // Clear form and reload display
        addCardForm.reset();
        if (cardTypeBadge) cardTypeBadge.className = 'card-type-badge';
        loadAndDisplayCard();
        if (cancelCardBtn) cancelCardBtn.style.display = 'none';
        
        showNotification('Payment method saved successfully!');
    });
}

function loadAndDisplayCard() {
    const currentCardDisplay = document.getElementById('current-card-display');
    const addCardFormContainer = document.getElementById('add-card-form-container');
    const cardLast4 = currentCardDisplay?.querySelector('.card-last-4');
    const cardExpiry = currentCardDisplay?.querySelector('.card-expiry');
    const cardTypeIcon = currentCardDisplay?.querySelector('.card-type-icon');
    
    const userEmail = window.AuthSystem?.currentUser?.email || 
                     (window.AuthSystem?.loadUser && window.AuthSystem.loadUser()?.email);
    
    if (!userEmail) {
        if (currentCardDisplay) currentCardDisplay.style.display = 'none';
        if (addCardFormContainer) addCardFormContainer.style.display = 'block';
        return;
    }
    
    const savedCard = localStorage.getItem(`sandroSandri_payment_${userEmail}`);
    
    if (savedCard) {
        try {
            const cardData = JSON.parse(savedCard);
            
            if (cardLast4) cardLast4.textContent = cardData.last4;
            if (cardExpiry) cardExpiry.textContent = `Expires ${cardData.expiry}`;
            
            if (cardTypeIcon && cardData.type) {
                cardTypeIcon.textContent = cardData.type;
                cardTypeIcon.className = `card-type-icon ${cardData.type.toLowerCase()}`;
            }
            
            if (currentCardDisplay) currentCardDisplay.style.display = 'block';
            if (addCardFormContainer) addCardFormContainer.style.display = 'none';
        } catch (e) {
            console.error('Error loading card:', e);
            if (currentCardDisplay) currentCardDisplay.style.display = 'none';
            if (addCardFormContainer) addCardFormContainer.style.display = 'block';
        }
    } else {
        if (currentCardDisplay) currentCardDisplay.style.display = 'none';
        if (addCardFormContainer) addCardFormContainer.style.display = 'block';
    }
}

function detectCardType(cardNumber) {
    // Remove spaces and non-digits
    const number = cardNumber.replace(/\D/g, '');
    
    // Visa: starts with 4
    if (/^4/.test(number)) {
        return 'VISA';
    }
    
    // Mastercard: starts with 5 or 2
    if (/^5[1-5]/.test(number) || /^2[2-7]/.test(number)) {
        return 'MASTERCARD';
    }
    
    // American Express: starts with 34 or 37
    if (/^3[47]/.test(number)) {
        return 'AMEX';
    }
    
    return null;
}

function validateCardNumber(cardNumber) {
    // Remove spaces and non-digits
    const number = cardNumber.replace(/\D/g, '');
    
    // Check length (13-19 digits)
    if (number.length < 13 || number.length > 19) {
        return false;
    }
    
    // Luhn algorithm
    let sum = 0;
    let isEven = false;
    
    for (let i = number.length - 1; i >= 0; i--) {
        let digit = parseInt(number[i]);
        
        if (isEven) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }
        
        sum += digit;
        isEven = !isEven;
    }
    
    return sum % 10 === 0;
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
