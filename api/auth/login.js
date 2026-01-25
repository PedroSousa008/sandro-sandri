/* ========================================
   Sandro Sandri - Login API
   Authenticates user and checks email verification
   ======================================== */

const db = require('../../lib/storage');
const bcrypt = require('bcryptjs');
const auth = require('../../lib/auth');

module.exports = async (req, res) => {
    // Log incoming request for debugging
    console.log('🔍 Login API called:', {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body ? 'present' : 'missing'
    });

    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        console.log('✅ CORS preflight request handled');
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        let { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Email and password are required' 
            });
        }

        // Normalize email (lowercase, trim) to match signup
        email = email.toLowerCase().trim();
        const securityAnswer = req.body.securityAnswer;

        await db.initDb();

        // Check if this is owner account first
        let isOwner = false;
        let user = null;
        
        if (email === auth.OWNER_EMAIL.toLowerCase()) {
            isOwner = true;
            // Verify owner credentials (including security answer)
            const ownerCheck = await auth.verifyOwnerCredentials(email, password, securityAnswer);
            if (!ownerCheck.valid) {
                return res.status(401).json({ 
                    error: ownerCheck.error || 'Invalid credentials' 
                });
            }
            
            // Get owner user data
            const userData = await db.getUserData();
            user = userData[email] || userData[auth.OWNER_EMAIL];
        } else {
            // Regular user - get user data and verify password
            const userData = await db.getUserData();
            // Check both normalized and original email (for migration)
            user = userData[email] || userData[email.toLowerCase()] || userData[email.toUpperCase()];

            if (!user) {
                return res.status(401).json({ 
                    error: 'Invalid email or password' 
                });
            }

            // Email verification check temporarily disabled until domain is set up
            // TODO: Re-enable email verification check once domain is verified in Resend
            // if (user.hasOwnProperty('email_verified') && user.email_verified !== true) {
            //     return res.status(403).json({ 
            //         error: 'Please verify your email before logging in',
            //         emailNotVerified: true,
            //         email: email
            //     });
            // }

            // Verify password - SECURITY: Only use hashed passwords
            const passwordHash = user.passwordHash;
            if (!passwordHash) {
                // Legacy user without hashed password - cannot login
                return res.status(401).json({ 
                    error: 'Account needs password reset. Please contact support.' 
                });
            }
            
            // Verify hashed password
            const isValid = await bcrypt.compare(password, passwordHash);
            if (!isValid) {
                return res.status(401).json({ 
                    error: 'Invalid email or password' 
                });
            }
        }

        // Find the actual key in userData (might be different case)
        const userData = await db.getUserData();
        let userKey = email;
        for (const key in userData) {
            if (key.toLowerCase() === email.toLowerCase()) {
                userKey = key;
                break;
            }
        }
        
        // Update last login (DO NOT store plaintext password)
        if (userData[userKey]) {
            userData[userKey] = {
                ...userData[userKey],
                lastLogin: new Date().toISOString()
            };
            await db.saveUserData(userData);
        }

        // Generate JWT token
        const token = auth.generateToken({
            email: userKey,
            role: isOwner ? 'OWNER' : 'USER'
        });

        // Set HTTP-only cookie (more secure than localStorage)
        res.setHeader('Set-Cookie', `session_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${24 * 60 * 60}`);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            email: userKey,
            role: isOwner ? 'OWNER' : 'USER',
            token: token // Also return token for client-side storage (if needed)
        });

    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({
            error: 'Failed to login',
            message: error.message
        });
    }
};

