/* ========================================
   Sandro Sandri - Email Verification API
   Verifies user email using token
   ======================================== */

const db = require('../../lib/storage');
const bcrypt = require('bcryptjs');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, token } = req.method === 'GET' ? req.query : req.body;

        if (!email || !token) {
            return res.status(400).json({ 
                error: 'Email and token are required' 
            });
        }

        await db.initDb();

        // Get user data
        const userData = await db.getUserData();
        const user = userData[email];

        if (!user) {
            return res.status(404).json({ 
                error: 'User not found' 
            });
        }

        // Check if already verified
        if (user.email_verified === true) {
            return res.status(200).json({
                success: true,
                message: 'Email already verified',
                alreadyVerified: true
            });
        }

        // Get verification tokens
        const tokens = await db.getEmailVerificationTokens();
        const now = new Date();

        // Find matching token for this email
        let tokenFound = null;
        let tokenId = null;

        for (const [id, tokenData] of Object.entries(tokens)) {
            if (tokenData.email === email && !tokenData.usedAt) {
                // Check expiration
                const expiresAt = new Date(tokenData.expiresAt);
                if (expiresAt > now) {
                    // Verify token hash
                    const isValid = await bcrypt.compare(token, tokenData.tokenHash);
                    if (isValid) {
                        tokenFound = tokenData;
                        tokenId = id;
                        break;
                    }
                }
            }
        }

        if (!tokenFound) {
            return res.status(400).json({ 
                error: 'Invalid or expired verification token' 
            });
        }

        // Mark token as used
        tokens[tokenId].usedAt = new Date().toISOString();
        await db.saveEmailVerificationTokens(tokens);

        // Update user as verified
        userData[email] = {
            ...user,
            email_verified: true,
            email_verified_at: new Date().toISOString()
        };

        await db.saveUserData(userData);

        console.log('✅ Email verified for:', email);

        res.status(200).json({
            success: true,
            message: 'Email verified successfully. You can now login.',
            email: email
        });

    } catch (error) {
        console.error('Error verifying email:', error);
        res.status(500).json({
            error: 'Failed to verify email',
            message: error.message
        });
    }
};

