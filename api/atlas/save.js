const db = require('../../lib/storage');

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
        const { email, memories, chapters } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        console.log('Saving atlas data for email:', email);
        console.log('Memories count:', Object.keys(memories || {}).length);
        console.log('Chapters:', Object.keys(chapters || {}).length);

        // Ensure database is initialized
        await db.initDb();

        // Load existing atlas data
        const atlasData = await db.getAtlasData();

        // Update or create user's atlas data
        atlasData[email] = {
            memories: memories || {},
            chapters: chapters || {},
            updatedAt: new Date().toISOString()
        };

        // Save to database
        await db.saveAtlasData(atlasData);

        console.log('Atlas data saved successfully for', email);

        res.status(200).json({ 
            success: true, 
            message: 'Atlas data saved successfully' 
        });
    } catch (error) {
        console.error('Error saving atlas data:', error);
        res.status(500).json({ 
            error: 'Failed to save atlas data',
            message: error.message 
        });
    }
};

