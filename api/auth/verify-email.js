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
        let { email, token } = req.method === 'GET' ? req.query : req.body;
        
        // Normalize email (lowercase, trim)
        if (email) {
            email = email.toLowerCase().trim();
        }
        
        // Decode token if it's URL encoded
        if (token) {
            try {
                token = decodeURIComponent(token);
            } catch (e) {
                // Token might not be encoded, that's okay
                console.log('   Token decoding note: token may not be URL encoded');
            }
        }
        
        console.log('📧 Verification request:');
        console.log('   Email (normalized):', email);
        console.log('   Token length:', token ? token.length : 0);
        console.log('   Token first 10 chars:', token ? token.substring(0, 10) : 'N/A');
        console.log('   Token last 10 chars:', token && token.length > 10 ? token.substring(token.length - 10) : 'N/A');

        if (!email || !token) {
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
        // Check both normalized and original email (for migration)
        const user = userData[email] || userData[email.toLowerCase()] || userData[email.toUpperCase()];
        console.log('   User exists:', !!user);
        console.log('   Checked emails:', [email, email.toLowerCase(), email.toUpperCase()]);

        if (!user) {
            console.error('❌ User not found:', email);
            return res.status(404).json({ 
                error: 'User not found' 
            });
        }

        // Check if already verified
        if (user.email_verified === true) {
            console.log('✅ Email already verified');
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
        let tokensForEmail = 0;

        for (const [id, tokenData] of Object.entries(tokens)) {
            // Normalize stored email for comparison
            const storedEmail = tokenData.email ? tokenData.email.toLowerCase().trim() : null;
            if (storedEmail === email) {
                tokensForEmail++;
                console.log(`   Token ${id}:`, {
                    email: tokenData.email,
                    usedAt: tokenData.usedAt,
                    expiresAt: tokenData.expiresAt,
                    createdAt: tokenData.createdAt
                });
                
                if (!tokenData.usedAt) {
                    // Check expiration
                    const expiresAt = new Date(tokenData.expiresAt);
                    const isExpired = expiresAt <= now;
                    console.log(`   Token ${id} expiration check:`, {
                        expiresAt: expiresAt.toISOString(),
                        now: now.toISOString(),
                        isExpired: isExpired,
                        timeUntilExpiry: isExpired ? 'EXPIRED' : `${Math.round((expiresAt - now) / (1000 * 60))} minutes`
                    });
                    
                    if (!isExpired) {
                        // Verify token hash
                        console.log(`   Verifying token hash for ${id}...`);
                        const isValid = await bcrypt.compare(token, tokenData.tokenHash);
                        console.log(`   Token ${id} hash match:`, isValid);
                        if (isValid) {
                            tokenFound = tokenData;
                            tokenId = id;
                            console.log('✅ Valid token found!');
                            break;
                        }
                    } else {
                        console.log(`   Token ${id} is expired`);
                    }
                } else {
                    console.log(`   Token ${id} already used at:`, tokenData.usedAt);
                }
            }
        }

        console.log(`   Total tokens for email ${email}:`, tokensForEmail);

        if (!tokenFound) {
            console.error('❌ No valid token found');
            console.error('   Possible reasons:');
            console.error('   - Token expired');
            console.error('   - Token already used');
            console.error('   - Token hash mismatch');
            console.error('   - No tokens exist for this email');
            return res.status(400).json({ 
                error: 'Invalid or expired verification token. Please request a new verification email.' 
            });
        }

        // Mark token as used
        tokens[tokenId].usedAt = new Date().toISOString();
        await db.saveEmailVerificationTokens(tokens);

        // Update user as verified
        // Find the actual key in userData (might be different case)
        let userKey = email;
        for (const key in userData) {
            if (key.toLowerCase() === email.toLowerCase()) {
                userKey = key;
                break;
            }
        }
        
        userData[userKey] = {
            ...user,
            email_verified: true,
            email_verified_at: new Date().toISOString()
        };

        await db.saveUserData(userData);
        console.log('   User key used:', userKey);

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

