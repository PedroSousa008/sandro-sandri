/* ========================================
   Sardinia promotional pricing (temporary)
   Revert: set SARDINIA_PROMO_ACTIVE=false in Vercel, or set PROMO_DEFAULT false below,
   and restore Sardinia price to 70 in js/products.js + index.html Sardinia card.
   ======================================== */

const SARDINIA_PRODUCT_ID = 4;

/** Default OFF; set SARDINIA_PROMO_ACTIVE=true to enable 0€ Sardinia + free shipping (Sardinia-only cart) */
const PROMO_DEFAULT = false;

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
    if (!catalogProduct) return 7000;
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
