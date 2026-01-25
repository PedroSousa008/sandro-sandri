/* ========================================
   Sandro Sandri - Security Logging
   Tracks security events for monitoring and forensics
   ======================================== */

const db = require('./storage');

// Security event types
const EVENT_TYPES = {
    LOGIN_FAILED: 'LOGIN_FAILED',
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    SIGNUP_ATTEMPT: 'SIGNUP_ATTEMPT',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
    ADMIN_ACTION: 'ADMIN_ACTION',
    SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
    DATA_ACCESS: 'DATA_ACCESS'
};

// Get client IP from request
function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.headers['x-real-ip'] || req.connection?.remoteAddress || 'unknown';
}

// Get user agent from request
function getUserAgent(req) {
    return req.headers['user-agent'] || 'unknown';
}

// Log security event
async function logSecurityEvent(type, details = {}) {
    try {
        await db.initDb();
        
        const event = {
            type: type,
            timestamp: new Date().toISOString(),
            details: {
                ...details,
                // Remove sensitive data from logs
                password: undefined,
                passwordHash: undefined,
                token: details.token ? '***REDACTED***' : undefined
            }
        };
        
        let securityLogs = await db.getSecurityLogs();
        if (!securityLogs) {
            securityLogs = [];
        }
        
        // Add event
        securityLogs.push(event);
        
        // Keep only last 10,000 events (prevent unbounded growth)
        if (securityLogs.length > 10000) {
            securityLogs = securityLogs.slice(-10000);
        }
        
        await db.saveSecurityLogs(securityLogs);
        
        // Console log for immediate visibility (in production, use proper logging service)
        console.log(`🔒 [SECURITY] ${type}:`, {
            timestamp: event.timestamp,
            ...event.details
        });
        
        return true;
    } catch (error) {
        console.error('Error logging security event:', error);
        // Don't throw - logging failures shouldn't break the app
        return false;
    }
}

// Log failed login attempt
async function logFailedLogin(req, email, reason = 'Invalid credentials') {
    return await logSecurityEvent(EVENT_TYPES.LOGIN_FAILED, {
        email: email,
        ip: getClientIp(req),
        userAgent: getUserAgent(req),
        reason: reason
    });
}

// Log successful login
async function logSuccessfulLogin(req, email, isOwner = false) {
    return await logSecurityEvent(EVENT_TYPES.LOGIN_SUCCESS, {
        email: email,
        ip: getClientIp(req),
        userAgent: getUserAgent(req),
        isOwner: isOwner
    });
}

// Log signup attempt
async function logSignupAttempt(req, email, success = true) {
    return await logSecurityEvent(EVENT_TYPES.SIGNUP_ATTEMPT, {
        email: email,
        ip: getClientIp(req),
        userAgent: getUserAgent(req),
        success: success
    });
}

// Log rate limit exceeded
async function logRateLimitExceeded(req, type, identifier) {
    return await logSecurityEvent(EVENT_TYPES.RATE_LIMIT_EXCEEDED, {
        type: type,
        identifier: identifier,
        ip: getClientIp(req),
        userAgent: getUserAgent(req)
    });
}

// Log unauthorized access attempt
async function logUnauthorizedAccess(req, endpoint, reason = 'No authentication') {
    return await logSecurityEvent(EVENT_TYPES.UNAUTHORIZED_ACCESS, {
        endpoint: endpoint,
        ip: getClientIp(req),
        userAgent: getUserAgent(req),
        reason: reason
    });
}

// Log admin action
async function logAdminAction(req, action, details = {}) {
    const email = req.user?.email || 'unknown';
    return await logSecurityEvent(EVENT_TYPES.ADMIN_ACTION, {
        email: email,
        action: action,
        ip: getClientIp(req),
        userAgent: getUserAgent(req),
        ...details
    });
}

// Log suspicious activity
async function logSuspiciousActivity(req, activity, details = {}) {
    return await logSecurityEvent(EVENT_TYPES.SUSPICIOUS_ACTIVITY, {
        activity: activity,
        ip: getClientIp(req),
        userAgent: getUserAgent(req),
        ...details
    });
}

// Log data access
async function logDataAccess(req, dataType, email) {
    return await logSecurityEvent(EVENT_TYPES.DATA_ACCESS, {
        dataType: dataType,
        email: email,
        ip: getClientIp(req),
        userAgent: getUserAgent(req)
    });
}

// Get security logs (admin only)
async function getSecurityLogs(limit = 100, type = null) {
    try {
        await db.initDb();
        let logs = await db.getSecurityLogs();
        if (!logs) {
            return [];
        }
        
        // Filter by type if specified
        if (type) {
            logs = logs.filter(log => log.type === type);
        }
        
        // Sort by timestamp (newest first)
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Limit results
        return logs.slice(0, limit);
    } catch (error) {
        console.error('Error getting security logs:', error);
        return [];
    }
}

module.exports = {
    EVENT_TYPES,
    logSecurityEvent,
    logFailedLogin,
    logSuccessfulLogin,
    logSignupAttempt,
    logRateLimitExceeded,
    logUnauthorizedAccess,
    logAdminAction,
    logSuspiciousActivity,
    logDataAccess,
    getSecurityLogs,
    getClientIp,
    getUserAgent
};

