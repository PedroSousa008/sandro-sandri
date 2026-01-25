/* ========================================
   Sandro Sandri - Input Validation & Sanitization
   Prevents XSS, injection attacks, and data corruption
   ======================================== */

// HTML entity encoding to prevent XSS
function escapeHtml(text) {
    if (typeof text !== 'string') {
        return text;
    }
    
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Sanitize string input
function sanitizeString(input, options = {}) {
    if (input === null || input === undefined) {
        return null;
    }
    
    // Convert to string if not already
    let str = String(input);
    
    // Trim whitespace
    if (options.trim !== false) {
        str = str.trim();
    }
    
    // Remove null bytes
    str = str.replace(/\0/g, '');
    
    // Limit length
    if (options.maxLength && str.length > options.maxLength) {
        str = str.substring(0, options.maxLength);
    }
    
    // Escape HTML if needed
    if (options.escapeHtml !== false) {
        str = escapeHtml(str);
    }
    
    return str;
}

// Validate and sanitize email
function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        return { valid: false, error: 'Email is required' };
    }
    
    const sanitized = sanitizeString(email, { maxLength: 254, escapeHtml: false });
    
    // Email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitized)) {
        return { valid: false, error: 'Invalid email format', sanitized: null };
    }
    
    // Additional checks
    if (sanitized.length < 3 || sanitized.length > 254) {
        return { valid: false, error: 'Email length must be between 3 and 254 characters', sanitized: null };
    }
    
    // Check for suspicious patterns
    if (sanitized.includes('..') || sanitized.startsWith('.') || sanitized.endsWith('.')) {
        return { valid: false, error: 'Invalid email format', sanitized: null };
    }
    
    return { valid: true, sanitized: sanitized.toLowerCase() };
}

// Validate and sanitize password
function validatePassword(password) {
    if (!password || typeof password !== 'string') {
        return { valid: false, error: 'Password is required' };
    }
    
    // Password length validation
    if (password.length < 6) {
        return { valid: false, error: 'Password must be at least 6 characters' };
    }
    
    if (password.length > 128) {
        return { valid: false, error: 'Password must be less than 128 characters' };
    }
    
    // Don't sanitize password (it will be hashed anyway)
    // But check for null bytes
    if (password.includes('\0')) {
        return { valid: false, error: 'Invalid password format' };
    }
    
    return { valid: true };
}

// Validate and sanitize profile data
function validateProfile(profile) {
    if (!profile || typeof profile !== 'object') {
        return { valid: false, error: 'Profile must be an object' };
    }
    
    const sanitized = {};
    
    // Name validation
    if (profile.name !== undefined) {
        const name = sanitizeString(profile.name, { maxLength: 100 });
        if (name && name.length > 0) {
            sanitized.name = name;
        }
    }
    
    // Phone validation
    if (profile.phone !== undefined) {
        const phone = sanitizeString(profile.phone, { maxLength: 20 });
        if (phone && phone.length > 0) {
            // Remove non-digit characters except +, -, spaces, parentheses
            const cleaned = phone.replace(/[^\d+\-() ]/g, '');
            if (cleaned.length <= 20) {
                sanitized.phone = cleaned;
            }
        }
    }
    
    // Address validation
    if (profile.address) {
        sanitized.address = {};
        
        if (profile.address.street !== undefined) {
            const street = sanitizeString(profile.address.street, { maxLength: 200 });
            if (street) sanitized.address.street = street;
        }
        
        if (profile.address.city !== undefined) {
            const city = sanitizeString(profile.address.city, { maxLength: 100 });
            if (city) sanitized.address.city = city;
        }
        
        if (profile.address.postalCode !== undefined) {
            const postalCode = sanitizeString(profile.address.postalCode, { maxLength: 20 });
            if (postalCode) sanitized.address.postalCode = postalCode;
        }
        
        if (profile.address.country !== undefined) {
            const country = sanitizeString(profile.address.country, { maxLength: 100 });
            if (country) sanitized.address.country = country;
        }
    }
    
    return { valid: true, sanitized };
}

