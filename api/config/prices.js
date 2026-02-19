/* ========================================
   Sandro Sandri - Public Price IDs (Chapter I)
   Returns allowed Stripe Price IDs for frontend; no secrets.
   ======================================== */

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        res.setHeader('Content-Type', 'application/json');
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('Content-Type', 'application/json');
    const prices = {
        '1': process.env.STRIPE_PRICE_ISOLE_CAYMAN || null,
        '2': process.env.STRIPE_PRICE_ISOLA_DI_NECKER || null,
        '3': process.env.STRIPE_PRICE_MONROES_KISSES || null,
        '4': process.env.STRIPE_PRICE_SARDINIA || null,
        '5': process.env.STRIPE_PRICE_PORT_COTON || null
    };
    res.status(200).json({ prices });
};
