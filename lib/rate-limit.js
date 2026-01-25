/* ========================================
   Sandro Sandri - Rate Limiting
   Prevents brute force attacks and API abuse
   ======================================== */

const db = require('./storage');

// Rate limit configuration
const RATE_LIMITS = {
    login: {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000, // 15 minutes
        blockDurationMs: 30 * 60 * 1000 // 30 minutes block after max attempts
    },
    signup: {
        maxAttempts: 3,
        windowMs: 60 * 60 * 1000, // 1 hour
        blockDurationMs: 60 * 60 * 1000 // 1 hour block
    },
    waitlist: {
        maxAttempts: 10,
        windowMs: 60 * 60 * 1000, // 1 hour
        blockDurationMs: 0 // No block, just rate limit
    }
};

// Get client identifier (IP address or email)
function getClientId(req, identifier = null) {
    // Use email if provided (for login/signup), otherwise use IP
    if (identifier) {
        return `rate_limit:${identifier}`;
    }
    
    // Get IP address from request
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.headers['x-real-ip'] || 'unknown';
    return `rate_limit:ip:${ip}`;
}

// Check rate limit
async function checkRateLimit(req, type, identifier = null) {
    const config = RATE_LIMITS[type];
    if (!config) {
        return { allowed: true };
    }

    await db.initDb();
    
    const clientId = getClientId(req, identifier);
    const now = Date.now();
    
    // Get rate limit data from storage
    let rateLimitData = await db.getRateLimitData();
    if (!rateLimitData) {
        rateLimitData = {};
    }
    
    const clientData = rateLimitData[clientId] || {
        attempts: [],
        blockedUntil: null
    };
    
    // Check if currently blocked
    if (clientData.blockedUntil && now < clientData.blockedUntil) {
        const remainingMs = clientData.blockedUntil - now;
        const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
        return {
            allowed: false,
            error: `Too many attempts. Please try again in ${remainingMinutes} minute(s).`,
            retryAfter: remainingMs
        };
    }
    
    // Clear old attempts outside the window
    const windowStart = now - config.windowMs;
    const recentAttempts = clientData.attempts.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (recentAttempts.length >= config.maxAttempts) {
        // Block the client
        const blockedUntil = now + config.blockDurationMs;
        clientData.blockedUntil = blockedUntil;
        clientData.attempts = recentAttempts;
        
        rateLimitData[clientId] = clientData;
        await db.saveRateLimitData(rateLimitData);
        
        const remainingMs = config.blockDurationMs;
        const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
        return {
            allowed: false,
            error: `Too many attempts. Please try again in ${remainingMinutes} minute(s).`,
            retryAfter: remainingMs
        };
    }
    
    // Add current attempt
    recentAttempts.push(now);
    clientData.attempts = recentAttempts;
    
    // Clear block if it expired
    if (clientData.blockedUntil && now >= clientData.blockedUntil) {
        clientData.blockedUntil = null;
    }
    
    rateLimitData[clientId] = clientData;
    await db.saveRateLimitData(rateLimitData);
    
    return {
        allowed: true,
        remaining: config.maxAttempts - recentAttempts.length
    };
}

// Record failed attempt (for login)
async function recordFailedAttempt(req, type, identifier = null) {
    const config = RATE_LIMITS[type];
    if (!config) {
        return;
    }

    await db.initDb();
    
    const clientId = getClientId(req, identifier);
    const now = Date.now();
    
    let rateLimitData = await db.getRateLimitData();
    if (!rateLimitData) {
        rateLimitData = {};
    }
    
    const clientData = rateLimitData[clientId] || {
        attempts: [],
        blockedUntil: null
    };
    
    // Add failed attempt
    clientData.attempts.push(now);
    
    // Check if should block
    const windowStart = now - config.windowMs;
    const recentAttempts = clientData.attempts.filter(timestamp => timestamp > windowStart);
    
    if (recentAttempts.length >= config.maxAttempts && config.blockDurationMs > 0) {
        clientData.blockedUntil = now + config.blockDurationMs;
    }
    
    rateLimitData[clientId] = clientData;
    await db.saveRateLimitData(rateLimitData);
}

// Clear rate limit (for successful login)
async function clearRateLimit(req, type, identifier = null) {
    await db.initDb();
    
    const clientId = getClientId(req, identifier);
    
    let rateLimitData = await db.getRateLimitData();
    if (!rateLimitData) {
        return;
    }
    
    if (rateLimitData[clientId]) {
        // Clear attempts but keep structure
        rateLimitData[clientId] = {
            attempts: [],
            blockedUntil: null
        };
        await db.saveRateLimitData(rateLimitData);
    }
}

module.exports = {
    checkRateLimit,
    recordFailedAttempt,
    clearRateLimit,
    RATE_LIMITS
};

