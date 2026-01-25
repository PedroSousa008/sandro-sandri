/* ========================================
   Sandro Sandri - Site Commerce Mode API
   Manages storefront commerce mode (LIVE, WAITLIST, EARLY_ACCESS)
   ======================================== */

const db = require('../../lib/storage');

const OWNER_EMAIL = 'sandrosandri.bysousa@gmail.com';

// Helper to verify owner authentication
function verifyOwner(req) {
    // Get email from request headers or body
    // In a real app, this would come from a session token
    // For now, we'll check if the request includes owner email
    // This should be enhanced with proper session/auth tokens
    
    // Check if owner is logged in via localStorage (client-side check)
    // Server-side: we'll accept a header or body field for owner email
    // This is a simplified approach - in production, use proper JWT/session tokens
    
    const ownerEmail = req.headers['x-owner-email'] || req.body?.ownerEmail;
    
    if (!ownerEmail || ownerEmail.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
        return false;
    }
    
    return true;
}

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Owner-Email');

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
            // Update commerce mode (owner-only)
            if (!verifyOwner(req)) {
                return res.status(403).json({
                    success: false,
                    error: 'Unauthorized. Only the owner can change commerce mode.'
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
            settings.commerce_mode = commerce_mode;
            settings.updatedAt = new Date().toISOString();

            await db.saveSiteSettings(settings);

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

