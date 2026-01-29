/* ========================================
   Sandro Sandri - Chapter Mode API
   Manages Chapter Mode System (I-X with modes per chapter)
   ======================================== */

const db = require('../../lib/storage');
const auth = require('../../lib/auth');
const securityLog = require('../../lib/security-log');
const cors = require('../../lib/cors');
const errorHandler = require('../../lib/error-handler');
const inventoryService = require('../../lib/inventory');

module.exports = async (req, res) => {
    // Set secure CORS headers
    cors.setCORSHeaders(res, req, ['GET', 'POST', 'PUT', 'OPTIONS']);
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        await db.initDb();

        if (req.method === 'GET') {
            // Get current chapter mode state (public read)
            const chapterMode = await db.getChapterMode();
            
            // Calculate active chapter (most recent with created=true)
            const activeChapter = calculateActiveChapter(chapterMode);
            
            return res.status(200).json({
                success: true,
                chapters: chapterMode.chapters || {},
                activeChapterId: activeChapter,
                activeChapterMode: activeChapter ? (chapterMode.chapters[activeChapter]?.mode || 'add_to_cart') : null,
                updatedAt: chapterMode.updatedAt
            });
        }

        if (req.method === 'POST' || req.method === 'PUT') {
            // Update chapter mode (owner only)
            const adminCheck = auth.requireAdmin(req);
            if (!adminCheck.authorized) {
                await securityLog.logUnauthorizedAccess(req, '/api/chapter-mode', adminCheck.error);
                return res.status(adminCheck.statusCode).json({
                    success: false,
                    error: adminCheck.error || 'Unauthorized. Only the owner can change chapter modes.'
                });
            }

            const { chapterId, mode, created } = req.body;

            if (!chapterId) {
                return res.status(400).json({
                    success: false,
                    error: 'chapterId is required'
                });
            }

            // Validate chapter ID (chapter-1 to chapter-10)
            if (!/^chapter-(10|[1-9])$/.test(chapterId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid chapterId. Must be chapter-1 through chapter-10'
                });
            }

            // Get current chapter mode state
            const currentChapterMode = await db.getChapterMode();
            const chapters = currentChapterMode.chapters || {};

            // Initialize chapter if doesn't exist
            if (!chapters[chapterId]) {
                chapters[chapterId] = {
                    id: chapterId,
                    name: getChapterName(chapterId),
                    mode: 'add_to_cart',
                    created: false
                };
            }

            // Update mode if provided
            if (mode !== undefined) {
                if (!['waitlist', 'early_access', 'add_to_cart'].includes(mode)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid mode. Must be waitlist, early_access, or add_to_cart'
                    });
                }

                // Only allow mode change if chapter is created and is the active chapter
                const activeChapter = calculateActiveChapter(currentChapterMode);
                if (chapters[chapterId].created && chapterId === activeChapter) {
                    const previousMode = chapters[chapterId].mode;
                    chapters[chapterId].mode = mode;
                    
                    // Log admin action
                    req.user = adminCheck.user;
                    await securityLog.logAdminAction(req, 'CHANGE_CHAPTER_MODE', {
                        chapterId: chapterId,
                        previousMode: previousMode,
                        newMode: mode
                    });
                } else if (!chapters[chapterId].created) {
                    return res.status(400).json({
                        success: false,
                        error: 'Cannot change mode. Chapter must be created (Created=Yes) first.'
                    });
                } else {
                    return res.status(400).json({
                        success: false,
                        error: 'Cannot change mode. Only the active chapter (most recent created) can have its mode changed.'
                    });
                }
            }

            // Update created status if provided
            if (created !== undefined) {
                const wasCreated = chapters[chapterId].created;
                chapters[chapterId].created = created === true || created === 'yes' || created === 'Yes';

                if (chapters[chapterId].created && !wasCreated) {
                    // Chapter just became created - set it as active and lock previous chapters
                    const activeChapter = calculateActiveChapter({ chapters });
                    
                    // Lock all previous created chapters to add_to_cart
                    Object.keys(chapters).forEach(cId => {
                        if (chapters[cId].created && cId !== chapterId) {
                            // Check if this chapter is older (lower number) than the new active one
                            const cNum = parseInt(cId.replace('chapter-', ''));
                            const newNum = parseInt(chapterId.replace('chapter-', ''));
                            if (cNum < newNum) {
                                chapters[cId].mode = 'add_to_cart';
                                chapters[cId].locked = true; // Mark as locked
                            }
                        }
                    });

                    // Set default mode for new active chapter if not set
                    if (!chapters[chapterId].mode) {
                        chapters[chapterId].mode = 'add_to_cart';
                    }

                    // Initialize inventory for this chapter
                    try {
                        const models = inventoryService.getModelsForChapter(chapterId);
                        if (models.length > 0) {
                            const initialized = await inventoryService.initChapterInventoryIfNeeded(chapterId, models);
                            if (initialized) {
                                console.log(`✅ Inventory initialized for ${chapterId} with ${models.length} models`);
                            }
                        }
                    } catch (error) {
                        console.error(`❌ Error initializing inventory for ${chapterId}:`, error);
                        // Don't fail the chapter creation if inventory init fails
                    }

                    // Log admin action
                    req.user = adminCheck.user;
                    await securityLog.logAdminAction(req, 'CREATE_CHAPTER', {
                        chapterId: chapterId,
                        chapterName: getChapterName(chapterId)
                    });
                }
            }

            // Save updated chapter mode
            await db.saveChapterMode({ chapters, updatedAt: new Date().toISOString() });

            // Calculate new active chapter
            const newActiveChapter = calculateActiveChapter({ chapters });

            return res.status(200).json({
                success: true,
                message: `Chapter ${getChapterName(chapterId)} updated successfully`,
                chapters: chapters,
                activeChapterId: newActiveChapter,
                activeChapterMode: newActiveChapter ? chapters[newActiveChapter]?.mode : null
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        errorHandler.sendSecureError(res, error, 500, 'Failed to process request. Please try again.', 'CHAPTER_MODE_ERROR');
    }
};

// Helper: Calculate active chapter (most recent with created=true)
function calculateActiveChapter(chapterMode) {
    const chapters = chapterMode.chapters || {};
    const createdChapters = Object.keys(chapters)
        .filter(id => chapters[id].created)
        .map(id => ({
            id,
            number: parseInt(id.replace('chapter-', ''))
        }))
        .sort((a, b) => b.number - a.number); // Sort descending (newest first)
    
    return createdChapters.length > 0 ? createdChapters[0].id : null;
}

// Helper: Get chapter name from ID
function getChapterName(chapterId) {
    const num = chapterId.replace('chapter-', '');
    const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    return `Chapter ${roman[parseInt(num) - 1] || num}`;
}

