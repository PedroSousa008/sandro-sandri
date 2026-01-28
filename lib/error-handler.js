/* ========================================
   Sandro Sandri - Error Handler
   Provides secure error handling that doesn't expose sensitive information
   ======================================== */

/**
 * Sanitize error message for user-facing responses
 * Removes sensitive information like stack traces, file paths, etc.
 * 
 * @param {Error|string} error - Error object or error message
 * @param {string} defaultMessage - Default message if error can't be sanitized
 * @returns {string} Sanitized error message safe for users
 */
function sanitizeErrorMessage(error, defaultMessage = 'An error occurred') {
    if (!error) {
        return defaultMessage;
    }
    
    // If it's a string, return it as-is (but check for sensitive patterns)
    if (typeof error === 'string') {
        return sanitizeString(error, defaultMessage);
    }
    
    // If it's an Error object, extract message
    if (error instanceof Error) {
        const message = error.message || '';
        return sanitizeString(message, defaultMessage);
    }
    
    // If it's an object with a message property
    if (error.message) {
        return sanitizeString(error.message, defaultMessage);
    }
    
    return defaultMessage;
}

/**
 * Sanitize a string to remove sensitive information
 * 
 * @param {string} str - String to sanitize
 * @param {string} defaultMessage - Default message if string contains sensitive info
 * @returns {string} Sanitized string
 */
function sanitizeString(str, defaultMessage = 'An error occurred') {
    if (!str || typeof str !== 'string') {
        return defaultMessage;
    }
    
    // Patterns that indicate sensitive information
    const sensitivePatterns = [
        /\/[a-zA-Z0-9_\-/]+\.js:\d+:\d+/g,  // File paths with line numbers
        /at\s+[a-zA-Z0-9_\-/.]+:\d+:\d+/g,  // Stack trace locations
        /Error:\s*[a-zA-Z0-9_\-/.]+:\d+/g,   // Error with file path
        /\/Users\/[^/]+\//g,                  // User home paths
        /\/home\/[^/]+\//g,                   // Linux home paths
        /C:\\[^\\]+\\/g,                      // Windows paths
        /node_modules/g,                       // Node modules references
        /process\.env\.[A-Z_]+/g,             // Environment variable names
        /API_KEY|SECRET|PASSWORD|TOKEN/g,      // Secret references
        /localhost:\d+/g,                      // Local development URLs
        /127\.0\.0\.1:\d+/g,                  // Local IP addresses
    ];
    
    // Check if string contains sensitive patterns
    for (const pattern of sensitivePatterns) {
        if (pattern.test(str)) {
            return defaultMessage;
        }
    }
    
    // Remove stack traces (lines starting with "at ")
    const lines = str.split('\n');
    const cleanLines = lines.filter(line => {
        const trimmed = line.trim();
        return !trimmed.startsWith('at ') && 
               !trimmed.startsWith('Error:') &&
               !trimmed.match(/^\w+Error:/);
    });
    
    // If we removed all lines, return default
    if (cleanLines.length === 0) {
        return defaultMessage;
    }
    
    // Return first clean line (main error message)
    return cleanLines[0].trim() || defaultMessage;
}

/**
 * Send a secure error response to the client
 * Logs full error details server-side but sends generic message to client
 * 
 * @param {Object} res - Express response object
 * @param {Error|string} error - Error object or message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string} userMessage - User-friendly error message (optional)
 * @param {string} errorCode - Error code for client handling (optional)
 */
function sendSecureError(res, error, statusCode = 500, userMessage = null, errorCode = null) {
    // Log full error details server-side (for debugging)
    if (error instanceof Error) {
        console.error('Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack?.substring(0, 500), // First 500 chars of stack
            code: error.code
        });
    } else {
        console.error('Error:', error);
    }
    
    // Prepare response
    const response = {
        success: false,
        error: errorCode || 'INTERNAL_ERROR',
        message: userMessage || sanitizeErrorMessage(error, 'An unexpected error occurred. Please try again later.')
    };
    
    // Don't include error details in production
    if (process.env.NODE_ENV !== 'production' && process.env.VERCEL_ENV !== 'production') {
        // In development, include sanitized error message
        response.debug = sanitizeErrorMessage(error);
    }
    
    res.status(statusCode).json(response);
}

/**
 * Send a validation error response
 * 
 * @param {Object} res - Express response object
 * @param {string} message - Validation error message
 * @param {string} field - Field that failed validation (optional)
 */
function sendValidationError(res, message, field = null) {
    const response = {
        success: false,
        error: 'VALIDATION_ERROR',
        message: message
    };
    
    if (field) {
        response.field = field;
    }
    
    res.status(400).json(response);
}

module.exports = {
    sanitizeErrorMessage,
    sanitizeString,
    sendSecureError,
    sendValidationError
};

