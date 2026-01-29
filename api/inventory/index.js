/* ========================================
   Sandro Sandri - Inventory API
   Provides inventory data for frontend
   ======================================== */

const inventoryService = require('../../lib/inventory');
const cors = require('../../lib/cors');
const errorHandler = require('../../lib/error-handler');

module.exports = async (req, res) => {
    // Set secure CORS headers
    cors.setCORSHeaders(res, req, ['GET', 'OPTIONS']);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method === 'GET') {
            const { chapterId, modelId, size } = req.query;

            // Get inventory for specific chapter + model + size
            if (chapterId && modelId && size) {
                const stock = await inventoryService.getStock(chapterId, parseInt(modelId), size);
                return res.status(200).json({
                    success: true,
                    chapterId,
                    modelId: parseInt(modelId),
                    size,
                    stock
                });
            }

            // Get inventory for specific chapter + model
            if (chapterId && modelId) {
                const inventory = await inventoryService.getInventoryForModel(chapterId, parseInt(modelId));
                return res.status(200).json({
                    success: true,
                    chapterId,
                    modelId: parseInt(modelId),
                    inventory
                });
            }

            // Get inventory for entire chapter
            if (chapterId) {
                const inventory = await inventoryService.getInventory(chapterId);
                return res.status(200).json({
                    success: true,
                    chapterId,
                    inventory
                });
            }

            // No parameters - return error
            return res.status(400).json({
                success: false,
                error: 'Missing required parameter: chapterId'
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        errorHandler.sendSecureError(res, error, 500, 'Failed to fetch inventory. Please try again.', 'INVENTORY_ERROR');
    }
};

