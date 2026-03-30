# Security

## Environment variables (production)

**No owner secrets or JWT secrets are hardcoded.** Production requires these to be set in **Vercel → Project → Settings → Environment Variables**:

| Variable | Required (production) | Description |
|----------|----------------------|-------------|
| `OWNER_EMAIL` | Yes | Owner login email. Owner auth is disabled if unset. |
| `OWNER_PASSWORD` | Yes | Owner password. No fallback; must be set in env. |
| `OWNER_SECURITY_ANSWER` | Yes | Owner security answer for login. No fallback. |
| `JWT_SECRET` | Yes | Secret for signing/verifying JWTs. No random fallback in production. |
| `STRIPE_SECRET_KEY` | Yes | Stripe API secret key. |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret. |
| `SITE_URL` | Recommended | Base URL for redirects (e.g. `https://yourdomain.com`). |

Optional: `TEST_USER_EMAIL` (for 0€ test checkout when logged in), `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ALLOWED_ORIGIN` / `APP_URL`.

## Behavior

- **Production** (`VERCEL_ENV=production` or `NODE_ENV=production`): If any of `OWNER_EMAIL`, `OWNER_PASSWORD`, `OWNER_SECURITY_ANSWER`, or `JWT_SECRET` is missing, the app throws at startup (fail-fast). Owner login returns 503 "Owner auth not configured" if configuration is missing at request time.
- **Development**: Same env vars are required for owner login. Missing vars cause owner login to return 503. No default passwords or security answers are shipped.

## Reporting issues

Do not open public issues for security-sensitive bugs. Contact the project owner privately.
