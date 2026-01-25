/* ========================================
   Sandro Sandri - Owner Account Setup
   One-time setup to create/reset owner password
   ======================================== */

const db = require('../../lib/storage');
const bcrypt = require('bcryptjs');

const OWNER_EMAIL = 'sandrosandri.bysousa@gmail.com';

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ 
                error: 'Password is required' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                error: 'Password must be at least 6 characters' 
            });
        }

        await db.initDb();
        const userData = await db.getUserData();

        // Hash the password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create or update owner account
        const ownerUser = userData[OWNER_EMAIL] || {
            email: OWNER_EMAIL,
            cart: [],
            profile: null,
            favorites: [],
            orders: [],
            createdAt: new Date().toISOString()
        };

        ownerUser.passwordHash = passwordHash;
        ownerUser.updatedAt = new Date().toISOString();

        userData[OWNER_EMAIL] = ownerUser;
        await db.saveUserData(userData);

        console.log('✅ Owner password set successfully');

        res.status(200).json({
            success: true,
            message: 'Owner password set successfully. You can now login.',
            email: OWNER_EMAIL
        });

    } catch (error) {
        console.error('Error setting owner password:', error);
        res.status(500).json({
            error: 'Failed to set owner password',
            message: error.message
        });
    }
};

