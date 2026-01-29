/* ========================================
   Sandro Sandri - Products Data
   ======================================== */

const PRODUCTS = [
    {
        id: 1,
        name: "Isole Cayman",
        price: 95,
        category: "tshirts",
        description: "In the Isole Cayman, Paradise is more than a place - it's a feeling. White sands, blue waters, and warm smiles welcome you with a cheerful \"Wha Happening?\". B O D D E N breezes carry the spirit of the sea, where diverse cultures and nautical charm meet. Explore the historic Turtle Crawls, unwind on dazzling shores. Unna will find both adventure and serenity.",
        details: [
            "100% Premium Cotton",
            "Relaxed Fit",
            "Screen Printed",
            "Cream Hue",
            "Model Standing 1,80m (5'11'') using size M",
            "Made in Portugal"
        ],
        sizes: ["XS", "S", "M", "L", "XL"],
        colors: [
            { name: "Cream", code: "#f5f4f0" }
        ],
        images: [
            "images/tshirt-1a.png",
            "images/tshirt-1b.png",
            "images/tshirt-1c.png",
            "images/tshirt-1d.png"
        ],
        collection: {
            title: "Voglia di Viaggiare Signature",
            description: "For those who see travel as a philosophy, a journey of discovery and beauty."
        },
        sku: "SS-001",
        inStock: true,
        featured: true,
        inventory: {
            XS: 10,
            S: 20,
            M: 50,
            L: 50,
            XL: 20
        },
        chapter: "chapter_i"
    },
    {
        id: 2,
        name: "Isola di Necker",
        price: 95,
        category: "tshirts",
        description: "It is the pinnacle of private island luxury - a sanctuary where pristine nature and effortless elegance converge. Encircled by the crystal-clear waters of the Caribbean, this exclusive retreat offers an unparalleled blend of seclusion, adventure, and refined indulgence. Whether you're sailing through turquoise lagoons, unwinding in opulent beachfront villas, or savoring world-class cuisine under the stars, every moment on the Island is designed to elevate senses.",
        details: [
            "100% Premium Cotton",
            "Relaxed Fit",
            "Screen Printed",
            "Cream Hue",
            "Model Standing 1,80m (5'11'') using size M",
            "Made in Portugal"
        ],
        sizes: ["XS", "S", "M", "L", "XL"],
        colors: [
            { name: "Cream", code: "#f5f4f0" }
        ],
        images: [
            "images/tshirt-2a.png",
            "images/tshirt-2b.png",
            "images/tshirt-2c.png",
            "images/tshirt-2d.png"
        ],
        collection: {
            title: "Voglia di Viaggiare Signature",
            description: "For those who see travel as a philosophy, a journey of discovery and beauty."
        },
        sku: "SS-002",
        inStock: true,
        featured: true,
        inventory: {
            XS: 10,
            S: 20,
            M: 50,
            L: 50,
            XL: 20
        },
        chapter: "chapter_i"
    },
    {
        id: 3,
        name: "Monroe's Kisses",
        price: 95,
        category: "tshirts",
        description: "Marilyn, they still speak of your kisses. Soft as cashmere and fleeting as champagne bubbles. They say your kisses carried the elegance of roses in full bloom, the decadence of midnight escapades, the allure of something just out of reach. But Marilyn, your kisses were never mere gestures. They were couture - tailored to the moment, unforgettable, and utterly, exquisitely divine. Ohhh, I could spend an eternity lost in the poetry of those kisses.",
        details: [
            "100% Premium Cotton",
            "Relaxed Fit",
            "Screen Printed",
            "Cream Hue",
            "Model Standing 1,80m (5'11'') using size M",
            "Made in Portugal"
        ],
        sizes: ["XS", "S", "M", "L", "XL"],
        colors: [
            { name: "Cream", code: "#f5f4f0" }
        ],
        images: [
            "images/tshirt-3a.png",
            "images/tshirt-3b.png",
            "images/tshirt-3c.png",
            "images/tshirt-3d.png"
        ],
        collection: {
            title: "Connoisseur Signature",
            description: "For those who appreciate the finer things in life."
        },
        sku: "SS-003",
        inStock: true,
        featured: true,
        inventory: {
            XS: 10,
            S: 20,
            M: 50,
            L: 50,
            XL: 20
        },
        chapter: "chapter_i"
    },
    {
        id: 4,
        name: "Sardinia",
        price: 95,
        category: "tshirts",
        description: "Cradled in the embrace of the Mediterranean, Sardinia enchants with its rugged landscapes and tranquil shores, where timeless beauty and ancient traditions intertwine. Its serene coastline invites reflection, while its villages whisper stories of a slower, more deliberate life. Yet, as with the sea, not every desire is met. And in its mysteries, we find the soul of a land untouched by time.",
        details: [
            "100% Premium Cotton",
            "Relaxed Fit",
            "Screen Printed",
            "Cream Hue",
            "Model Standing 1,80m (5'11'') using size M",
            "Made in Portugal"
        ],
        sizes: ["XS", "S", "M", "L", "XL"],
        colors: [
            { name: "Cream", code: "#f5f4f0" }
        ],
        images: [
            "images/tshirt-4a.png",
            "images/tshirt-4b.png",
            "images/tshirt-4c.png",
            "images/tshirt-4d.png"
        ],
        collection: {
            title: "L'Italia per un viaggio indimenticabile Signature",
            description: "The spirit of Italian charm, evoking the allure of an unfurgettable escape."
        },
        sku: "SS-004",
        inStock: true,
        featured: true,
        inventory: {
            XS: 10,
            S: 20,
            M: 50,
            L: 50,
            XL: 20
        },
        chapter: "chapter_i"
    },
    {
        id: 5,
        name: "Port-Coton",
        price: 95,
        category: "tshirts",
        description: "Les Pyramides de Port-Coton, mer sauvage by Claude Monet captures the untamed drama of sea and stone with breathtaking intensity. Towering rock formations rise defiantly from crashing waves, rendered in thick, expressive brushstrokes that mirror the raw energy of the Atlantic. Monet's bold use of colour - deep blues, stormy grays, and frothy whites - creates a vivid, almost physical sensation of wind and spray. This work departs from tranquil Impressionism. 1886",
        details: [
            "100% Premium Cotton",
            "Relaxed Fit",
            "Screen Printed",
            "Cream Hue",
            "Model Standing 1,80m (5'11'') using size M",
            "Made in Portugal"
        ],
        sizes: ["XS", "S", "M", "L", "XL"],
        colors: [
            { name: "Cream", code: "#f5f4f0" }
        ],
        images: [
            "images/tshirt-5a.png",
            "images/tshirt-5b.png",
            "images/tshirt-5c.png",
            "images/tshirt-5d.png"
        ],
        collection: {
            title: "Rinascimento Couture Signature",
            description: "A tribute for artistic rebirth, blending heritage with modern refinement."
        },
        sku: "SS-005",
        inStock: true,
        featured: true,
        inventory: {
            XS: 10,
            S: 20,
            M: 50,
            L: 50,
            XL: 20
        },
        chapter: "chapter_i"
    },
    // Chapter II Products (IDs 6-10)
    {
        id: 6,
        name: "Maldives",
        price: 95,
        category: "tshirts",
        description: "A sanctuary of barefoot luxury where time slows, and nature's beauty reigns supreme. \"No shoes, No news\" - just the gentle whisper of the ocean, and endless horizons of sapphire blue. \"Maruhaba\" to a paradise on earth, where overwater villas float above crystal-clear lagoons, and secluded beaches invite effortless serenity. The Mal (dive) s - where every dive is a journey into a world of endless wonder.",
        details: [
            "100% Premium Cotton",
            "Relaxed Fit",
            "Screen Printed",
            "Cream Hue",
            "Model Standing 1,80m (5'11'') using size M",
            "Made in Portugal"
        ],
        sizes: ["XS", "S", "M", "L", "XL"],
        colors: [
            { name: "Cream", code: "#f5f4f0" }
        ],
        images: [
            "images/maldives1.png",
            "images/maldives2.png"
        ],
        collection: {
            title: "Voglia di Viaggiare Signature",
            description: "For those who see travel as a philosophy, a journey of discovery and beauty."
        },
        sku: "SS-006",
        inStock: true,
        featured: true,
        inventory: {
            XS: 10,
            S: 20,
            M: 50,
            L: 50,
            XL: 20
        },
        chapter: "chapter_ii"
    },
    {
        id: 7,
        name: "Palma Mallorca",
        price: 95,
        category: "tshirts",
        description: "Sun drenched escape where palms sway to the rhythm of the sea, and golden light kisses ancient stone and turquoise coves. The Mediterranean's best-kept secret, whispered between olive groves and quiet villages painted in sun.faded hues. Here, every breeze hums the melody of \"La Isla Bonita\", where Madonna once dreamt of San Pedro - but the true dream lives here, in the soul of Spain's own jewel. \"Con Amor desde la isla bonita de España\", from winding coastal roads to secret calas.",
        details: [
            "100% Premium Cotton",
            "Relaxed Fit",
            "Screen Printed",
            "Cream Hue",
            "Model Standing 1,80m (5'11'') using size M",
            "Made in Portugal"
        ],
        sizes: ["XS", "S", "M", "L", "XL"],
        colors: [
            { name: "Cream", code: "#f5f4f0" }
        ],
        images: [
            "images/palma1.png",
            "images/palma2.png",
            "images/palma3.png",
            "images/palma4.png"
        ],
        collection: {
            title: "Voglia di Viaggiare Signature",
            description: "For those who see travel as a philosophy, a journey of discovery and beauty."
        },
        sku: "SS-007",
        inStock: true,
        featured: true,
        inventory: {
            XS: 10,
            S: 20,
            M: 50,
            L: 50,
            XL: 20
        },
        chapter: "chapter_ii"
    },
    {
        id: 8,
        name: "Lago di Como",
        price: 95,
        category: "tshirts",
        description: "Lago Di Como glimmers like liquid silk, where mountains rise with quiet grandeur and villas stand as echoes of a storied past. The water reflects more than the sky-it holds whispers of romance, of idle afternoons, of wine kissed by the fading sun. Here, beauty is effortless, time is unhurried, and every glance is a love letter to elegance itself.",
        details: [
            "100% Premium Cotton",
            "Relaxed Fit",
            "Screen Printed",
            "Cream Hue",
            "Model Standing 1,80m (5'11'') using size M",
            "Made in Portugal"
        ],
        sizes: ["XS", "S", "M", "L", "XL"],
        colors: [
            { name: "Cream", code: "#f5f4f0" }
        ],
        images: [
            "images/lago1.png",
            "images/lago2.png",
            "images/lago3.png",
            "images/lago4.png"
        ],
        collection: {
            title: "L'Italia per un viaggio indimenticabile Signature",
            description: "The spirit of Italian charm, evoking the allure of an unfurgettable escape."
        },
        sku: "SS-008",
        inStock: true,
        featured: true,
        inventory: {
            XS: 10,
            S: 20,
            M: 50,
            L: 50,
            XL: 20
        },
        chapter: "chapter_ii"
    },
    {
        id: 9,
        name: "Gisele",
        price: 95,
        category: "tshirts",
        description: "Gisele, poised atop the Martini's delicate rim radiates an aura of effortless sophistication. The rich Expresso gleams beneath her, as her Birkin Bag rests below in a whisper of understated opulence, capturing the essence of Timeless Elegance.",
        details: [
            "100% Premium Cotton",
            "Relaxed Fit",
            "Screen Printed",
            "Cream Hue",
            "Model Standing 1,80m (5'11'') using size M",
            "Made in Portugal"
        ],
        sizes: ["XS", "S", "M", "L", "XL"],
        colors: [
            { name: "Cream", code: "#f5f4f0" }
        ],
        images: [
            "images/gisele1.png",
            "images/gisele2.png",
            "images/gisele3.png",
            "images/gisele4.png"
        ],
        collection: {
            title: "Connoisseur Signature",
            description: "For those who appreciate the finer things in life."
        },
        sku: "SS-009",
        inStock: true,
        featured: true,
        inventory: {
            XS: 10,
            S: 20,
            M: 50,
            L: 50,
            XL: 20
        },
        chapter: "chapter_ii"
    },
    {
        id: 10,
        name: "Pourville",
        price: 95,
        category: "tshirts",
        description: "The Cliff Walk at Pourville by Claude Monet beautifully captures the quiet majesty of the Normandy coast. The painting immerses the viewer in a windswept landscape, where rolling cliffs meet the vast expanse of sea and sky. Monet's masterful use of light and color transforms the scene into a symphony of blues and greens, evoking both serenity and movement. His delicate yet expressive brushstrokes blur the line between earth air, creating a dreamlike harmony that embodies the fleeting beauty of nature, a hallmark of Impressionism. 1882",
        details: [
            "100% Premium Cotton",
            "Relaxed Fit",
            "Screen Printed",
            "Cream Hue",
            "Model Standing 1,80m (5'11'') using size M",
            "Made in Portugal"
        ],
        sizes: ["XS", "S", "M", "L", "XL"],
        colors: [
            { name: "Cream", code: "#f5f4f0" }
        ],
        images: [
            "images/pourville1.png",
            "images/pourville2.png",
            "images/pourville3.png",
            "images/pourville4.png"
        ],
        collection: {
            title: "Rinascimento Couture Signature",
            description: "A tribute for artistic rebirth, blending heritage with modern refinement."
        },
        sku: "SS-010",
        inStock: true,
        featured: true,
        inventory: {
            XS: 10,
            S: 20,
            M: 50,
            L: 50,
            XL: 20
        },
        chapter: "chapter_ii"
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

// Get products by chapter
function getProductsByChapter(chapter) {
    if (chapter === 'chapter_i' || chapter === 'chapter-1') {
        return PRODUCTS.filter(p => !p.chapter || p.chapter === 'chapter_i');
    } else if (chapter === 'chapter_ii' || chapter === 'chapter-2') {
        return PRODUCTS.filter(p => p.chapter === 'chapter_ii');
    }
    return PRODUCTS;
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
    getByChapter: getProductsByChapter,
    getByCategory: getProductsByCategory,
    getFeatured: getFeaturedProducts,
    search: searchProducts,
    getCategories: getCategories,
    formatPrice: formatPrice
};


