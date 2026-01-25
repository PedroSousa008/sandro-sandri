/* ========================================
   Sandro Sandri - Server-Side Authentication
   JWT-based session authentication
   ======================================== */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const OWNER_EMAIL = 'sandrosandri.bysousa@gmail.com';
const OWNER_SECURITY_ANSWER = '10.09.2025';

// Generate JWT secret from environment
// SECURITY: In production, JWT_SECRET MUST be set in Vercel environment variables
// If not set, generate a random one (but this will change on each deployment)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.warn('⚠️ WARNING: JWT_SECRET not set in environment variables!');
    console.warn('⚠️ SECURITY RISK: Set JWT_SECRET in Vercel environment variables immediately!');
}
const JWT_SECRET_FALLBACK = crypto.randomBytes(64).toString('hex');
const JWT_EXPIRES_IN = '24h'; // 24 hours

// Generate JWT token for authenticated user
function generateToken(user) {
    const payload = {
        email: user.email,
        role: user.role || 'USER',
        iat: Math.floor(Date.now() / 1000)
    };
    
    const secret = JWT_SECRET || JWT_SECRET_FALLBACK;
    return jwt.sign(payload, secret, {
        expiresIn: JWT_EXPIRES_IN
    });
}

// Verify JWT token from request
function verifyToken(req) {
    try {
        // Get token from Authorization header or cookie
        const authHeader = req.headers.authorization;
        let token = null;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (req.cookies && req.cookies.session_token) {
            token = req.cookies.session_token;
        } else if (req.headers['x-session-token']) {
            token = req.headers['x-session-token'];
        }
        
        if (!token) {
            return null;
        }
        
        const secret = JWT_SECRET || JWT_SECRET_FALLBACK;
        const decoded = jwt.verify(token, secret);
        return decoded;
    } catch (error) {
        // Token invalid or expired
        return null;
    }
}

// Require authenticated user (any logged-in user)
function requireAuth(req) {
    const decoded = verifyToken(req);
    
    if (!decoded || !decoded.email) {
        return {
            authorized: false,
            error: 'Unauthorized',
            statusCode: 401
        };
    }
    
    return {
        authorized: true,
        user: {
            email: decoded.email,
            role: decoded.role
        }
    };
}

// Require admin (owner only)
function requireAdmin(req) {
    const authResult = requireAuth(req);
    
    if (!authResult.authorized) {
        return authResult;
    }
    
    // Check if user is owner
    if (authResult.user.email.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
        return {
            authorized: false,
            error: 'Forbidden. Admin access required.',
            statusCode: 403
        };
    }
    
    return {
        authorized: true,
        user: authResult.user
    };
}

// Verify owner credentials (for login)
async function verifyOwnerCredentials(email, password, securityAnswer) {
    if (email.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
        return { valid: false, error: 'Invalid credentials' };
    }
    
    // SECURITY: Owner password must be stored hashed in database
    const db = require('./storage');
    const bcrypt = require('bcryptjs');
    await db.initDb();
    const userData = await db.getUserData();
    const ownerUser = userData[OWNER_EMAIL];
    
    if (!ownerUser) {
        return { valid: false, error: 'Owner account not found' };
    }
    
    // Check if password hash exists
    if (!ownerUser.passwordHash) {
        // First-time setup: hash the provided password and store it
        // This allows the owner to set their password on first login
        console.log('🔐 First-time owner login: Creating password hash...');
        const passwordHash = await bcrypt.hash(password, 10);
        ownerUser.passwordHash = passwordHash;
        userData[OWNER_EMAIL] = ownerUser;
        await db.saveUserData(userData);
        console.log('✅ Owner password hash created and saved');
        
        // Now verify the password we just hashed
        const isValid = await bcrypt.compare(password, passwordHash);
        if (!isValid) {
            return { valid: false, error: 'Invalid credentials' };
        }
    } else {
        // Verify password against existing hash
        const isValid = await bcrypt.compare(password, ownerUser.passwordHash);
        if (!isValid) {
            return { valid: false, error: 'Invalid credentials' };
        }
    }
    
    // Verify security answer
    if (securityAnswer !== OWNER_SECURITY_ANSWER) {
        return { valid: false, error: 'Invalid security answer' };
    }
    
    return { valid: true };
}

module.exports = {
    generateToken,
    verifyToken,
    requireAuth,
    requireAdmin,
    verifyOwnerCredentials,
    OWNER_EMAIL,
    OWNER_SECURITY_ANSWER
};

