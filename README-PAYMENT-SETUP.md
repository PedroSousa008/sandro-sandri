# Payment & Inventory System Setup Guide

## Overview

This implementation provides a production-grade checkout/payment and inventory system using Stripe Checkout and a file-based database (easily migratable to PostgreSQL/MongoDB).

## Architecture

- **Frontend**: Existing HTML/JS checkout page
- **Backend**: Vercel Serverless Functions (Node.js)
- **Payment**: Stripe Checkout Sessions
- **Database**: File-based JSON storage (`.data/` directory) - ready for migration to real DB
- **Webhooks**: Stripe webhook handler with idempotency

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Stripe Account Setup

1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Stripe Dashboard:
   - **Secret Key**: `sk_test_...` (for testing) or `sk_live_...` (for production)
   - **Publishable Key**: `pk_test_...` (for testing) or `pk_live_...` (for production)
3. Set up webhook endpoint in Stripe Dashboard:
   - URL: `https://your-domain.vercel.app/api/webhooks/stripe`
   - Events to listen for: `checkout.session.completed`
   - Copy the webhook signing secret: `whsec_...`

### 3. Environment Variables

Create a `.env` file in the root directory (or set in Vercel Dashboard):

```env
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
SITE_URL=https://sandro-sandri.vercel.app
SHIPPING_FLAT_RATE=20.00
```

**Important**: Never commit `.env` to git. It's already in `.gitignore`.

### 4. Vercel Deployment

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel Dashboard:
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.example`
4. Deploy

### 5. Webhook Configuration

After deployment:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.vercel.app/api/webhooks/stripe`
3. Select event: `checkout.session.completed`
4. Copy the webhook signing secret and add to Vercel environment variables

## Testing

### Stripe Test Cards

Use these test card numbers in Stripe Checkout:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Use any future expiry date, any 3-digit CVC, and any ZIP code.

### Testing Webhooks Locally

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
4. Copy the webhook secret from the CLI output
5. Use that secret in your local `.env` file

### Testing Inventory

1. Place a test order with 2+ items (should get free shipping)
2. Place a test order with 1 item (should charge shipping)
3. Verify inventory decrements after successful payment
4. Test sold-out state by ordering all available stock

## Shipping Rules

- **Free Shipping**: If cart has 2 or more items (total quantity)
- **Paid Shipping**: Based on country:
  - Portugal: €5
  - EU (ES, FR, IT): €8
  - EU (DE, NL, BE, AT): €10
  - Switzerland/UK: €12
  - Rest of World: €20

## Inventory Management

- Each product model has 150 units total
- Split by size: XS=10, S=20, M=50, L=50, XL=20
- Inventory decrements ONLY after successful payment (webhook confirmed)
- Sold out state updates automatically

## Database Migration (Future)

The current implementation uses file-based storage (`.data/` directory). To migrate to a real database:

1. Replace `lib/db.js` functions with actual DB queries
2. Recommended: Vercel Postgres, MongoDB Atlas, or Supabase
3. Update all `db.*` calls in API routes
4. Run migrations to create tables

## API Endpoints

- `POST /api/checkout/create-session` - Create Stripe checkout session
- `POST /api/webhooks/stripe` - Handle Stripe webhooks
- `GET /api/inventory/stock` - Get current inventory status

## Security Notes

- All secret keys are server-side only
- Webhook signature verification prevents unauthorized requests
- Idempotent webhook processing prevents double-charging
- Inventory checks happen at both checkout creation and webhook processing

## Troubleshooting

### Webhook not receiving events
- Verify webhook URL is correct in Stripe Dashboard
- Check webhook secret matches in environment variables
- Use Stripe CLI to test locally

### Inventory not decrementing
- Check webhook is receiving `checkout.session.completed` events
- Verify webhook handler is processing successfully
- Check `.data/inventory.json` file exists and is writable

### Payment not processing
- Verify Stripe keys are correct (test vs live)
- Check browser console for errors
- Verify cart items have valid product IDs and prices

