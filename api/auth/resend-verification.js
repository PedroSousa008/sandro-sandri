/* ========================================
   Sandro Sandri - Resend Verification Email API
   Resends verification email with rate limiting
   ======================================== */

const db = require('../../lib/storage');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const emailService = require('../../lib/email');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ 
                error: 'Email is required' 
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
            return res.status(400).json({ 
                error: 'Email is already verified' 
            });
        }

        // Rate limiting removed - users can request verification emails anytime
        // (Rate limiting was previously set to 1 hour, but removed per user request)

        // Get verification tokens
        const tokens = await db.getEmailVerificationTokens();

        // Invalidate old tokens for this email
        Object.keys(tokens).forEach(key => {
            if (tokens[key].email === email) {
                delete tokens[key];
            }
        });

        // Generate new verification token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = await bcrypt.hash(rawToken, 10);

        // Set expiration (24 hours from now)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // Store new token
        const tokenId = `token_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
        tokens[tokenId] = {
            email: email,
            tokenHash: tokenHash,
            expiresAt: expiresAt.toISOString(),
            createdAt: new Date().toISOString(),
            usedAt: null
        };

        await db.saveEmailVerificationTokens(tokens);

        // Update last resend timestamp
        userData[email] = {
            ...user,
            lastVerificationEmailSent: new Date().toISOString()
        };
        await db.saveUserData(userData);

        // Send verification email
        try {
            await emailService.sendVerificationEmail(email, rawToken);
            console.log('✅ Verification email resent successfully to:', email);
        } catch (emailError) {
            console.error('❌ Error sending verification email:', emailError);
            console.error('   Full error:', JSON.stringify(emailError, null, 2));
            
            // Provide user-friendly error message (don't mention RESEND_FROM_EMAIL)
            let errorMessage = 'Failed to send verification email. Please try again later.';
            if (emailError.message && !emailError.message.includes('RESEND_FROM_EMAIL')) {
                errorMessage = emailError.message;
            }
            
            return res.status(500).json({
                error: errorMessage,
                message: 'Please check your email service configuration or try again later.'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Verification email sent. Please check your inbox.'
        });

    } catch (error) {
        console.error('Error resending verification email:', error);
        res.status(500).json({
            error: 'Failed to resend verification email',
            message: error.message
        });
    }
};

