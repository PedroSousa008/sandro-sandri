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

    console.log('🔍 Verify email API called:', {
        method: req.method,
        query: req.query,
        body: req.body
    });

    try {
        const { email, token } = req.method === 'GET' ? req.query : req.body;
        
        console.log('📧 Verification request:');
        console.log('   Email:', email);
        console.log('   Token present:', !!token);
        console.log('   Token length:', token ? token.length : 0);

        if (!email || !token) {
            console.error('❌ Missing email or token:', { email: !!email, token: !!token });
            return res.status(400).json({ 
                error: 'Email and token are required' 
            });
        }

        console.log('📦 Initializing database...');
        await db.initDb();
        console.log('✅ Database initialized');

        // Get user data
        console.log('📖 Loading user data...');
        const userData = await db.getUserData();
        const user = userData[email];
        console.log('   User found:', !!user);

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
        console.log('🎫 Loading verification tokens...');
        const tokens = await db.getEmailVerificationTokens();
        console.log('   Total tokens in database:', Object.keys(tokens).length);
        
        const now = new Date();
        console.log('   Current time:', now.toISOString());

        // Find matching token for this email
        let tokenFound = null;
        let tokenId = null;
        let matchingTokens = 0;
        let expiredTokens = 0;
        let usedTokens = 0;

        console.log('🔍 Searching for matching token...');
        for (const [id, tokenData] of Object.entries(tokens)) {
            if (tokenData.email === email) {
                matchingTokens++;
                console.log(`   Found token for email: ${id}`);
                console.log(`     Used: ${!!tokenData.usedAt}`);
                console.log(`     Expires: ${tokenData.expiresAt}`);
                
                if (tokenData.usedAt) {
                    usedTokens++;
                    console.log(`     ❌ Token already used at: ${tokenData.usedAt}`);
                    continue;
                }
                
                // Check expiration
                const expiresAt = new Date(tokenData.expiresAt);
                if (expiresAt <= now) {
                    expiredTokens++;
                    console.log(`     ❌ Token expired (expired ${Math.round((now - expiresAt) / (1000 * 60))} minutes ago)`);
                    continue;
                }
                
                // Verify token hash
                console.log(`     🔐 Verifying token hash...`);
                const isValid = await bcrypt.compare(token, tokenData.tokenHash);
                console.log(`     Token hash valid: ${isValid}`);
                
                if (isValid) {
                    tokenFound = tokenData;
                    tokenId = id;
                    console.log(`     ✅ Token found and valid!`);
                    break;
                } else {
                    console.log(`     ❌ Token hash mismatch`);
                }
            }
        }
        
        console.log('📊 Token search summary:');
        console.log(`   Matching tokens: ${matchingTokens}`);
        console.log(`   Used tokens: ${usedTokens}`);
        console.log(`   Expired tokens: ${expiredTokens}`);
        console.log(`   Valid token found: ${!!tokenFound}`);

        if (!tokenFound) {
            console.error('❌ No valid token found');
            return res.status(400).json({ 
                error: 'Invalid or expired verification token. Please request a new verification email.' 
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

