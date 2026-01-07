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

    // Add timeout protection
    const timeout = setTimeout(() => {
        console.error('❌ Request timeout - payload may be too large');
    }, 25000); // 25 second timeout

    try {
        // Check request body size
        const bodySize = JSON.stringify(req.body).length;
        const bodySizeKB = Math.round(bodySize / 1024);
        console.log('📦 Request body size:', bodySizeKB, 'KB');
        
        if (bodySizeKB > 3000) {
            console.error('❌ Request body too large:', bodySizeKB, 'KB (max ~3000KB)');
            return res.status(413).json({ 
                error: 'Payload too large',
                message: `Request body is ${bodySizeKB}KB, maximum is ~3000KB. Please reduce image size.`
            });
        }

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
        console.log('💾 Calling db.saveAtlasData...');
        await db.saveAtlasData(atlasData);
        console.log('✅ db.saveAtlasData completed');

        // Verify it was saved - try multiple times to ensure persistence
        let verifyAttempts = 0;
        let verified = false;
        while (verifyAttempts < 3 && !verified) {
            await new Promise(resolve => setTimeout(resolve, 200)); // Small delay
            console.log(`🔍 Verification attempt ${verifyAttempts + 1}...`);
            const verifyData = await db.getAtlasData();
            const savedMemories = verifyData[email]?.memories || {};
            const savedCount = Object.keys(savedMemories).length;
            const expectedCount = Object.keys(memories || {}).length;
            
            console.log(`   Expected: ${expectedCount} memories, Found: ${savedCount} memories`);
            
            if (savedCount === expectedCount && savedCount > 0) {
                verified = true;
                console.log('✅ Verification SUCCESSFUL!');
                // Log each saved memory
                Object.keys(savedMemories).forEach(key => {
                    const mem = savedMemories[key];
                    const hasImage = !!(mem.image && mem.image.length > 0);
                    console.log(`   📍 ${key}:`, {
                        hasImage: hasImage,
                        imageSize: hasImage ? Math.round(mem.image.length / 1024) + 'KB' : 'none',
                        hasDate: !!mem.date,
                        hasCaption: !!mem.caption
                    });
                });
            } else {
                console.warn(`   ⚠️ Verification failed: expected ${expectedCount}, got ${savedCount}`);
            }
            verifyAttempts++;
        }
        
        if (!verified) {
            console.error('❌ VERIFICATION FAILED - Data may not have been saved!');
            console.error('   This usually means KV/Redis is not configured properly.');
            console.error('   Check Vercel environment variables for KV_REST_API_URL and KV_REST_API_TOKEN');
        }

        clearTimeout(timeout);
        res.status(200).json({ 
            success: true, 
            message: 'Atlas data saved successfully' 
        });
    } catch (error) {
        clearTimeout(timeout);
        console.error('❌ Error saving atlas data:', error);
        console.error('   Error stack:', error.stack);
        console.error('   Error name:', error.name);
        
        // Return more detailed error for debugging
        res.status(500).json({ 
            error: 'Failed to save atlas data',
            message: error.message,
            type: error.name,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

