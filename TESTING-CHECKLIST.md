# Testing Checklist - Payment & Inventory System

## ✅ Pre-Deployment Checks

### 1. Environment Variables
- [ ] `STRIPE_SECRET_KEY` set in Vercel Dashboard (test key: `sk_test_...`)
- [ ] `STRIPE_WEBHOOK_SECRET` set in Vercel Dashboard (from Stripe webhook setup)
- [ ] `SITE_URL` set to your Vercel domain
- [ ] `SHIPPING_FLAT_RATE` set (optional, defaults to 20.00)

### 2. Stripe Configuration
- [ ] Stripe account created and activated
- [ ] Test API keys obtained from Stripe Dashboard
- [ ] Webhook endpoint configured in Stripe Dashboard:
  - URL: `https://your-domain.vercel.app/api/webhooks/stripe`
  - Event: `checkout.session.completed`
  - Webhook secret copied to Vercel env vars

### 3. Code Verification
- [ ] All files committed and pushed to GitHub
- [ ] Vercel deployment successful
- [ ] No build errors in Vercel logs

## 🧪 Testing Steps

### Test 1: Checkout Session Creation
1. Add items to cart
2. Go to checkout page
3. Fill in customer information
4. Click "Place Order"
5. **Expected**: Redirected to Stripe Checkout page
6. **If fails**: Check browser console and Vercel function logs

### Test 2: Payment Processing
1. On Stripe Checkout page, use test card: `4242 4242 4242 4242`
2. Use any future expiry date (e.g., 12/25)
3. Use any 3-digit CVC (e.g., 123)
4. Complete payment
5. **Expected**: Redirected to `order-success.html`
6. **If fails**: Check Stripe Dashboard for payment status

### Test 3: Inventory Decrement
1. Place a test order (use test card)
2. Wait 5-10 seconds for webhook processing
3. Check `.data/inventory.json` (if accessible) or verify product shows reduced stock
4. **Expected**: Inventory decreased by ordered quantities
5. **If fails**: Check Vercel function logs for webhook errors

### Test 4: Free Shipping
1. Add 2+ items to cart (total quantity >= 2)
2. Go to checkout
3. **Expected**: Shipping shows as "Free"
4. Complete order
5. **Expected**: No shipping charge in Stripe Checkout

### Test 5: Paid Shipping
1. Add only 1 item to cart
2. Go to checkout
3. Select a country (e.g., Portugal)
4. **Expected**: Shipping shows country-specific fee
5. Complete order
6. **Expected**: Shipping charge included in Stripe Checkout

### Test 6: Sold Out Prevention
1. Order all available stock of a size (e.g., 10 XS items)
2. Try to add more XS items to cart
3. **Expected**: Size shows as "Sold Out" or prevents adding
4. Try to checkout with sold-out items
5. **Expected**: Error message about insufficient stock

### Test 7: Webhook Idempotency
1. Place a test order
2. Manually trigger the same webhook event from Stripe Dashboard
3. **Expected**: Event processed only once, inventory not double-decremented
4. Check `.data/webhook-events.json` for duplicate event IDs

### Test 8: Error Handling
1. Try checkout with empty cart
2. **Expected**: Error message, no redirect
3. Try checkout with invalid email
4. **Expected**: Validation error
5. Use declined test card: `4000 0000 0000 0002`
6. **Expected**: Payment fails, no inventory decrement

## 🔍 Debugging

### Check Vercel Function Logs
1. Go to Vercel Dashboard → Your Project → Functions
2. Click on function name (e.g., `api/checkout/create-session`)
3. View logs for errors

### Check Stripe Dashboard
1. Go to Stripe Dashboard → Payments
2. View test payments
3. Check webhook events: Developers → Webhooks → Your endpoint → Events

### Common Issues

**Issue**: "Failed to create checkout session"
- **Check**: Stripe secret key is correct
- **Check**: Cart items have valid `productId`, `price`, `quantity`
- **Check**: Vercel function logs for specific error

**Issue**: Webhook not receiving events
- **Check**: Webhook URL is correct in Stripe Dashboard
- **Check**: Webhook secret matches in Vercel env vars
- **Check**: Event type is `checkout.session.completed`
- **Check**: Vercel function logs for webhook attempts

**Issue**: Inventory not decrementing
- **Check**: Webhook is being received (Stripe Dashboard → Webhooks → Events)
- **Check**: Webhook handler is processing successfully (Vercel logs)
- **Check**: Database files are writable (`.data/` directory)
- **Check**: Payment status is `paid` (Stripe Dashboard)

**Issue**: "Webhook signature verification failed"
- **Check**: Webhook secret is correct
- **Check**: Raw body is being passed correctly (Vercel handles this automatically)
- **Check**: Webhook endpoint URL matches exactly

## ✅ Success Criteria

All tests pass when:
- ✅ Checkout redirects to Stripe
- ✅ Payment processes successfully
- ✅ Inventory decrements after payment
- ✅ Free shipping works for 2+ items
- ✅ Paid shipping works for 1 item
- ✅ Sold out items are prevented
- ✅ Webhooks are idempotent
- ✅ Orders are saved correctly

## 📝 Notes

- Test with Stripe test mode first
- Switch to live mode only after all tests pass
- Monitor Stripe Dashboard for any failed payments
- Check Vercel logs regularly during initial testing
- Keep `.data/` directory backed up (contains inventory and orders)

