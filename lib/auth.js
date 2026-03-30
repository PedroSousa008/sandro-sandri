/* ========================================
   Sandro Sandri - Server-Side Authentication
   JWT-based session authentication
   No hardcoded secrets. Production requires env vars.
   ======================================== */

const jwt = require('jsonwebtoken');
const db = require('./storage');
const bcrypt = require('bcryptjs');

const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';

/**
 * Returns env value if set and non-empty. Otherwise:
 * - In production: throws with generic message (no leak).
 * - In development: throws with message naming the missing var.
 */
function requireEnv(name) {
    const v = process.env[name];
    if (v === undefined || v === null || (typeof v === 'string' && !v.trim())) {
        if (isProduction) {
            throw new Error('Configuration error');
        }
        throw new Error(`Missing required env: ${name}. Set in .env for local development.`);
    }
    return typeof v === 'string' ? v.trim() : v;
}

// Fail fast in production: require all auth-related env vars at load time
if (isProduction) {
    requireEnv('OWNER_EMAIL');
    requireEnv('OWNER_PASSWORD');
    requireEnv('OWNER_SECURITY_ANSWER');
    requireEnv('JWT_SECRET');
}

// Owner email: from env only. In dev may be empty if not set.
function getOwnerEmail() {
    const v = process.env.OWNER_EMAIL;
    return (v && typeof v === 'string' && v.trim()) ? v.trim() : '';
}

// Never store secrets in variables; read at use time only
function getOwnerPassword() {
    const v = process.env.OWNER_PASSWORD;
    return (v && typeof v === 'string' && v.trim()) ? v.trim() : null;
}

function getOwnerSecurityAnswer() {
    const v = process.env.OWNER_SECURITY_ANSWER;
    return (v && typeof v === 'string' && v.trim()) ? v.trim() : null;
}

function getJwtSecret() {
    const v = process.env.JWT_SECRET;
    return (v && typeof v === 'string' && v.trim()) ? v.trim() : null;
}

/** Returns true only if all owner auth and JWT env vars are set. */
function isOwnerAuthConfigured() {
    return !!(getOwnerEmail() && getOwnerPassword() && getOwnerSecurityAnswer() && getJwtSecret());
}

const JWT_EXPIRES_IN = '24h';

function generateToken(user) {
    const secret = getJwtSecret();
    if (!secret) {
        if (isProduction) throw new Error('Configuration error');
        throw new Error('JWT_SECRET not set. Set in .env for local development.');
    }
    const payload = {
        email: user.email,
        role: user.role || 'USER',
        iat: Math.floor(Date.now() / 1000)
    };
    return jwt.sign(payload, secret, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(req) {
    const secret = getJwtSecret();
    if (!secret) return null;
    try {
        const authHeader = req.headers.authorization;
        let token = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (req.cookies && req.cookies.session_token) {
            token = req.cookies.session_token;
        } else if (req.headers['x-session-token']) {
            token = req.headers['x-session-token'];
        }
        if (!token) return null;
        return jwt.verify(token, secret);
    } catch (_) {
        return null;
    }
}

function requireAuth(req) {
    const decoded = verifyToken(req);
    if (!decoded || !decoded.email) {
        return { authorized: false, error: 'Unauthorized', statusCode: 401 };
    }
    return {
        authorized: true,
        user: { email: decoded.email, role: decoded.role }
    };
}

function requireAdmin(req) {
    const authResult = requireAuth(req);
    if (!authResult.authorized) return authResult;
    const ownerEmail = getOwnerEmail();
    if (!ownerEmail || authResult.user.email.toLowerCase() !== ownerEmail.toLowerCase()) {
        return { authorized: false, error: 'Forbidden. Admin access required.', statusCode: 403 };
    }
    return { authorized: true, user: authResult.user };
}

async function verifyOwnerCredentials(email, password, securityAnswer) {
    const ownerEmail = getOwnerEmail();
    if (!ownerEmail || email.toLowerCase() !== ownerEmail.toLowerCase()) {
        return { valid: false, error: 'Invalid credentials' };
    }

    if (!isOwnerAuthConfigured()) {
        if (!isProduction) console.warn('Owner auth not configured: missing env vars');
        return { valid: false, error: 'Owner auth not configured' };
    }

    const ownerPassword = getOwnerPassword();
    const expectedSecurityAnswer = getOwnerSecurityAnswer();
    if (!ownerPassword || !expectedSecurityAnswer) {
        return { valid: false, error: 'Owner auth not configured' };
    }

    await db.initDb();
    const userData = await db.getUserData();
    let ownerUser = userData[ownerEmail] || userData[email];

    if (!ownerUser) {
        ownerUser = {
            email: ownerEmail,
            cart: [],
            profile: null,
            favorites: [],
            orders: [],
            createdAt: new Date().toISOString()
        };
    }

    if (!ownerUser.passwordHash) {
        ownerUser.passwordHash = await bcrypt.hash(ownerPassword, 10);
        ownerUser.updatedAt = new Date().toISOString();
        userData[ownerEmail] = ownerUser;
        await db.saveUserData(userData);
        const updated = await db.getUserData();
        ownerUser = updated[ownerEmail] || updated[email] || ownerUser;
    }

    const isValidPassword = await bcrypt.compare(password, ownerUser.passwordHash);
    if (!isValidPassword) {
        return { valid: false, error: 'Invalid credentials' };
    }

    const providedAnswer = (securityAnswer && typeof securityAnswer === 'string') ? securityAnswer.trim() : '';
    if (!providedAnswer || providedAnswer !== expectedSecurityAnswer) {
        return { valid: false, error: 'Invalid security answer' };
    }

    return { valid: true };
}

// Public: for routes that need to know owner email (e.g. admin checks). In production always set; in dev may be ''.
function getOwnerEmailPublic() {
    return getOwnerEmail();
}

module.exports = {
    generateToken,
    verifyToken,
    requireAuth,
    requireAdmin,
    verifyOwnerCredentials,
    isOwnerAuthConfigured,
    getOwnerEmailPublic: getOwnerEmailPublic,
    get OWNER_EMAIL() {
        return getOwnerEmail();
    }
};
