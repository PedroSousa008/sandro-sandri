/* ========================================
   Sandro Sandri - Auth API (Combined)
   Handles login, signup, and session verification
   ======================================== */

const db = require('../../lib/storage');
const bcrypt = require('bcryptjs');
const auth = require('../../lib/auth');
const crypto = require('crypto');
const emailService = require('../../lib/email');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Token');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Get the action from query parameter or path
    const action = req.query.action || (req.url.includes('/login') ? 'login' : req.url.includes('/signup') ? 'signup' : req.url.includes('/session') ? 'session' : null);

    try {
        // SESSION VERIFICATION (GET)
        if (req.method === 'GET' || action === 'session') {
            const authResult = auth.requireAuth(req);
            
            if (!authResult.authorized) {
                return res.status(authResult.statusCode).json({
                    success: false,
                    authenticated: false,
                    error: authResult.error
                });
            }

            res.status(200).json({
                success: true,
                authenticated: true,
                user: {
                    email: authResult.user.email,
                    role: authResult.user.role
                }
            });
            return;
        }

        // LOGIN (POST)
        if (req.method === 'POST' && (action === 'login' || !action)) {
            let { email, password, securityAnswer } = req.body;

            if (!email || !password) {
                return res.status(400).json({ 
                    error: 'Email and password are required' 
                });
            }

            // Normalize email (lowercase, trim) to match signup
            email = email.toLowerCase().trim();

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
                user = userData[email] || userData[email.toLowerCase()] || userData[email.toUpperCase()];

                if (!user) {
                    return res.status(401).json({ 
                        error: 'Invalid email or password' 
                    });
                }

                // Verify password - SECURITY: Only use hashed passwords
                const passwordHash = user.passwordHash;
                if (!passwordHash) {
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
                token: token
            });
            return;
        }

        // SIGNUP (POST with action=signup)
        if (req.method === 'POST' && action === 'signup') {
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

            await db.initDb();

            // Normalize email for consistency
            const normalizedEmail = email.toLowerCase().trim();
            
            // Check if user already exists
            const userData = await db.getUserData();
            const existingUser = userData[normalizedEmail] || userData[email];

            // If user exists and is already verified, return error
            if (existingUser && existingUser.email_verified === true) {
                return res.status(400).json({ 
                    error: 'An account with this email already exists' 
                });
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, 10);

            // Generate verification token
            const rawToken = crypto.randomBytes(32).toString('hex');
            const tokenHash = await bcrypt.hash(rawToken, 10);

            // Set expiration (24 hours from now)
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);

            // Get verification tokens
            const tokens = await db.getEmailVerificationTokens();
            
            // If user exists but not verified, invalidate old tokens
            if (existingUser && existingUser.email_verified === false) {
                Object.keys(tokens).forEach(key => {
                    const tokenEmail = tokens[key].email ? tokens[key].email.toLowerCase().trim() : null;
                    if (tokenEmail === normalizedEmail) {
                        delete tokens[key];
                    }
                });
            }

            // Store new token
            const tokenId = `token_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
            tokens[tokenId] = {
                email: normalizedEmail,
                tokenHash: tokenHash,
                expiresAt: expiresAt.toISOString(),
                createdAt: new Date().toISOString(),
                usedAt: null
            };
            
            await db.saveEmailVerificationTokens(tokens);
            
            // Create or update user (SECURITY: DO NOT store plaintext password)
            userData[normalizedEmail] = {
                ...(existingUser || {}),
                email: email,
                passwordHash: passwordHash, // ONLY store hashed password
                email_verified: true, // Temporarily set to true
                email_verified_at: new Date().toISOString(),
                cart: existingUser?.cart || [],
                profile: existingUser?.profile || null,
                favorites: existingUser?.favorites || [],
                orders: existingUser?.orders || [],
                createdAt: existingUser?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await db.saveUserData(userData);

            res.status(201).json({
                success: true,
                message: 'Account created successfully. You can now login.',
                email: normalizedEmail,
                emailSent: false,
                emailError: null
            });
            return;
        }

        // Unknown action
        return res.status(400).json({ error: 'Invalid action' });

    } catch (error) {
        console.error('Error in auth API:', error);
        res.status(500).json({
            error: 'Failed to process request',
            message: error.message
        });
    }
};

