# Stripe Webhooks & Order Emails

## Overview

- **Trigger:** When Stripe sends `checkout.session.completed` (payment completed), the webhook handler saves the order and sends two emails:
  1. **Order Confirmed** (branded) → to the **customer** (buyer)
  2. **New order** (internal) → to the **owner** (you)

- **Idempotency:** Events are stored by Stripe event ID. If Stripe retries the webhook, the handler returns 200 without re-processing, so no duplicate orders or duplicate emails.

## Environment variables

Set in Vercel → Project → Settings → Environment Variables (and in `.env` for local):

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Yes | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook signing secret (`whsec_...`) |
| `RESEND_API_KEY` | Yes (for emails) | Resend API key so order-confirmed emails send |
| `RESEND_FROM_EMAIL` | Recommended | Sender address (e.g. `noreply@yourdomain.com`) |
| `SUPPORT_EMAIL` | Optional | Reply-to for order emails (default: `support@sandrosandri.com`) |

## Test locally (Stripe CLI webhook forwarding)

1. Install [Stripe CLI](https://stripe.com/docs/stripe-cli).
2. Log in: `stripe login`
3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
4. Copy the webhook signing secret printed (e.g. `whsec_...`) and set it as `STRIPE_WEBHOOK_SECRET` in your `.env`.
5. Run the app (e.g. `vercel dev` or `npm run dev`).
6. In another terminal, trigger a test event:
   ```bash
   stripe trigger checkout.session.completed
   ```
   Or complete a real test checkout; the CLI will forward the event to your local `/api/webhooks/stripe`.

## Test the order-confirmed email (no Stripe)

To preview the branded "Order Confirmed" email HTML with mock data (no send):

```bash
node scripts/render-order-confirmed-email.js
```

This writes a sample HTML file to `scripts/order-confirmed-preview.html`. Open it in a browser to check layout and wording.

## Production

1. In Stripe Dashboard → Developers → Webhooks, add endpoint:
   - **URL:** `https://your-production-domain.com/api/webhooks/stripe`
   - **Events:** `checkout.session.completed` (and `payment_intent.succeeded` if you use Payment Intents)
2. Set `STRIPE_WEBHOOK_SECRET` in Vercel to the secret for this endpoint.
3. Ensure `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are set in Vercel so order-confirmed emails are sent.

After a successful purchase, the customer receives the "Sandro Sandri — Order Confirmed (Chapter I)" email with order summary and shipping address.
