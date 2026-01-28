/* ========================================
   Sandro Sandri - Site Settings API
   Manages site-wide settings (commerce mode, active chapter)
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

        // Get the setting type from query parameter
        const { setting } = req.query;

        if (req.method === 'GET') {
            // Get current settings
            const settings = await db.getSiteSettings();
            
            if (setting === 'commerce-mode') {
                const mode = settings.commerce_mode || 'LIVE';
                return res.status(200).json({
                    success: true,
                    commerce_mode: mode,
                    updatedAt: settings.updatedAt
                });
            } else if (setting === 'active-chapter') {
                const activeChapter = settings.active_chapter || 'chapter_i';
                return res.status(200).json({
                    success: true,
                    activeChapter: activeChapter
                });
            } else if (setting === 'chapter-modes') {
                const chapterModes = settings.chapter_modes || {};
                return res.status(200).json({
                    success: true,
                    chapter_modes: chapterModes
                });
            } else if (setting === 'chapters') {
                // NEW SYSTEM: Get chapters array with activeChapterId and activeChapterMode
                const chapters = await db.getChapters();
                const activeChapterId = db.getActiveChapterId(chapters);
                const activeChapter = chapters.find(ch => ch.id === activeChapterId);
                const activeChapterMode = activeChapter ? activeChapter.mode : 'add_to_cart';
                
                return res.status(200).json({
                    success: true,
                    chapters: chapters,
                    activeChapterId: activeChapterId,
                    activeChapterMode: activeChapterMode
                });
            } else {
                // Return all settings
                return res.status(200).json({
                    success: true,
                    settings: settings
                });
            }
        }

        if (req.method === 'POST') {
            // Update settings (admin only)
            const adminCheck = auth.requireAdmin(req);
            if (!adminCheck.authorized) {
                await securityLog.logUnauthorizedAccess(req, '/api/site-settings', adminCheck.error);
                return res.status(adminCheck.statusCode).json({
                    success: false,
                    error: adminCheck.error || 'Unauthorized. Only the owner can change settings.'
                });
            }

            const { commerce_mode, active_chapter, chapter, created, mode, chapterId } = req.body;

            // Get current settings
            const currentSettings = await db.getSiteSettings();
            const updatedSettings = { ...currentSettings };

            // Ensure chapter_modes structure exists
            if (!updatedSettings.chapter_modes) {
                updatedSettings.chapter_modes = db.getDefaultChapterModes ? db.getDefaultChapterModes() : {};
            }

            // Update chapter mode (new system)
            if (setting === 'chapter-modes' && chapter) {
                // Get default chapter modes helper
                const getDefaultChapterModes = require('../../lib/storage').getDefaultChapterModes || (() => ({}));
                
                if (!updatedSettings.chapter_modes[chapter]) {
                    const defaults = getDefaultChapterModes();
                    updatedSettings.chapter_modes[chapter] = defaults[chapter] || {
                        created: false,
                        mode: 'LIVE',
                        updatedAt: new Date().toISOString()
                    };
                }

                // Update created status if provided
                if (created !== undefined) {
                    updatedSettings.chapter_modes[chapter].created = created === true;
                    updatedSettings.chapter_modes[chapter].updatedAt = new Date().toISOString();

                    // Log admin action
                    req.user = adminCheck.user;
                    await securityLog.logAdminAction(req, 'CHANGE_CHAPTER_CREATED', {
                        chapter: chapter,
                        created: created
                    });

                    console.log(`✅ Chapter ${chapter} created status: ${created}`);
                }

                // Update mode if provided (only if chapter is created)
                if (mode !== undefined) {
                    if (!['LIVE', 'WAITLIST', 'EARLY_ACCESS'].includes(mode)) {
                        return res.status(400).json({
                            success: false,
                            error: 'Invalid mode. Must be LIVE, WAITLIST, or EARLY_ACCESS.'
                        });
                    }

                    if (!updatedSettings.chapter_modes[chapter].created) {
                        return res.status(400).json({
                            success: false,
                            error: `Chapter ${chapter} must be marked as "Created" before setting its mode.`
                        });
                    }

                    const previousMode = updatedSettings.chapter_modes[chapter].mode || 'LIVE';
                    updatedSettings.chapter_modes[chapter].mode = mode;
                    updatedSettings.chapter_modes[chapter].updatedAt = new Date().toISOString();

                    // Log admin action
                    req.user = adminCheck.user;
                    await securityLog.logAdminAction(req, 'CHANGE_CHAPTER_MODE', {
                        chapter: chapter,
                        previousMode: previousMode,
                        newMode: mode
                    });

                    console.log(`✅ Chapter ${chapter} mode updated to: ${mode}`);

                    // IMPORTANT: Always update global commerce_mode when a chapter mode is changed
                    // This makes the table buttons work exactly like the old "Switch to..." buttons
                    updatedSettings.commerce_mode = mode;
                    updatedSettings.updatedAt = new Date().toISOString();
                    
                    console.log(`✅ Global commerce_mode updated to: ${mode}`);
                }

                // Save updated settings
                await db.saveSiteSettings(updatedSettings);

                return res.status(200).json({
                    success: true,
                    message: `Chapter ${chapter} updated successfully`,
                    chapter_modes: updatedSettings.chapter_modes
                });
            }

            // NEW SYSTEM: Handle chapters array updates (setting === 'chapters')
            if (setting === 'chapters' && chapterId) {
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

            // Update commerce mode if provided (legacy system)
            if (commerce_mode) {
                if (!['LIVE', 'WAITLIST', 'EARLY_ACCESS'].includes(commerce_mode)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid commerce_mode. Must be LIVE, WAITLIST, or EARLY_ACCESS.'
                    });
                }
                const previousMode = currentSettings.commerce_mode || 'LIVE';
                updatedSettings.commerce_mode = commerce_mode;
                updatedSettings.updatedAt = new Date().toISOString();

                // Log admin action
                req.user = adminCheck.user;
                await securityLog.logAdminAction(req, 'CHANGE_COMMERCE_MODE', {
                    previousMode: previousMode,
                    newMode: commerce_mode
                });

                console.log(`✅ Commerce mode updated to: ${commerce_mode}`);
            }

            // Update active chapter if provided
            if (active_chapter) {
                if (!['chapter_i', 'chapter_ii'].includes(active_chapter)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid active_chapter. Must be "chapter_i" or "chapter_ii"'
                    });
                }
                const previousChapter = currentSettings.active_chapter || 'chapter_i';
                updatedSettings.active_chapter = active_chapter;
                updatedSettings.chapter_updatedAt = new Date().toISOString();

                // Log admin action
                req.user = adminCheck.user;
                await securityLog.logAdminAction(req, 'change_active_chapter', {
                    from: previousChapter,
                    to: active_chapter
                });

                console.log(`✅ Active chapter updated to: ${active_chapter}`);
            }

            // Save updated settings
            await db.saveSiteSettings(updatedSettings);

            // Return appropriate response based on what was updated
            if (commerce_mode && active_chapter) {
                return res.status(200).json({
                    success: true,
                    message: `Commerce mode set to ${commerce_mode} and active chapter set to ${active_chapter === 'chapter_i' ? 'Chapter I' : 'Chapter II'}`,
                    commerce_mode: commerce_mode,
                    activeChapter: active_chapter,
                    updatedAt: updatedSettings.updatedAt
                });
            } else if (commerce_mode) {
                return res.status(200).json({
                    success: true,
                    commerce_mode: commerce_mode,
                    message: `Commerce mode set to ${commerce_mode}`,
                    updatedAt: updatedSettings.updatedAt
                });
            } else if (active_chapter) {
                return res.status(200).json({
                    success: true,
                    message: `Active chapter changed to ${active_chapter === 'chapter_i' ? 'Chapter I' : 'Chapter II'}`,
                    activeChapter: active_chapter
                });
            } else {
                return res.status(400).json({
                    success: false,
                    error: 'No valid setting provided. Must include commerce_mode or active_chapter.'
                });
            }
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        // SECURITY: Don't expose error details to users
        errorHandler.sendSecureError(res, error, 500, 'Failed to process request. Please try again.', 'SITE_SETTINGS_ERROR');
    }
};

