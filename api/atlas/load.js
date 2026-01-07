const db = require('../../lib/storage');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        console.log('Loading atlas data for email:', email);

        // Ensure database is initialized
        await db.initDb();

        // Load atlas data
        const atlasData = await db.getAtlasData();
        console.log('📦 All atlas data keys in database:', Object.keys(atlasData));

        // Get user's data or return empty
        const userData = atlasData[email] || {
            memories: {},
            chapters: {},
            updatedAt: null
        };

        console.log('📤 Returning data for', email);
        console.log('   Memories count:', Object.keys(userData.memories || {}).length);
        console.log('   Memory keys:', Object.keys(userData.memories || {}));
        
        // Log details of each memory
        Object.keys(userData.memories || {}).forEach(key => {
            const mem = userData.memories[key];
            console.log(`   📍 ${key}:`, {
                hasImage: !!mem.image,
                imageSize: mem.image ? Math.round(mem.image.length / 1024) + 'KB' : 'none',
                hasDate: !!mem.date,
                hasCaption: !!mem.caption
            });
        });

        res.status(200).json({ 
            success: true,
            data: userData
        });
    } catch (error) {
        console.error('❌ Error loading atlas data:', error);
        console.error('   Error stack:', error.stack);
        console.error('   Error name:', error.name);
        
        res.status(500).json({ 
            error: 'Failed to load atlas data',
            message: error.message,
            type: error.name
        });
    }
};