// Validate cart items
function validateCartItem(item) {
    if (!item || typeof item !== 'object') {
        return { valid: false, error: 'Cart item must be an object' };
    }
    
    // Product ID validation
    const productId = parseInt(item.productId, 10);
    if (isNaN(productId) || productId < 1 || productId > 100) {
        return { valid: false, error: 'Invalid product ID' };
    }
    
    // Size validation
    const validSizes = ['XS', 'S', 'M', 'L', 'XL'];
    if (!item.size || !validSizes.includes(item.size)) {
        return { valid: false, error: 'Invalid size' };
    }
    
    // Quantity validation
    const quantity = parseInt(item.quantity, 10);
    if (isNaN(quantity) || quantity < 1 || quantity > 10) {
        return { valid: false, error: 'Invalid quantity (must be between 1 and 10)' };
    }
    
    return {
        valid: true,
        sanitized: {
            productId: productId,
            size: item.size,
            quantity: quantity
        }
    };
}

// Validate cart array
function validateCart(cart) {
    if (!Array.isArray(cart)) {
        return { valid: false, error: 'Cart must be an array' };
    }
    
    if (cart.length > 50) {
        return { valid: false, error: 'Cart cannot contain more than 50 items' };
    }
    
    const sanitized = [];
    for (const item of cart) {
        const itemValidation = validateCartItem(item);
        if (!itemValidation.valid) {
            return itemValidation;
        }
        sanitized.push(itemValidation.sanitized);
    }
    
    return { valid: true, sanitized };
}

// Validate favorites array
function validateFavorites(favorites) {
    if (!Array.isArray(favorites)) {
        return { valid: false, error: 'Favorites must be an array' };
    }
    
    if (favorites.length > 100) {
        return { valid: false, error: 'Favorites cannot contain more than 100 items' };
    }
    
    const sanitized = [];
    for (const fav of favorites) {
        const productId = parseInt(fav, 10);
        if (!isNaN(productId) && productId >= 1 && productId <= 100) {
            sanitized.push(productId);
        }
    }
    
    return { valid: true, sanitized };
}

// Sanitize general object (recursive)
function sanitizeObject(obj, maxDepth = 10) {
    if (maxDepth <= 0) {
        return null;
    }
    
    if (obj === null || obj === undefined) {
        return obj;
    }
    
    if (typeof obj === 'string') {
        return sanitizeString(obj, { maxLength: 10000 });
    }
    
    if (typeof obj === 'number') {
        if (isNaN(obj) || !isFinite(obj)) {
            return 0;
        }
        return obj;
    }
    
    if (typeof obj === 'boolean') {
        return obj;
    }
    
    if (Array.isArray(obj)) {
        if (obj.length > 1000) {
            return obj.slice(0, 1000).map(item => sanitizeObject(item, maxDepth - 1));
        }
        return obj.map(item => sanitizeObject(item, maxDepth - 1));
    }
    
    if (typeof obj === 'object') {
        const sanitized = {};
        const keys = Object.keys(obj);
        if (keys.length > 100) {
            // Limit object size
            keys.slice(0, 100).forEach(key => {
                const sanitizedKey = sanitizeString(key, { maxLength: 100 });
                sanitized[sanitizedKey] = sanitizeObject(obj[key], maxDepth - 1);
            });
        } else {
            keys.forEach(key => {
                const sanitizedKey = sanitizeString(key, { maxLength: 100 });
                sanitized[sanitizedKey] = sanitizeObject(obj[key], maxDepth - 1);
            });
        }
        return sanitized;
    }
    
    return null;
}

module.exports = {
    escapeHtml,
    sanitizeString,
    validateEmail,
    validatePassword,
    validateProfile,
    validateCartItem,
    validateCart,
    validateFavorites,
    sanitizeObject
};

