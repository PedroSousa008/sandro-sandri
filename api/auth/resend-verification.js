/* ========================================
   Sandro Sandri - Resend Verification Email API
   Resends verification email with rate limiting
   ======================================== */

const db = require('../../lib/storage');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const emailService = require('../../lib/email');
const cors = require('../../lib/cors');

module.exports = async (req, res) => {
    // Set secure CORS headers (restricted to allowed origins)
    cors.setCORSHeaders(res, req, ['POST', 'OPTIONS']);

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
            console.log('📧 About to call sendVerificationEmail...');
            console.log('   Email:', email);
            console.log('   Token length:', rawToken ? rawToken.length : 0);
            const result = await emailService.sendVerificationEmail(email, rawToken);
            console.log('✅ Verification email resent successfully to:', email);
            console.log('   Result:', JSON.stringify(result, null, 2));
        } catch (emailError) {
            console.error('❌ Error sending verification email:');
            console.error('   Error type:', emailError?.constructor?.name || typeof emailError);
            console.error('   Error code:', emailError?.code || 'no code');
            console.error('   Error name:', emailError?.name || 'no name');
            console.error('   Error message:', emailError?.message || 'No message');
            console.error('   Error stack:', emailError?.stack || 'No stack');
            
            // Log all properties of the error
            if (emailError) {
                console.error('   Error properties:', Object.getOwnPropertyNames(emailError));
                console.error('   Error keys:', Object.keys(emailError));
            }
            
            // Try to stringify the error properly
            let errorString = 'Unknown error';
            try {
                errorString = JSON.stringify(emailError, Object.getOwnPropertyNames(emailError), 2);
            } catch (e) {
                try {
                    errorString = JSON.stringify(emailError);
                } catch (e2) {
                    errorString = String(emailError);
                }
            }
            console.error('   Stringified error:', errorString);
            
            // Also log as plain object
            console.error('   Error as object:', {
                name: emailError?.name,
                message: emailError?.message,
                code: emailError?.code,
                stack: emailError?.stack?.substring(0, 500) // First 500 chars of stack
            });
            
            // Provide user-friendly error message
            let errorMessage = 'Failed to send verification email.';
            
            // Check if it's a configuration issue
            const errorMsg = emailError?.message || String(emailError) || '';
            const errorCode = emailError?.code || '';
            
            console.log('   Error code:', errorCode);
            console.log('   Error message contains RESEND_API_KEY:', errorMsg.includes('RESEND_API_KEY'));
            console.log('   Error message contains not configured:', errorMsg.includes('not configured'));
            
            if (errorCode === 'MISSING_API_KEY' || errorMsg.includes('RESEND_API_KEY is missing') || errorMsg.includes('not configured')) {
                errorMessage = 'Email service is not configured. Please add RESEND_API_KEY to Vercel environment variables and redeploy.';
            } else if (errorMsg && !errorMsg.includes('RESEND_FROM_EMAIL')) {
                errorMessage = errorMsg;
            }
            
            return res.status(500).json({
                error: errorMessage,
                message: 'Please try again later or contact support if the issue persists.',
                details: process.env.NODE_ENV === 'development' ? errorMsg : undefined
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

