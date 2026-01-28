/* ========================================
   Sandro Sandri - Auth API (Combined)
   Handles login, signup, and session verification
   ======================================== */

const db = require('../../lib/storage');
const bcrypt = require('bcryptjs');
const auth = require('../../lib/auth');
const crypto = require('crypto');
const emailService = require('../../lib/email');
const rateLimit = require('../../lib/rate-limit');
const validation = require('../../lib/validation');
const securityLog = require('../../lib/security-log');
const cors = require('../../lib/cors');
const errorHandler = require('../../lib/error-handler');

module.exports = async (req, res) => {
    // Wrap entire handler in try-catch to ensure JSON responses
    try {
        // Set secure CORS headers (restricted to allowed origins)
        cors.setCORSHeaders(res, req, ['GET', 'POST', 'OPTIONS']);

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        // Get the action from query parameter or path
        const action = req.query.action || (req.url.includes('/login') ? 'login' : req.url.includes('/signup') ? 'signup' : req.url.includes('/session') ? 'session' : null);

        try {
        // SESSION VERIFICATION (GET)
        if (req.method === 'GET' || action === 'session') {
            try {
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
            } catch (authError) {
                console.error('Error in session verification:', authError);
                return res.status(500).json({
                    success: false,
                    authenticated: false,
                    error: 'Session verification failed'
                });
            }
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

            try {
                await db.initDb();
            } catch (dbError) {
                console.error('Error initializing database:', dbError);
                return res.status(500).json({
                    error: 'Database initialization failed'
                });
            }

            // Check if this is owner account first
            let isOwner = false;
            let user = null;
            
            if (email === auth.OWNER_EMAIL.toLowerCase()) {
                isOwner = true;
                console.log('🔐 Owner login attempt detected');
                console.log('   Email:', email);
                console.log('   Security Answer provided:', securityAnswer ? 'Yes' : 'No');
                // Verify owner credentials (including security answer)
                const ownerCheck = await auth.verifyOwnerCredentials(email, password, securityAnswer);
                console.log('   Owner check result:', ownerCheck.valid ? 'Valid' : 'Invalid', ownerCheck.error || '');
                if (!ownerCheck.valid) {
                    // SECURITY: Record failed login attempt and log (don't let logging errors break the flow)
                    try {
                        await rateLimit.recordFailedAttempt(req, 'login', email);
                    } catch (e) {
                        console.error('Error recording failed attempt:', e);
                    }
                    try {
                        await securityLog.logFailedLogin(req, email, ownerCheck.error || 'Invalid owner credentials');
                    } catch (e) {
                        console.error('Error logging failed login:', e);
                    }
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
                    // SECURITY: Record failed login attempt and log
                    await rateLimit.recordFailedAttempt(req, 'login', email);
                    await securityLog.logFailedLogin(req, email, 'User not found');
                    return res.status(401).json({ 
                        error: 'Invalid email or password' 
                    });
                }

                // Verify password - SECURITY: Only use hashed passwords
                const passwordHash = user.passwordHash;
                if (!passwordHash) {
                    // SECURITY: Record failed login attempt and log (don't let logging errors break the flow)
                    try {
                        await rateLimit.recordFailedAttempt(req, 'login', email);
                    } catch (e) {
                        console.error('Error recording failed attempt:', e);
                    }
                    try {
                        await securityLog.logFailedLogin(req, email, 'Account has no password hash');
                    } catch (e) {
                        console.error('Error logging failed login:', e);
                    }
                    return res.status(401).json({ 
                        error: 'Account needs password reset. Please contact support.' 
                    });
                }
                
                // Verify hashed password
                const isValid = await bcrypt.compare(password, passwordHash);
                if (!isValid) {
                    // SECURITY: Record failed login attempt and log (don't let logging errors break the flow)
                    try {
                        await rateLimit.recordFailedAttempt(req, 'login', email);
                    } catch (e) {
                        console.error('Error recording failed attempt:', e);
                    }
                    try {
                        await securityLog.logFailedLogin(req, email, 'Invalid password');
                    } catch (e) {
                        console.error('Error logging failed login:', e);
                    }
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

            // SECURITY: Clear rate limit on successful login (don't let errors break the flow)
            try {
                await rateLimit.clearRateLimit(req, 'login', email);
            } catch (e) {
                console.error('Error clearing rate limit:', e);
            }
            
            // SECURITY: Log successful login (don't let errors break the flow)
            try {
                await securityLog.logSuccessfulLogin(req, userKey, isOwner);
            } catch (e) {
                console.error('Error logging successful login:', e);
            }

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
            const { email: rawEmail, password: rawPassword } = req.body;

            // SECURITY: Validate and sanitize inputs
            if (!rawEmail || !rawPassword) {
                try {
                    await securityLog.logSignupAttempt(req, rawEmail || 'unknown', false);
                } catch (e) {
                    console.error('Error logging signup attempt:', e);
                }
                return res.status(400).json({ 
                    error: 'Email and password are required' 
                });
            }

            // Validate email
            const emailValidation = validation.validateEmail(rawEmail);
            if (!emailValidation.valid) {
                try {
                    await securityLog.logSignupAttempt(req, rawEmail, false);
                } catch (e) {
                    console.error('Error logging signup attempt:', e);
                }
                return res.status(400).json({ 
                    error: emailValidation.error 
                });
            }
            const normalizedEmail = emailValidation.sanitized;

            // Validate password
            const passwordValidation = validation.validatePassword(rawPassword);
            if (!passwordValidation.valid) {
                try {
                    await securityLog.logSignupAttempt(req, normalizedEmail, false);
                } catch (e) {
                    console.error('Error logging signup attempt:', e);
                }
                return res.status(400).json({ 
                    error: passwordValidation.error 
                });
            }
            const password = rawPassword; // Password is validated but not sanitized (will be hashed)

            // SECURITY: Rate limiting for signup attempts
            let rateLimitCheck;
            try {
                rateLimitCheck = await rateLimit.checkRateLimit(req, 'signup', normalizedEmail);
            } catch (e) {
                console.error('Error checking rate limit:', e);
                // If rate limit check fails, allow the request (fail open)
                rateLimitCheck = { allowed: true };
            }
            if (!rateLimitCheck.allowed) {
                try {
                    await securityLog.logRateLimitExceeded(req, 'signup', normalizedEmail);
                } catch (e) {
                    console.error('Error logging rate limit exceeded:', e);
                }
                return res.status(429).json({
                    error: rateLimitCheck.error || 'Too many signup attempts. Please try again later.'
                });
            }

            await db.initDb();
            
            // Check if user already exists
            const userData = await db.getUserData();
            const existingUser = userData[normalizedEmail];

            // If user exists and is already verified, return error
            if (existingUser && existingUser.email_verified === true) {
                try {
                    await securityLog.logSignupAttempt(req, normalizedEmail, false);
                } catch (e) {
                    console.error('Error logging signup attempt:', e);
                }
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
                email: normalizedEmail,
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
        // SECURITY: Don't expose error details to users
        console.error('Auth API Error:', error);
        // Ensure we always return JSON, even on error
        if (!res.headersSent) {
            errorHandler.sendSecureError(res, error, 500, 'Authentication failed. Please try again.', 'AUTH_ERROR');
        }
    }
};

