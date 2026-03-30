# Security Audit Report — Sandro Sandri (Luxury E‑commerce)

**Auditor:** Senior Web Security / Penetration Testing  
**Scope:** Full stack (static site + Vercel serverless `/api`, Stripe Checkout & webhooks)  
**Date:** 2026-02-16  
**Classification:** Strict, production‑launch oriented  

---

## Executive summary (non‑technical)

The site has solid foundations: security headers, rate limiting on login/signup, hashed passwords, JWT auth, and Stripe webhook verification with idempotency. **Two issues must be fixed before any luxury e‑commerce launch:**

1. **Payment manipulation (CRITICAL)**  
   The checkout flow trusts the price sent by the browser. A malicious user could change the price to almost zero, pay that amount, and still receive the order. **You must stop using client‑supplied prices for the actual charge.** Prices must come only from your server (or Stripe), not from the cart payload.

2. **Hardcoded owner credentials (CRITICAL)**  
   The owner password and security answer have default values in the source code. If environment variables are not set in production, anyone with access to the code (or a leak) could log in as owner. **All owner secrets must exist only in environment variables in production**, with no fallbacks in code.

Until these are fixed, the project is **not ready for a paid, luxury e‑commerce launch**. After fixes and the other recommended improvements (CSP, webhook error messages, rate limiting on checkout), risk drops to an acceptable level for launch.

---

## Technical findings

### 1. Frontend security

| Finding | Location | Risk | Notes |
|--------|----------|------|--------|
| **No exposed API keys in HTML/JS** | Global | — | Stripe keys and secrets are not in frontend; only session token in `localStorage` (expected). |
| **CSP uses `unsafe-inline` and `unsafe-eval`** | `vercel.json` | **HIGH** | `script-src` includes `'unsafe-inline'` and `'unsafe-eval'`, which greatly weakens XSS protection. |
| **innerHTML with dynamic data** | `admin.html`, `profile.js`, `cart.js`, `product.js`, etc. | **MEDIUM** | Many uses of `innerHTML`; admin orders and profile orders use an `esc()` helper. Other places (e.g. cart, product names from API) must ensure all user‑ or API‑sourced data is escaped before insertion. |
| **Open redirects** | — | **LOW** | Redirects are to fixed paths (`login.html`, `index.html`, etc.). No URL‑parameter‑driven redirects found. |
| **Form validation** | Login, signup, checkout | **LOW** | Auth uses server‑side validation and sanitization. Checkout form validation is mostly client‑side; server should enforce all constraints. |

**CSP (current) in `vercel.json`:**  
`script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com`  
Recommendation: move to nonces or hashes for scripts and remove `unsafe-inline` / `unsafe-eval` where possible.

---

### 2. Backend / serverless security

| Finding | Location | Risk | Notes |
|--------|----------|------|--------|
| **Stripe webhook signature** | `api/webhooks/stripe.js` | **LOW** | Uses `stripe.webhooks.constructEvent(body, sig, webhookSecret)`. Raw body is read from stream first; fallback to `req.body` may break verification if body was already parsed. |
| **Webhook idempotency** | `api/webhooks/stripe.js` | — | Implemented via `isEventProcessed` / `markEventProcessed`; prevents duplicate order/inventory updates. |
| **Webhook 500 error leaks message** | `api/webhooks/stripe.js` | **MEDIUM** | On processing error, response is `res.status(500).json({ error: error.message })`. Internal error text can leak to Stripe (and logs). Should return a generic message. |
| **Hardcoded owner credentials** | `lib/auth.js` | **CRITICAL** | `OWNER_PASSWORD = process.env.OWNER_PASSWORD \|\| 'Sousa10Pedro'`, `OWNER_SECURITY_ANSWER = '10.09.2025'`. If env is unset, credentials are in source. |
| **JWT secret fallback** | `lib/auth.js` | **HIGH** | `JWT_SECRET` fallback to `crypto.randomBytes(64)`; tokens invalidate on each cold start if env not set. Production must set `JWT_SECRET`. |
| **Client‑controlled cart prices** | `api/checkout/create-session.js` | **CRITICAL** | Cart flow uses `item.price` from `req.body.cart` to set `unit_amount` in Stripe. Attacker can send `price: 0.01` and pay cents for full order. |
| **Price ID whitelist (good)** | `api/checkout/create-session.js` | — | `priceId` flow uses env‑based whitelist; no arbitrary Stripe Price IDs. |
| **Input validation** | `api/user`, `api/auth` | — | Email and profile validated/sanitized; auth uses validation layer. |
| **Error handling** | `lib/error-handler.js` | — | Sanitizes error messages; avoids leaking paths and env names. |
| **CORS** | `lib/cors.js` | **LOW** | When origin cannot be determined, falls back to `req.headers.origin` or fixed domain; ensure no wildcard in production. |

---

### 3. HTTP & platform security

| Finding | Location | Risk | Notes |
|--------|----------|------|--------|
| **Strict-Transport-Security** | `vercel.json` | — | Set: `max-age=31536000; includeSubDomains; preload`. |
| **X-Frame-Options** | `vercel.json` | — | `DENY`. |
| **X-Content-Type-Options** | `vercel.json` | — | `nosniff`. |
| **Referrer-Policy** | `vercel.json` | — | `strict-origin-when-cross-origin`. |
| **Content-Security-Policy** | `vercel.json` | **HIGH** | Present but weakened by `unsafe-inline` and `unsafe-eval`. |
| **HTTPS** | Vercel | — | Enforced by platform. |
| **Rate limiting** | `lib/rate-limit.js`, `api/auth` | — | Login (5/15 min), signup (3/1 h), waitlist; **checkout/create-session is not rate limited** (abuse risk). |

