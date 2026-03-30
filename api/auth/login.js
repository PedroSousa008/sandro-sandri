/**
 * POST /api/auth/login — explicit route so login does not depend only on rewrites/query parsing.
 */
const handler = require('./index.js');

module.exports = async (req, res) => {
    const q = req.query && typeof req.query === 'object' ? { ...req.query } : {};
    q.action = 'login';
    req.query = q;
    return handler(req, res);
};
