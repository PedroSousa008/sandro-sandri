/* ========================================
   Sandro Sandri - Active Chapter API
   Manages which chapter is currently active (Chapter I or Chapter II)
   ======================================== */

const db = require('../../lib/storage');
const auth = require('../../lib/auth');
const securityLog = require('../../lib/security-log');
const cors = require('../../lib/cors');
const errorHandler = require('../../lib/error-handler');

module.exports = async (req, res) => {
    // Set secure CORS headers (restricted to allowed origins)
    cors.setCORSHeaders(res, req, ['GET', 'POST', 'OPTIONS']);
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        await db.initDb();

        if (req.method === 'GET') {
            // Get current active chapter
            const settings = await db.getSiteSettings();
            const activeChapter = settings.active_chapter || 'chapter_i';
            
            return res.status(200).json({
                success: true,
                activeChapter: activeChapter
            });
        }

        if (req.method === 'POST') {
            // Update active chapter (admin only)
            const adminCheck = auth.requireAdmin(req);
            if (!adminCheck.authorized) {
                return res.status(adminCheck.statusCode).json({
                    success: false,
                    error: adminCheck.error || 'Unauthorized'
                });
            }

            const { chapter } = req.body;
            
            // Validate chapter value
            if (!chapter || !['chapter_i', 'chapter_ii'].includes(chapter)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid chapter. Must be "chapter_i" or "chapter_ii"'
                });
            }

            // Get current settings
            const settings = await db.getSiteSettings();
            
            // Update active chapter
            const updatedSettings = {
                ...settings,
                active_chapter: chapter,
                chapter_updatedAt: new Date().toISOString()
            };
            
            await db.saveSiteSettings(updatedSettings);

            // Log admin action
            await securityLog.logAdminAction(req, 'change_active_chapter', {
                from: settings.active_chapter || 'chapter_i',
                to: chapter
            });

            return res.status(200).json({
                success: true,
                message: `Active chapter changed to ${chapter === 'chapter_i' ? 'Chapter I' : 'Chapter II'}`,
                activeChapter: chapter
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        // SECURITY: Don't expose error details to users
        errorHandler.sendSecureError(res, error, 500, 'Failed to process request. Please try again.', 'ACTIVE_CHAPTER_ERROR');
    }
};

