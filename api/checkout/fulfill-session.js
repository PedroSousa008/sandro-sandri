/* ========================================
   Success-page fulfillment: retrieve Checkout Session from Stripe and run
   the same logic as checkout.session.completed webhook. Idempotent per session.
   ======================================== */

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? require('stripe')(stripeSecretKey) : null;
const cors = require('../../lib/cors');
const errorHandler = require('../../lib/error-handler');
const { fulfillCheckoutSession } = require('../../lib/checkout-fulfillment');

module.exports = async (req, res) => {
    cors.setCORSHeaders(res, req, ['GET', 'POST', 'OPTIONS']);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!stripe) {
        return res.status(503).json({
            success: false,
            error: 'STRIPE_NOT_CONFIGURED',
            message: 'Payment is not configured.'
        });
    }

    try {
        let sessionId =
            (req.query && req.query.session_id) ||
            (req.query && req.query.sessionId) ||
            (req.body && req.body.session_id) ||
            (req.body && req.body.sessionId);

        if (!sessionId && typeof req.body === 'string') {
            try {
                const parsed = JSON.parse(req.body);
                sessionId = parsed.session_id || parsed.sessionId;
            } catch (_) {
                /* ignore */
            }
        }

        if (!sessionId || typeof sessionId !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'MISSING_SESSION_ID',
                message: 'session_id is required'
            });
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        const order = await fulfillCheckoutSession(session);

        if (!order && session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
            return res.status(200).json({
                success: true,
                fulfilled: false,
                paymentStatus: session.payment_status,
                message: 'Payment not completed yet'
            });
        }

        if (!order) {
            return res.status(200).json({
                success: true,
                fulfilled: false,
                paymentStatus: session.payment_status
            });
        }

        return res.status(200).json({
            success: true,
            fulfilled: true,
            orderId: order.id,
            orderNumber: order.orderNumber || order.id
        });
    } catch (error) {
        console.error('fulfill-session error:', error && error.message);
        errorHandler.sendSecureError(
            res,
            error,
            500,
            'Could not confirm order. Please contact support if payment was successful.',
            'FULFILL_SESSION_ERROR'
        );
    }
};
