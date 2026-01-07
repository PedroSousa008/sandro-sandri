const db = require('../../lib/storage');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    try {
        const diagnostics = {
            timestamp: new Date().toISOString(),
            kvConfigured: false,
            kvWorking: false,
            testData: null,
            error: null
        };

        // Check if KV is configured
        await db.initDb();
        
        // Try to read and write test data
        try {
            const testKey = 'diagnostic-test';
            const testValue = { test: true, timestamp: Date.now() };
            
            // Try to save
            const atlasData = await db.getAtlasData();
            const originalCount = Object.keys(atlasData).length;
            
            // Save test data
            atlasData['__diagnostic__'] = { test: true };
            await db.saveAtlasData(atlasData);
            
            // Try to read it back
            await new Promise(resolve => setTimeout(resolve, 100));
            const verifyData = await db.getAtlasData();
            const hasTestData = !!verifyData['__diagnostic__'];
            
            // Clean up
            delete atlasData['__diagnostic__'];
            await db.saveAtlasData(atlasData);
            
            diagnostics.kvWorking = hasTestData;
            diagnostics.testData = {
                originalCount,
                saved: true,
                verified: hasTestData
            };
        } catch (error) {
            diagnostics.error = error.message;
        }

        res.status(200).json({
            success: true,
            diagnostics
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

