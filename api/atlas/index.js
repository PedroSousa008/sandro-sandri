/* ========================================
   Sandro Sandri - Atlas of Memories API
   Combined load and save endpoint
   ======================================== */

const db = require('../../lib/storage');
const cors = require('../../lib/cors');

module.exports = async (req, res) => {
    // Set secure CORS headers (restricted to allowed origins)
    cors.setCORSHeaders(res, req, ['GET', 'POST', 'OPTIONS']);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        // Load Atlas data
        try {
            const { email } = req.query;

            if (!email) {
                return res.status(400).json({ error: 'Email is required' });
            }

            await db.initDb();

            const atlasData = await db.getAtlasData();
            const userAtlas = atlasData[email] || {
                memories: {},
                chapters: {},
                updatedAt: null
            };

            res.status(200).json({
                success: true,
                data: userAtlas
            });
        } catch (error) {
            console.error('Error loading Atlas data:', error);
            res.status(500).json({
                error: 'Failed to load Atlas data',
                message: error.message
            });
        }
    } else if (req.method === 'POST') {
        // Save Atlas data
        try {
            const { email, memories, chapters } = req.body;

            if (!email) {
                return res.status(400).json({ error: 'Email is required' });
            }

            await db.initDb();

            const atlasData = await db.getAtlasData();
            
            // Load existing data and merge
            const existingAtlas = atlasData[email] || {
                memories: {},
                chapters: {}
            };

            // Merge memories (preserve existing destinations)
            const mergedMemories = {
                ...existingAtlas.memories,
                ...(memories || {})
            };

            // Merge chapters
            const mergedChapters = {
                ...existingAtlas.chapters,
                ...(chapters || {})
            };

            atlasData[email] = {
                memories: mergedMemories,
                chapters: mergedChapters,
                updatedAt: new Date().toISOString()
            };

            await db.saveAtlasData(atlasData);

            res.status(200).json({
                success: true,
                message: 'Atlas data saved successfully'
            });
        } catch (error) {
            console.error('Error saving Atlas data:', error);
            res.status(500).json({
                error: 'Failed to save Atlas data',
                message: error.message
            });
        }
    } else {
        return res.status(405).json({ error: 'Method not allowed' });
    }
};

