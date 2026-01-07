const db = require('../../lib/db');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Ensure database is initialized
        await db.initDb();

        // Load atlas data
        const atlasData = await db.getAtlasData();

        // Get user's data or return empty
        const userData = atlasData[email] || {
            memories: {},
            chapters: {},
            updatedAt: null
        };

        res.status(200).json({ 
            success: true,
            data: userData
        });
    } catch (error) {
        console.error('Error loading atlas data:', error);
        res.status(500).json({ 
            error: 'Failed to load atlas data',
            message: error.message 
        });
    }
};

