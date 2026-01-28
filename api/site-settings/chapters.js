/* ========================================
   Sandro Sandri - Chapters Management API
   Manages chapters data (created status, modes, active chapter)
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
            // Get chapters data (public read)
            const chapters = await db.getChapters();
            const activeChapterId = db.getActiveChapterId(chapters);
            
            // Find active chapter
            const activeChapter = chapters.find(ch => ch.id === activeChapterId);
            const activeChapterMode = activeChapter ? activeChapter.mode : 'add_to_cart';
            
            return res.status(200).json({
                success: true,
                chapters: chapters,
                activeChapterId: activeChapterId,
                activeChapterMode: activeChapterMode
            });
        }

        if (req.method === 'POST') {
            // Update chapters (admin only)
            const adminCheck = auth.requireAdmin(req);
            if (!adminCheck.authorized) {
                await securityLog.logUnauthorizedAccess(req, '/api/site-settings/chapters', adminCheck.error);
                return res.status(adminCheck.statusCode).json({
                    success: false,
                    error: adminCheck.error || 'Unauthorized. Only the owner can change chapters.'
                });
            }

            const { chapterId, created, mode } = req.body;

            if (!chapterId) {
                return res.status(400).json({
                    success: false,
                    error: 'chapterId is required'
                });
            }

            // Get current chapters
            let chapters = await db.getChapters();
            
            // Find the chapter to update
            const chapterIndex = chapters.findIndex(ch => ch.id === chapterId);
            if (chapterIndex === -1) {
                return res.status(400).json({
                    success: false,
                    error: `Chapter ${chapterId} not found`
                });
            }

            const chapter = chapters[chapterIndex];
            const previousCreated = chapter.created;
            const previousMode = chapter.mode;

            // Update created status if provided
            if (created !== undefined) {
                chapter.created = created === true;
                chapter.updatedAt = new Date().toISOString();

                // CRITICAL: If marking as Created=Yes, automatically:
                // 1. Set this as the active chapter
                // 2. Lock all previous chapters (Created=Yes but not this one) to "add_to_cart"
                if (created === true) {
                    // Lock all previous chapters to "add_to_cart"
                    chapters.forEach((ch, idx) => {
                        if (idx < chapterIndex && ch.created === true) {
                            ch.mode = 'add_to_cart';
                            ch.updatedAt = new Date().toISOString();
                            console.log(`🔒 Locked chapter ${ch.id} to add_to_cart (previous chapter)`);
                        }
                    });
                }

                // Log admin action
                req.user = adminCheck.user;
                await securityLog.logAdminAction(req, 'CHANGE_CHAPTER_CREATED', {
                    chapterId: chapterId,
                    previousCreated: previousCreated,
                    newCreated: created
                });

                console.log(`✅ Chapter ${chapterId} created status: ${created}`);
            }

            // Update mode if provided (only if chapter is created AND is the active chapter)
            if (mode !== undefined) {
                if (!['waitlist', 'early_access', 'add_to_cart'].includes(mode)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid mode. Must be waitlist, early_access, or add_to_cart.'
                    });
                }

                // Check if chapter is created
                if (!chapter.created) {
                    return res.status(400).json({
                        success: false,
                        error: `Chapter ${chapterId} must be marked as "Created" before setting its mode.`
                    });
                }

                // Check if this is the active chapter (most recent created)
                const currentActiveChapterId = db.getActiveChapterId(chapters);
                if (chapterId !== currentActiveChapterId) {
                    return res.status(400).json({
                        success: false,
                        error: `Only the active chapter (${currentActiveChapterId}) can have its mode changed. Previous chapters are locked to "add_to_cart".`
                    });
                }

                chapter.mode = mode;
                chapter.updatedAt = new Date().toISOString();

                // Log admin action
                req.user = adminCheck.user;
                await securityLog.logAdminAction(req, 'CHANGE_CHAPTER_MODE', {
                    chapterId: chapterId,
                    previousMode: previousMode,
                    newMode: mode
                });

                console.log(`✅ Chapter ${chapterId} mode updated to: ${mode}`);
            }

            // Save updated chapters
            await db.saveChapters(chapters);

            // Get updated active chapter info
            const updatedActiveChapterId = db.getActiveChapterId(chapters);
            const updatedActiveChapter = chapters.find(ch => ch.id === updatedActiveChapterId);

            return res.status(200).json({
                success: true,
                message: `Chapter ${chapterId} updated successfully`,
                chapters: chapters,
                activeChapterId: updatedActiveChapterId,
                activeChapterMode: updatedActiveChapter ? updatedActiveChapter.mode : 'add_to_cart'
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        // SECURITY: Don't expose error details to users
        errorHandler.sendSecureError(res, error, 500, 'Failed to process request. Please try again.', 'CHAPTERS_ERROR');
    }
};

