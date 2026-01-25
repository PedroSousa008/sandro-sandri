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

        // Normalize email for consistency
        const normalizedEmail = email.toLowerCase().trim();
        
        // Check if user already exists
        console.log('📖 Loading user data...');
        const userData = await db.getUserData();
        console.log('✅ User data loaded, total users:', Object.keys(userData).length);
        // Check both normalized and original email (for migration)
        const existingUser = userData[normalizedEmail] || userData[email];

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
            // Remove old tokens for this email (case-insensitive)
            let deletedCount = 0;
            Object.keys(tokens).forEach(key => {
                const tokenEmail = tokens[key].email ? tokens[key].email.toLowerCase().trim() : null;
                if (tokenEmail === normalizedEmail) {
                    delete tokens[key];
                    deletedCount++;
                }
            });
            console.log(`   Deleted ${deletedCount} old token(s) for this email`);
        }

        // Store new token
        const tokenId = `token_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
        tokens[tokenId] = {
            email: normalizedEmail, // Use normalized email
            tokenHash: tokenHash,
            expiresAt: expiresAt.toISOString(),
            createdAt: new Date().toISOString(),
            usedAt: null
        };

        console.log('💾 Saving verification token:');
        console.log('   Token ID:', tokenId);
        console.log('   Email:', email.toLowerCase().trim());
        console.log('   Expires at:', expiresAt.toISOString());
        console.log('   Total tokens before save:', Object.keys(tokens).length);
        
        await db.saveEmailVerificationTokens(tokens);
        
        // Verify token was saved
        const verifyTokens = await db.getEmailVerificationTokens();
        console.log('   Total tokens after save:', Object.keys(verifyTokens).length);
        console.log('   Token saved successfully:', !!verifyTokens[tokenId]);

        // Create or update user (with email_verified = true for now, until domain is set up)
        // TODO: Set email_verified: false and send verification email once domain is verified in Resend
        // Use normalized email as key
        // SECURITY: DO NOT store plaintext password - only hash
        userData[normalizedEmail] = {
            ...(existingUser || {}),
            email: email,
            passwordHash: passwordHash, // ONLY store hashed password
            email_verified: true, // Temporarily set to true - will require verification once domain is set up
            email_verified_at: new Date().toISOString(), // Set verification timestamp
            cart: existingUser?.cart || [],
            profile: existingUser?.profile || null,
            favorites: existingUser?.favorites || [],
            orders: existingUser?.orders || [],
            createdAt: existingUser?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await db.saveUserData(userData);

        // Skip sending verification email for now (until domain is set up)
        // TODO: Re-enable email verification once domain is verified in Resend
        console.log('📧 Email verification skipped - account automatically verified');
        console.log('   Note: Email verification will be required once domain is set up in Resend');

        res.status(201).json({
            success: true,
            message: 'Account created successfully. You can now login.',
            email: normalizedEmail,
            emailSent: false, // No email sent for now
            emailError: null
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

