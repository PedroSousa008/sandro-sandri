/* ========================================
   Sandro Sandri - User Signup API
   Creates user account with email verification
   ======================================== */

const db = require('../../lib/storage');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
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

    console.log('🔍 Signup API called:', {
        method: req.method,
        url: req.url,
        body: req.body ? { email: req.body.email, password: req.body.password ? '***' : 'missing' } : 'missing'
    });

    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Email and password are required' 
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                error: 'Invalid email format' 
            });
        }

        // Password validation
        if (password.length < 6) {
            return res.status(400).json({ 
                error: 'Password must be at least 6 characters' 
            });
        }

        console.log('📦 Initializing database...');
        await db.initDb();
        console.log('✅ Database initialized');

        // Check if user already exists
        console.log('📖 Loading user data...');
        const userData = await db.getUserData();
        console.log('✅ User data loaded, total users:', Object.keys(userData).length);
        const existingUser = userData[email];

        // If user exists and is already verified, return error
        if (existingUser && existingUser.email_verified === true) {
            return res.status(400).json({ 
                error: 'An account with this email already exists' 
            });
        }

        // Hash password
        console.log('🔐 Hashing password...');
        const passwordHash = await bcrypt.hash(password, 10);
        console.log('✅ Password hashed');

        // Generate verification token
        console.log('🎫 Generating verification token...');
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = await bcrypt.hash(rawToken, 10);
        console.log('✅ Token generated and hashed');

        // Set expiration (24 hours from now)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // Get verification tokens
        const tokens = await db.getEmailVerificationTokens();

        // If user exists but not verified, invalidate old tokens
        if (existingUser && existingUser.email_verified === false) {
            // Remove old tokens for this email
            Object.keys(tokens).forEach(key => {
                if (tokens[key].email === email) {
                    delete tokens[key];
                }
            });
        }

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

        // Create or update user (with email_verified = false)
        userData[email] = {
            ...(existingUser || {}),
            email: email,
            passwordHash: passwordHash,
            email_verified: false,
            email_verified_at: null,
            cart: existingUser?.cart || [],
            profile: existingUser?.profile || null,
            favorites: existingUser?.favorites || [],
            orders: existingUser?.orders || [],
            createdAt: existingUser?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await db.saveUserData(userData);

        // Send verification email
        let emailSent = false;
        let emailError = null;
        try {
            console.log('📧 Attempting to send verification email...');
            await emailService.sendVerificationEmail(email, rawToken);
            emailSent = true;
            console.log('✅ Verification email sent successfully to:', email);
        } catch (err) {
            emailError = err;
            console.error('❌ Error sending verification email:');
            console.error('   Error type:', err.constructor.name);
            console.error('   Error message:', err.message);
            console.error('   Error stack:', err.stack);
            // Still return success but log the error
            // User can request resend if email doesn't arrive
            // This prevents signup from failing if email service has temporary issues
        }

        res.status(201).json({
            success: true,
            message: emailSent 
                ? 'Account created. Please check your email to verify your account.'
                : 'Account created. Verification email may not have been sent. Please use "Resend verification email" if needed.',
            email: email,
            emailSent: emailSent,
            emailError: emailError ? emailError.message : null
        });

    } catch (error) {
        console.error('❌ Error during signup:');
        console.error('   Error type:', error.constructor.name);
        console.error('   Error message:', error.message);
        console.error('   Error stack:', error.stack);
        console.error('   Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        
        res.status(500).json({
            error: 'Failed to create account',
            message: error.message || 'An unexpected error occurred',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