---

### 4. Stripe‑specific security

| Finding | Risk | Notes |
|--------|------|--------|
| **Webhook signature verification** | **LOW** | Correct use of `constructEvent`; raw body handling may fail if Vercel parses body before handler. |
| **Idempotency** | — | Implemented; duplicate events do not double‑fulfil. |
| **Client‑side price manipulation** | **CRITICAL** | Cart flow uses client‑supplied prices for `line_items`. Must use server‑side or Stripe Price IDs only. |
| **Checkout session creation** | **HIGH** | `priceId` path is safe (whitelist). Cart path is unsafe due to price trust. |
| **Webhook endpoint** | **MEDIUM** | No rate limiting on webhook; Stripe retries could amplify load. Error response leaks `error.message`. |

---

### 5. Production hardening

- **Owner credentials:** Must not live in code; use only env vars in production.
- **Resend API key logging:** `lib/email.js` logs presence and length of API key; avoid logging any key material in production.
- **Admin / profile XSS:** Admin orders table and profile orders use escaping; ensure every dynamic string in innerHTML is escaped (including product names, tracking, etc.).
- **Checkout rate limiting:** Add per‑IP (or per‑user) rate limiting for `POST /api/checkout/create-session` to prevent abuse.

---

## Risk score (before fixes)

| Category | Score | Notes |
|----------|--------|--------|
| Payment / pricing | **CRITICAL** | Client‑controlled prices. |
| Authentication / secrets | **CRITICAL** | Hardcoded owner fallbacks. |
| Injection / XSS | **MEDIUM** | CSP weak; some innerHTML with escaping. |
| Stripe / webhook | **MEDIUM** | Verification and idempotency good; error leak and no server‑side price. |
| Headers / transport | **LOW** | HSTS, XFO, etc. in place; CSP could be stronger. |

**Overall:** **Not ready for launch** until the two CRITICAL items are fixed and HIGH/MEDIUM items are addressed.

---

## Step‑by‑step fixes (by priority)

### P0 — Must fix before launch

1. **Remove client‑controlled prices (CRITICAL)**  
   - In `api/checkout/create-session.js`, for the **cart** flow, do **not** use `item.price` from the request to set Stripe `unit_amount`.  
   - Options:  
     - **(A)** Maintain a server‑side product/price map (e.g. by `productId`) and set `unit_amount` only from that map, or  
     - **(B)** Use Stripe Price IDs for every product and send only `productId` + `quantity` from the client; server maps `productId` → Stripe Price ID and builds `line_items` with `price: priceId`, `quantity`.  
   - Keep the test‑user (0€) logic only for the designated test email after JWT verification; all other users must get server‑side prices only.

2. **Remove hardcoded owner secrets (CRITICAL)**  
   - In `lib/auth.js`:  
     - Do **not** default `OWNER_PASSWORD`; require `process.env.OWNER_PASSWORD` in production (e.g. if `NODE_ENV === 'production'` or `VERCEL_ENV === 'production'`, throw or refuse login if unset).  
     - Do **not** default `OWNER_SECURITY_ANSWER`; require `process.env.OWNER_SECURITY_ANSWER` in production.  
   - Set `OWNER_PASSWORD` and `OWNER_SECURITY_ANSWER` (and `JWT_SECRET`) in Vercel environment variables for production.

### P1 — Should fix before launch

3. **Webhook error response**  
   - In `api/webhooks/stripe.js`, on catch, return a generic message, e.g. `res.status(500).json({ error: 'Webhook processing failed' })` and log the full error server‑side only.

4. **JWT secret**  
   - Ensure `JWT_SECRET` is set in Vercel for all environments. Remove or avoid reliance on the random fallback in production.

5. **CSP**  
   - Plan to remove `unsafe-inline` and `unsafe-eval`: use nonces (or hashes) for inline scripts and avoid `eval`. This may require refactoring inline scripts.

### P2 — Recommended soon after launch

6. **Rate limit checkout**  
   - Apply rate limiting (e.g. per IP) to `POST /api/checkout/create-session` (e.g. 10–20 requests per minute per IP).

7. **Resend logging**  
   - In `lib/email.js`, avoid logging any part of the Resend API key; log only “configured” / “not configured” if needed.

8. **CORS**  
   - In production, avoid falling back to `req.headers.origin` when unknown; use a fixed allowlist (e.g. from env) and reject or use a single default origin.

9. **Global XSS review**  
   - Audit every `innerHTML` (and similar) usage and ensure all dynamic content (from user or API) is escaped; prefer `textContent` or a safe templating approach where possible.

---

## “Ready for launch?” verdict

**Verdict: No — not ready for a luxury e‑commerce launch in the current state.**

- **Blocking:**  
  - Cart checkout uses client‑supplied prices (payment manipulation).  
  - Owner credentials have hardcoded fallbacks in code.  

- **After P0 and P1 fixes:**  
  - With server‑side–only pricing, no hardcoded owner secrets, secure webhook error response, and JWT secret set in production, the project can be considered **ready for launch** from a strict security perspective, provided you accept the remaining CSP and rate‑limit improvements as follow‑ups.

- **Recommendation:**  
  Implement P0 fixes and P1 items 3–4, set all required env vars in Vercel, then re‑run a short security check (especially checkout flow and admin login). After that, you can treat the site as ready for a paid, luxury e‑commerce launch from a security standpoint.
