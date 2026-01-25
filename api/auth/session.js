/* ========================================
   Sandro Sandri - Session Verification API
   Verifies JWT token and returns user info
   ======================================== */

const auth = require('../../lib/auth');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Token');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const authResult = auth.requireAuth(req);
        
        if (!authResult.authorized) {
            return res.status(authResult.statusCode).json({
                success: false,
                authenticated: false,
                error: authResult.error
            });
        }

        // Return user info (without sensitive data)
        res.status(200).json({
            success: true,
            authenticated: true,
            user: {
                email: authResult.user.email,
                role: authResult.user.role
            }
        });
    } catch (error) {
        console.error('Error verifying session:', error);
        res.status(500).json({
            success: false,
            authenticated: false,
            error: 'Failed to verify session'
        });
    }
};

