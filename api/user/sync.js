const db = require('../../lib/storage');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        // Load user data
        try {
            const { email } = req.query;

            if (!email) {
                return res.status(400).json({ error: 'Email is required' });
            }

            console.log('Loading user data for email:', email);

            await db.initDb();

            // Load all user data
            const userData = await db.getUserData();
            const atlasData = await db.getAtlasData();

            const user = userData[email] || {
                cart: [],
                profile: null,
                favorites: [],
                orders: [],
                updatedAt: null
            };

            const atlas = atlasData[email] || {
                memories: {},
                chapters: {},
                updatedAt: null
            };

            console.log('Returning user data for', email);
            console.log('   Cart items:', user.cart?.length || 0);
            console.log('   Favorites:', user.favorites?.length || 0);
            console.log('   Orders:', user.orders?.length || 0);

            res.status(200).json({
                success: true,
                data: {
                    cart: user.cart || [],
                    profile: user.profile || null,
                    favorites: user.favorites || [],
                    orders: user.orders || [],
                    atlas: atlas
                }
            });
        } catch (error) {
            console.error('Error loading user data:', error);
            res.status(500).json({
                error: 'Failed to load user data',
                message: error.message
            });
        }
    } else if (req.method === 'POST') {
        // Save user data
        try {
            const { email, cart, profile, favorites, orders, atlas } = req.body;

            if (!email) {
                return res.status(400).json({ error: 'Email is required' });
            }

            console.log('Saving user data for email:', email);
            console.log('Cart items:', cart?.length || 0);
            console.log('Profile:', profile ? 'present' : 'null');
            console.log('Favorites:', favorites?.length || 0);
            console.log('Orders:', orders?.length || 0);
            console.log('Atlas memories:', Object.keys(atlas?.memories || {}).length);

            await db.initDb();

            // Load existing data
            const userData = await db.getUserData();
            const atlasData = await db.getAtlasData();

            // Merge with existing data to preserve all fields
            const existingUser = userData[email] || {
                cart: [],
                profile: null,
                favorites: [],
                orders: [],
                updatedAt: null
            };

            // Update user data (merge to preserve existing data if not provided)
            userData[email] = {
                cart: cart !== undefined ? cart : existingUser.cart,
                profile: profile !== undefined ? profile : existingUser.profile,
                favorites: favorites !== undefined ? favorites : existingUser.favorites,
                orders: orders !== undefined ? orders : existingUser.orders,
                updatedAt: new Date().toISOString()
            };

            // Update atlas data
            if (atlas) {
                atlasData[email] = {
                    memories: atlas.memories || {},
                    chapters: atlas.chapters || {},
                    updatedAt: new Date().toISOString()
                };
            }

            // Save to database
            await db.saveUserData(userData);
            if (atlas) {
                await db.saveAtlasData(atlasData);
            }

            console.log('User data saved successfully for', email);

            res.status(200).json({
                success: true,
                message: 'User data saved successfully'
            });
        } catch (error) {
            console.error('Error saving user data:', error);
            res.status(500).json({
                error: 'Failed to save user data',
                message: error.message
            });
        }
    } else {
        return res.status(405).json({ error: 'Method not allowed' });
    }
};

