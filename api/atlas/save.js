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

        console.log('💾 Saving atlas data for email:', email);
        console.log('   Memories count:', Object.keys(memories || {}).length);
        console.log('   Chapters:', Object.keys(chapters || {}).length);
        
        // Log memory details
        Object.keys(memories || {}).forEach(key => {
            const memory = memories[key];
            console.log(`   📍 ${key}:`, {
                hasImage: !!memory.image,
                imageSize: memory.image ? Math.round(memory.image.length / 1024) + 'KB' : 'none',
                hasDate: !!memory.date,
                hasCaption: !!memory.caption
            });
        });

        // Ensure database is initialized
        await db.initDb();

        // Load existing atlas data
        const atlasData = await db.getAtlasData();
        console.log('   Existing users in database:', Object.keys(atlasData).length);

        // Update or create user's atlas data
        atlasData[email] = {
            memories: memories || {},
            chapters: chapters || {},
            updatedAt: new Date().toISOString()
        };

        // Save to database
        await db.saveAtlasData(atlasData);
        console.log('✅ Atlas data saved to database successfully');

        // Verify it was saved - try multiple times to ensure persistence
        let verifyAttempts = 0;
        let verified = false;
        while (verifyAttempts < 3 && !verified) {
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
            const verifyData = await db.getAtlasData();
            const savedMemories = verifyData[email]?.memories || {};
            const savedCount = Object.keys(savedMemories).length;
            console.log(`✅ Verification attempt ${verifyAttempts + 1}: Saved memories count:`, savedCount);
            
            if (savedCount === Object.keys(memories || {}).length && savedCount > 0) {
                verified = true;
                // Log each saved memory
                Object.keys(savedMemories).forEach(key => {
                    const mem = savedMemories[key];
                    console.log(`   📍 ${key}:`, {
                        hasImage: !!mem.image,
                        imageSize: mem.image ? Math.round(mem.image.length / 1024) + 'KB' : 'none',
                        hasDate: !!mem.date,
                        hasCaption: !!mem.caption
                    });
                });
            }
            verifyAttempts++;
        }
        
        if (!verified) {
            console.warn('⚠️ Verification incomplete, but data was saved');
        }

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

