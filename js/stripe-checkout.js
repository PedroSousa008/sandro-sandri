/* ========================================
   Sandro Sandri - Stripe Checkout (Buy now)
   Reusable buyNow(priceId) and price map from /api/config/prices
   ======================================== */

(function () {
    'use strict';

    var priceMapCache = null;

    function getPriceMap() {
        if (priceMapCache) return Promise.resolve(priceMapCache);
        return fetch('/api/config/prices')
            .then(function (r) {
                if (!r.ok) throw new Error('Could not load prices');
                return r.json();
            })
            .then(function (data) {
                priceMapCache = data.prices || {};
                return priceMapCache;
            });
    }

    function getPriceForProduct(productId) {
        var id = String(productId);
        if (priceMapCache && priceMapCache[id]) return priceMapCache[id];
        return getPriceMap().then(function (map) {
            return map[id] || null;
        });
    }

    function buyNow(priceId, buttonEl) {
        if (!priceId || typeof priceId !== 'string') {
            var msg = 'Invalid product or price.';
            if (typeof alert === 'function') alert(msg);
            return Promise.reject(new Error(msg));
        }
        var btn = buttonEl || null;
        if (btn) {
            btn.disabled = true;
            var origText = btn.textContent;
            btn.textContent = 'A carregar…';
        }
        return fetch('/api/checkout/create-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priceId: priceId })
        })
            .then(function (r) {
                return r.json().then(function (data) {
                    if (!r.ok) {
                        var message = (data && data.message) ? data.message : 'Something went wrong. Please try again.';
                        throw new Error(message);
                    }
                    if (data && data.url) {
                        window.location.href = data.url;
                        return;
                    }
                    throw new Error('No checkout URL received.');
                });
            })
            .catch(function (err) {
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = (btn.dataset && btn.dataset.originalText) ? btn.dataset.originalText : 'Comprar agora';
                }
                var msg = err && err.message ? err.message : 'Checkout failed. Please try again.';
                if (typeof alert === 'function') alert(msg);
                return Promise.reject(err);
            });
    }

    function initBuyNowButtons() {
        document.addEventListener('click', function (e) {
            var btn = e.target && e.target.closest && e.target.closest('.buy-now-btn');
            if (!btn || btn.disabled) return;
            var productId = btn.dataset && btn.dataset.productId;
            if (!productId) return;
            e.preventDefault();
            btn.dataset.originalText = btn.textContent || 'Comprar agora';
            getPriceForProduct(productId).then(function (priceId) {
                if (!priceId) {
                    if (typeof alert === 'function') alert('Este produto não está disponível para compra direta.');
                    return;
                }
                buyNow(priceId, btn);
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBuyNowButtons);
    } else {
        initBuyNowButtons();
    }

    window.StripeCheckout = {
        getPriceMap: getPriceMap,
        getPriceForProduct: getPriceForProduct,
        buyNow: buyNow,
        initBuyNowButtons: initBuyNowButtons
    };
})();
