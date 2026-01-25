/* ========================================
   Sandro Sandri - Site Commerce Mode API
   Manages storefront commerce mode (LIVE, WAITLIST, EARLY_ACCESS)
   ======================================== */

const db = require('../../lib/storage');
const auth = require('../../lib/auth');
const securityLog = require('../../lib/security-log');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Token');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        await db.initDb();

        if (req.method === 'GET') {
            // Get current commerce mode (public - no auth required)
            const settings = await db.getSiteSettings();
            const mode = settings.commerce_mode || 'LIVE';
            
            res.status(200).json({
                success: true,
                commerce_mode: mode,
                updatedAt: settings.updatedAt
            });
        } else if (req.method === 'POST') {
            // SECURITY: Update commerce mode requires admin authentication
            const adminCheck = auth.requireAdmin(req);
            if (!adminCheck.authorized) {
                await securityLog.logUnauthorizedAccess(req, '/api/site-settings/commerce-mode', adminCheck.error);
                return res.status(adminCheck.statusCode).json({
                    success: false,
                    error: adminCheck.error || 'Unauthorized. Only the owner can change commerce mode.'
                });
            }

            const { commerce_mode } = req.body;

            if (!commerce_mode || !['LIVE', 'WAITLIST', 'EARLY_ACCESS'].includes(commerce_mode)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid commerce_mode. Must be LIVE, WAITLIST, or EARLY_ACCESS.'
                });
            }

            const settings = await db.getSiteSettings();
            const previousMode = settings.commerce_mode || 'LIVE';
            settings.commerce_mode = commerce_mode;
            settings.updatedAt = new Date().toISOString();

            await db.saveSiteSettings(settings);

            // SECURITY: Log admin action
            req.user = adminCheck.user;
            await securityLog.logAdminAction(req, 'CHANGE_COMMERCE_MODE', {
                previousMode: previousMode,
                newMode: commerce_mode
            });

            console.log(`✅ Commerce mode updated to: ${commerce_mode}`);

            res.status(200).json({
                success: true,
                commerce_mode: commerce_mode,
                message: `Commerce mode set to ${commerce_mode}`,
                updatedAt: settings.updatedAt
            });
        } else {
            return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Error in commerce mode API:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process request',
            message: error.message
        });
    }
};

