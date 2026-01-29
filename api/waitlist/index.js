/* ========================================
   Sandro Sandri - Waitlist API
   Manages waitlist entries (store and retrieve)
   ======================================== */

const db = require('../../lib/storage');
const auth = require('../../lib/auth');
const securityLog = require('../../lib/security-log');
const cors = require('../../lib/cors');
const errorHandler = require('../../lib/error-handler');

module.exports = async (req, res) => {
    // Set secure CORS headers
    cors.setCORSHeaders(res, req, ['GET', 'POST', 'OPTIONS']);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        await db.initDb();

        if (req.method === 'GET') {
            // Get all waitlist entries (owner only)
            const adminCheck = auth.requireAdmin(req);
            if (!adminCheck.authorized) {
                await securityLog.logUnauthorizedAccess(req, '/api/waitlist', adminCheck.error);
                return res.status(adminCheck.statusCode).json({
                    success: false,
                    error: adminCheck.error || 'Unauthorized. Only the owner can view waitlist entries.'
                });
            }

            const entries = await db.getWaitlistEntries();
            
            // Sort by most recent first
            entries.sort((a, b) => {
                const dateA = new Date(a.createdAt || a.timestamp || 0);
                const dateB = new Date(b.createdAt || b.timestamp || 0);
                return dateB - dateA;
            });

            return res.status(200).json({
                success: true,
                entries: entries,
                count: entries.length
            });
        }

        if (req.method === 'POST') {
            // Add new waitlist entry (public - anyone can join waitlist)
            const {
                customer_name,
                customer_email,
                product_id,
                product_name,
                product_sku,
                size,
                color,
                quantity,
                chapter,
                chapter_id,
                chapter_mode,
                page_url,
                user_status
            } = req.body;

            // Validate required fields
            if (!customer_email || !product_id || !product_name) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: customer_email, product_id, product_name'
                });
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(customer_email)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid email address format'
                });
            }

            const entry = {
                customer_name: customer_name || 'Guest',
                customer_email,
                product_id,
                product_name,
                product_sku: product_sku || 'N/A',
                size: size || 'N/A',
                color: color || 'Navy',
                quantity: quantity || 1,
                chapter: chapter || 'Unknown',
                chapter_id: chapter_id || 'chapter-1',
                chapter_mode: chapter_mode || 'waitlist',
                page_url: page_url || 'Unknown',
                user_status: user_status || 'Guest',
                createdAt: new Date().toISOString()
            };

            const savedEntry = await db.addWaitlistEntry(entry);

            return res.status(200).json({
                success: true,
                message: 'Successfully joined the waitlist',
                entry: savedEntry
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        errorHandler.sendSecureError(res, error, 500, 'Failed to process request. Please try again.', 'WAITLIST_ERROR');
    }
};

