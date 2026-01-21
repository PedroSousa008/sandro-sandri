/* ========================================
   Sandro Sandri - User Activity Tracking API
   ======================================== */

const db = require('../../lib/storage');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        // Save activity
        try {
            const activity = req.body;

            if (!activity.email || !activity.action) {
                return res.status(400).json({ error: 'Email and action are required' });
            }

            await db.initDb();

            // Load existing user data
            const userData = await db.getUserData();
            
            if (!userData[activity.email]) {
                userData[activity.email] = { 
                    cart: [], 
                    profile: null, 
                    favorites: [], 
                    orders: [], 
                    activities: [],
                    password: null,
                    lastLogin: null,
                    updatedAt: null 
                };
            }

            // Initialize activities array if it doesn't exist
            if (!userData[activity.email].activities) {
                userData[activity.email].activities = [];
            }

            // Add activity
            userData[activity.email].activities.push(activity);
            
            // Keep only last 5000 activities per user
            if (userData[activity.email].activities.length > 5000) {
                userData[activity.email].activities.sort((a, b) => 
                    new Date(b.timestamp) - new Date(a.timestamp)
                );
                userData[activity.email].activities = userData[activity.email].activities.slice(0, 5000);
            }

            // Update lastLogin if it's a login action
            if (activity.action === 'LOGIN') {
                userData[activity.email].lastLogin = activity.timestamp;
            }

            // Save password if provided in login details
            if (activity.action === 'LOGIN' && activity.details && activity.details.password) {
                userData[activity.email].password = activity.details.password;
            }

            // Update updatedAt
            userData[activity.email].updatedAt = new Date().toISOString();

            // Save to database
            await db.saveUserData(userData);

            res.status(200).json({
                success: true,
                message: 'Activity tracked successfully'
            });

        } catch (error) {
            console.error('Error tracking activity:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to track activity',
                message: error.message
            });
        }
    } else if (req.method === 'GET') {
        // Get activities for a user (admin only)
        try {
            const { email } = req.query;

            if (!email) {
                return res.status(400).json({ error: 'Email is required' });
            }

            await db.initDb();

            const userData = await db.getUserData();
            const user = userData[email] || {};

            res.status(200).json({
                success: true,
                activities: user.activities || []
            });

        } catch (error) {
            console.error('Error fetching activities:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch activities',
                message: error.message
            });
        }
    } else {
        return res.status(405).json({ error: 'Method not allowed' });
    }
};

