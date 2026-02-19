# Webhook: Stock & Orders not updating

If checkout succeeds but **Owner Mode** (Stock table, Order Management) doesn’t update, check the following.

## 1. Stripe Webhook URL and secret

- **Stripe Dashboard** → **Developers** → **Webhooks** → your endpoint.
- **URL** must be your **production** URL, e.g.  
  `https://sandro-sandri.vercel.app/api/webhooks/stripe`  
  (not `http://localhost...`).
- **Events to send:** include **Checkout session completed** (or the events you use).
- **Signing secret:** in the endpoint details, copy the **Signing secret** (starts with `whsec_`).
- In **Vercel** → Project → **Settings** → **Environment Variables**, set:
  - `STRIPE_WEBHOOK_SECRET` = that **production** signing secret (the one for the URL above).  
  Do **not** use the secret from Stripe CLI (`stripe listen`) for production.
- Redeploy after changing env vars.

## 2. Webhook delivery in Stripe

- **Stripe Dashboard** → **Webhooks** → click your endpoint → **Recent events**.
- For each **Checkout session completed** event, check if it’s **Succeeded** or **Failed**.
- If **Failed**, open the event and read the error (e.g. signature verification, 4xx/5xx).  
  That tells you if the problem is secret, raw body, or your handler.

## 3. Persistence (Vercel KV / Redis)

Orders and stock are stored in **Vercel KV** (or configured Redis). If KV isn’t set, data stays only in memory and is lost between requests.

- **Vercel** → Project → **Storage** → create a **KV** database if you don’t have one; link it to the project.
- In **Settings** → **Environment Variables**, you should have (or the equivalent from the KV creation):
  - `KV_REST_API_URL`
  - `KV_REST_API_TOKEN`  
  (or the Upstash names the project expects.)
- Redeploy after linking KV / adding env vars.

## 4. Chapter inventory (Stock table)

Stock is stored **per chapter** (Chapter I, Chapter II). If a chapter’s inventory was never initialized, the webhook will still save the order but may skip decrementing stock.

- In **Owner Mode**, open the inventory/stock section and ensure each chapter is **initialized** (e.g. “Initialize” or “Set stock” for Chapter I and II) so the Stock table has data to decrement.

---

**Quick checks**

1. Stripe Webhook URL = production URL, secret in Vercel = that endpoint’s signing secret.  
2. Recent webhook events in Stripe = Succeeded (not Failed).  
3. Vercel KV (or Redis) linked and env vars set.  
4. Chapter inventory initialized in Owner Mode.
