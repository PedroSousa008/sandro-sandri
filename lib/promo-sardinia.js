/* ========================================
   Sardinia promotional pricing (temporary)
   Revert: set SARDINIA_PROMO_ACTIVE=false in Vercel, or set PROMO_DEFAULT false below,
   and restore Sardinia price to 95 in js/products.js + index.html Sardinia card.
   ======================================== */

const SARDINIA_PRODUCT_ID = 4;

/** Default ON when env unset; use Vercel SARDINIA_PROMO_ACTIVE=false to disable without redeploy */
const PROMO_DEFAULT = true;

function isSardiniaPromoEnabled() {
    const v = process.env.SARDINIA_PROMO_ACTIVE;
    if (v === 'false' || v === '0') return false;
    if (v === 'true' || v === '1') return true;
    return PROMO_DEFAULT;
}

function cartIsOnlySardinia(cart) {
    if (!cart || !Array.isArray(cart) || cart.length === 0) return false;
    return cart.every((item) => Number(item.productId) === SARDINIA_PRODUCT_ID);
}

/**
 * @param {number} productId
 * @param {{ unit_amount_cents: number }} catalogProduct
 * @returns {number}
 */
function getUnitAmountCentsForProduct(productId, catalogProduct) {
    if (!catalogProduct) return 9500;
    const id = Number(productId);
    if (isSardiniaPromoEnabled() && id === SARDINIA_PRODUCT_ID) return 0;
    return catalogProduct.unit_amount_cents;
}

module.exports = {
    SARDINIA_PRODUCT_ID,
    isSardiniaPromoEnabled,
    cartIsOnlySardinia,
    getUnitAmountCentsForProduct
};
