/* ========================================
   Sandro Sandri - Products Data
   ======================================== */

const PRODUCTS = [
    {
        id: 1,
        name: "The Milano Blazer",
        price: 485,
        category: "blazers",
        description: "A masterfully tailored blazer that embodies Italian sophistication. Crafted from premium Portuguese wool, featuring hand-finished details and a contemporary slim fit.",
        details: [
            "100% Portuguese Merino Wool",
            "Half-canvas construction",
            "Natural horn buttons",
            "Functional surgeon cuffs",
            "Interior silk lining"
        ],
        sizes: ["46", "48", "50", "52", "54"],
        colors: [
            { name: "Navy", code: "#2c3e5c" },
            { name: "Charcoal", code: "#3a3a3a" }
        ],
        images: [],
        sku: "SS-001",
        inStock: true,
        featured: true
    },
    {
        id: 2,
        name: "The Firenze Trousers",
        price: 295,
        category: "trousers",
        description: "Elegantly cut trousers that transition seamlessly from day to evening. The perfect complement to our Milano Blazer.",
        details: [
            "98% Portuguese wool, 2% elastane",
            "Flat front design",
            "Extended waistband closure",
            "French bearers",
            "Italian Riri zipper"
        ],
        sizes: ["46", "48", "50", "52", "54"],
        colors: [
            { name: "Navy", code: "#2c3e5c" },
            { name: "Charcoal", code: "#3a3a3a" },
            { name: "Cream", code: "#f5f4f2" }
        ],
        images: [],
        sku: "SS-002",
        inStock: true,
        featured: true
    },
    {
        id: 3,
        name: "The Roma Shirt",
        price: 195,
        category: "shirts",
        description: "A refined dress shirt with impeccable construction. The spread collar and French cuffs add a touch of formality.",
        details: [
            "100% Egyptian cotton",
            "Mother of pearl buttons",
            "Removable collar stays",
            "Split yoke construction",
            "Single needle stitching"
        ],
        sizes: ["38", "39", "40", "41", "42", "43"],
        colors: [
            { name: "White", code: "#ffffff" },
            { name: "Light Blue", code: "#d4e5f7" }
        ],
        images: [],
        sku: "SS-003",
        inStock: true,
        featured: true
    },
    {
        id: 4,
        name: "The Venezia Coat",
        price: 695,
        category: "coats",
        description: "A statement piece for the modern gentleman. This overcoat features a relaxed silhouette with structured shoulders.",
        details: [
            "100% Italian cashmere blend",
            "Full lining in silk",
            "Peak lapels",
            "Two interior pockets",
            "Handcrafted in Porto"
        ],
        sizes: ["46", "48", "50", "52", "54"],
        colors: [
            { name: "Camel", code: "#c4a77d" },
            { name: "Navy", code: "#2c3e5c" }
        ],
        images: [],
        sku: "SS-004",
        inStock: true,
        featured: true
    },
    {
        id: 5,
        name: "The Napoli Polo",
        price: 145,
        category: "shirts",
        description: "A luxurious polo shirt that defies casual expectations. Refined enough for the boardroom, comfortable enough for the weekend.",
        details: [
            "100% Long-staple cotton piqué",
            "Three-button placket",
            "Ribbed collar and cuffs",
            "Side vents",
            "Embroidered logo"
        ],
        sizes: ["S", "M", "L", "XL"],
        colors: [
            { name: "Navy", code: "#2c3e5c" },
            { name: "White", code: "#ffffff" },
            { name: "Sage", code: "#9caf88" }
        ],
        images: [],
        sku: "SS-005",
        inStock: true,
        featured: false
    },
    {
        id: 6,
        name: "The Torino Gilet",
        price: 265,
        category: "vests",
        description: "A versatile layering piece that adds sophistication to any ensemble. Perfect worn over a shirt or under a blazer.",
        details: [
            "100% Portuguese wool",
            "Five-button front",
            "Adjustable back belt",
            "Two welt pockets",
            "Full silk lining"
        ],
        sizes: ["46", "48", "50", "52", "54"],
        colors: [
            { name: "Navy", code: "#2c3e5c" },
            { name: "Burgundy", code: "#722f37" }
        ],
        images: [],
        sku: "SS-006",
        inStock: true,
        featured: false
    },
    {
        id: 7,
        name: "The Amalfi Linen Shirt",
        price: 175,
        category: "shirts",
        description: "Pure linen elegance for warm days. Light, breathable, and effortlessly refined.",
        details: [
            "100% Belgian linen",
            "Mother of pearl buttons",
            "Relaxed fit",
            "Box pleat back",
            "Rounded hem"
        ],
        sizes: ["38", "39", "40", "41", "42", "43"],
        colors: [
            { name: "White", code: "#ffffff" },
            { name: "Sand", code: "#d4c4a8" },
            { name: "Light Blue", code: "#d4e5f7" }
        ],
        images: [],
        sku: "SS-007",
        inStock: true,
        featured: false
    },
    {
        id: 8,
        name: "The Portofino Shorts",
        price: 185,
        category: "trousers",
        description: "Tailored shorts that maintain elegance while embracing leisure. Perfect for Mediterranean summers.",
        details: [
            "98% Cotton, 2% elastane",
            "9-inch inseam",
            "Side adjusters",
            "Italian belt loops",
            "On-seam pockets"
        ],
        sizes: ["46", "48", "50", "52", "54"],
        colors: [
            { name: "Navy", code: "#2c3e5c" },
            { name: "Cream", code: "#f5f4f2" },
            { name: "Olive", code: "#6b7c5c" }
        ],
        images: [],
        sku: "SS-008",
        inStock: true,
        featured: false
    }
];

// Get all products
function getAllProducts() {
    return PRODUCTS;
}

// Get product by ID
function getProductById(id) {
    return PRODUCTS.find(product => product.id === parseInt(id));
}

// Get products by category
function getProductsByCategory(category) {
    if (!category || category === 'all') {
        return PRODUCTS;
    }
    return PRODUCTS.filter(product => product.category === category);
}

// Get featured products
function getFeaturedProducts() {
    return PRODUCTS.filter(product => product.featured);
}

// Search products
function searchProducts(query) {
    const searchTerm = query.toLowerCase().trim();
    if (!searchTerm) return PRODUCTS;
    
    return PRODUCTS.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm) ||
        product.sku.toLowerCase().includes(searchTerm)
    );
}

// Get categories
function getCategories() {
    const categories = [...new Set(PRODUCTS.map(product => product.category))];
    return categories;
}

// Format price
function formatPrice(price) {
    return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR'
    }).format(price);
}

// Export for use in other files
window.ProductsAPI = {
    getAll: getAllProducts,
    getById: getProductById,
    getByCategory: getProductsByCategory,
    getFeatured: getFeaturedProducts,
    search: searchProducts,
    getCategories: getCategories,
    formatPrice: formatPrice
};

