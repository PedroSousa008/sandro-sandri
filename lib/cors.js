/* ========================================
   Sandro Sandri - CORS Helper
   Provides secure CORS configuration
   ======================================== */

/**
 * Get the allowed origin for CORS requests
 * 
 * Security: Restricts CORS to specific domains instead of allowing all origins (*)
 * 
 * @param {Object} req - Request object (optional, for checking origin)
 * @returns {string} Allowed origin URL
 */
function getAllowedOrigin(req = null) {
    // Get allowed origin from environment variable
    const allowedOrigin = process.env.ALLOWED_ORIGIN || process.env.APP_URL || process.env.SITE_URL;
    
    // If environment variable is set, use it
    if (allowedOrigin) {
        return allowedOrigin;
    }
    
    // Fallback: Check if request origin matches common production domains
    if (req && req.headers && req.headers.origin) {
        const origin = req.headers.origin;
        
        // Allow common Sandro Sandri domains
        const allowedDomains = [
            'https://sandrosandri.com',
            'https://www.sandrosandri.com',
            'https://sandrosandri.vercel.app',
            'https://sandro-sandri.vercel.app'
        ];
        
        // Check if origin matches allowed domains
        if (allowedDomains.some(domain => origin.startsWith(domain))) {
            return origin;
        }
    }
    
    // Development: Allow localhost for local development
    if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
        if (req && req.headers && req.headers.origin) {
            const origin = req.headers.origin;
            if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
                return origin;
            }
        }
        // Default to localhost for development
        return 'http://localhost:3000';
    }
    
    // Production fallback: Use Vercel URL if available
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }
    
    // Last resort: Return null (will be handled by API endpoints)
    return null;
}

/**
 * Set CORS headers on response
 * 
 * @param {Object} res - Response object
 * @param {Object} req - Request object (optional)
 * @param {Array<string>} methods - Allowed HTTP methods (default: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
 * @param {Array<string>} headers - Allowed headers (default: ['Content-Type', 'Authorization', 'X-Session-Token'])
 */
function setCORSHeaders(res, req = null, methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], headers = ['Content-Type', 'Authorization', 'X-Session-Token']) {
    const origin = getAllowedOrigin(req);
    
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        // If no origin is determined, default to request origin (for development)
        if (req && req.headers && req.headers.origin) {
            res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
        } else {
            // Last resort: restrict to specific domain (security best practice)
            res.setHeader('Access-Control-Allow-Origin', 'https://sandrosandri.com');
        }
    }
    
    res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', headers.join(', '));
    res.setHeader('Access-Control-Allow-Credentials', 'true');
}

module.exports = {
    getAllowedOrigin,
    setCORSHeaders
};

