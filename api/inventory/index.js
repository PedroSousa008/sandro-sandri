/* ========================================
   Sandro Sandri - Inventory API
   Manages chapter-based inventory (per model, per size)
   ======================================== */

const db = require('../../lib/storage');
const cors = require('../../lib/cors');
const errorHandler = require('../../lib/error-handler');

module.exports = async (req, res) => {
    // Set secure CORS headers
    cors.setCORSHeaders(res, req, ['GET', 'OPTIONS']);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        await db.initDb();

        if (req.method === 'GET') {
            const { chapterId, modelId } = req.query;

            if (!chapterId) {
                return res.status(400).json({
                    success: false,
                    error: 'chapterId is required'
                });
            }

            // Validate chapter ID format
            if (!/^chapter-(10|[1-9])$/.test(chapterId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid chapterId format'
                });
            }

            const inventory = await db.getChapterInventory(chapterId);

            if (!inventory) {
                return res.status(200).json({
                    success: true,
                    inventory: null,
                    message: 'Inventory not initialized for this chapter'
                });
            }

            // Chapter mode determines which stock to expose (early_access: 4 XS, 7 S, 16 M, 16 L, 7 XL per model)
            let chapterMode = 'add_to_cart';
            try {
                const chapterModeData = await db.getChapterMode();
                if (chapterModeData && chapterModeData.chapters && chapterModeData.chapters[chapterId]) {
                    chapterMode = chapterModeData.chapters[chapterId].mode || 'add_to_cart';
                }
            } catch (e) {
                // ignore
            }

            const sizes = ['XS', 'S', 'M', 'L', 'XL'];
            const getEffectiveStock = (model) => {
                const stock = {};
                sizes.forEach(s => {
                    stock[s] = db.getChapterModelStock(model, s, chapterMode);
                });
                return stock;
            };

            // If modelId specified, return only that model's inventory (effective stock by chapter mode)
            if (modelId) {
                const model = inventory.models[modelId.toString()];
                if (!model) {
                    return res.status(404).json({
                        success: false,
                        error: `Model ${modelId} not found in chapter ${chapterId}`
                    });
                }
                return res.status(200).json({
                    success: true,
                    model: {
                        id: modelId,
                        name: model.name,
                        sku: model.sku,
                        stock: getEffectiveStock(model)
                    }
                });
            }

            // Return full chapter inventory with effective stock per model
            const inventoryForClient = {
                initialized: inventory.initialized,
                initializedAt: inventory.initializedAt,
                models: {}
            };
            if (inventory.models) {
                for (const [id, model] of Object.entries(inventory.models)) {
                    inventoryForClient.models[id] = {
                        name: model.name,
                        sku: model.sku,
                        stock: getEffectiveStock(model)
                    };
                }
            }
            return res.status(200).json({
                success: true,
                inventory: inventoryForClient,
                chapterId: chapterId
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        errorHandler.sendSecureError(res, error, 500, 'Failed to process request. Please try again.', 'INVENTORY_ERROR');
    }
};

