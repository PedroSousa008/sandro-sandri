/* ========================================
   Sandro Sandri - Login API
   Authenticates user and checks email verification
   ======================================== */

const db = require('../../lib/storage');
const bcrypt = require('bcryptjs');

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

        await db.initDb();

        // Get user data
        const userData = await db.getUserData();
        // Check both normalized and original email (for migration)
        const user = userData[email] || userData[email.toLowerCase()] || userData[email.toUpperCase()];

        if (!user) {
            return res.status(401).json({ 
                error: 'Invalid email or password' 
            });
        }

        // Check email verification (only for new users)
        // Existing users (without email_verified field) are grandfathered in
        if (user.hasOwnProperty('email_verified') && user.email_verified !== true) {
            return res.status(403).json({ 
                error: 'Please verify your email before logging in',
                emailNotVerified: true,
                email: email
            });
        }

        // Verify password
        const passwordHash = user.passwordHash;
        if (!passwordHash) {
            // Legacy user without hashed password - check plaintext
            // This handles existing accounts that don't need verification
            const storedPassword = user.password;
            if (storedPassword && storedPassword === password) {
                // Migrate to hashed password
                const newHash = await bcrypt.hash(password, 10);
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
                    passwordHash: newHash,
                    password: undefined // Remove plaintext
                };
                await db.saveUserData(userData);
            } else {
                return res.status(401).json({ 
                    error: 'Invalid email or password' 
                });
            }
        } else {
            // Verify hashed password
            const isValid = await bcrypt.compare(password, passwordHash);
            if (!isValid) {
                return res.status(401).json({ 
                    error: 'Invalid email or password' 
                });
            }
        }

        // Update last login
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
            lastLogin: new Date().toISOString()
        };
        await db.saveUserData(userData);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            email: userKey || email // Return the actual email key used
        });

    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({
            error: 'Failed to login',
            message: error.message
        });
    }
};

