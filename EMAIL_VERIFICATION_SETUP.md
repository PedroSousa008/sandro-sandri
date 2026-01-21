# Email Verification System - Setup Guide

## Overview

The email verification system has been successfully implemented. New users must verify their email address before they can log in. Existing accounts are automatically grandfathered in and don't need verification.

## Files Changed/Added

### Backend API Endpoints
- `api/auth/signup.js` - Creates new user accounts with email verification
- `api/auth/verify-email.js` - Verifies email using token from email link
- `api/auth/resend-verification.js` - Resends verification email (rate limited)
- `api/auth/login.js` - Updated login to check email verification status

### Frontend Pages
- `signup.html` - New signup page with email/password form
- `verify-email.html` - Email verification page (handles token verification)
- `login.html` - Updated to show verification errors and resend link

### Core Files
- `lib/storage.js` - Added email verification token storage functions
- `lib/email.js` - Email service using Resend API
- `js/auth.js` - Updated login to check email verification via API
- `package.json` - Added `bcryptjs` and `resend` dependencies

## Database Schema Changes

### User Data Structure (in KV storage)
```javascript
{
  email: "user@example.com",
  passwordHash: "bcrypt_hash_here",  // NEW: Hashed password
  email_verified: false,              // NEW: Verification status
  email_verified_at: null,           // NEW: Timestamp when verified
  lastVerificationEmailSent: null,    // NEW: For rate limiting
  cart: [],
  profile: null,
  favorites: [],
  orders: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
}
```

### Email Verification Tokens (separate KV key)
```javascript
{
  "token_1234567890_abc123": {
    email: "user@example.com",
    tokenHash: "bcrypt_hash_of_token",
    expiresAt: "2026-01-02T00:00:00.000Z",  // 24 hours from creation
    createdAt: "2026-01-01T00:00:00.000Z",
    usedAt: null  // Set when token is used
  }
}
```

## Environment Variables

Add these to your Vercel project settings (or `.env.local` for local development):

```bash
# App URL (for email verification links)
APP_URL=https://your-domain.vercel.app

# Resend API Key (get from https://resend.com/api-keys)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Resend From Email (optional, must be verified in Resend)
RESEND_FROM_EMAIL=Sandro Sandri <noreply@sandrosandri.com>
```

## Setup Steps

### 1. Install Dependencies
```bash
npm install
```

This will install:
- `bcryptjs` - For password and token hashing
- `resend` - For sending emails

### 2. Set Up Resend Account

1. Go to https://resend.com and create an account
2. Get your API key from https://resend.com/api-keys
3. Add the API key to Vercel environment variables as `RESEND_API_KEY`
4. Verify your domain or use the default `onboarding@resend.dev` for testing
5. (Optional) Set `RESEND_FROM_EMAIL` to your verified email

### 3. Set App URL

In Vercel Dashboard → Settings → Environment Variables:
- Add `APP_URL` with your production domain (e.g., `https://sandrosandri.com`)

For local development, create `.env.local`:
```bash
APP_URL=http://localhost:3000
RESEND_API_KEY=re_your_key_here
```

### 4. Deploy

The system is ready to use! Deploy to Vercel and test the signup flow.

## User Flow

### New User Signup
1. User visits `/signup.html`
2. Enters email and password (min 6 characters)
3. Account is created with `email_verified: false`
4. Verification email is sent with unique token
5. User sees: "Check your inbox to verify your email"

### Email Verification
1. User clicks link in email: `/verify-email.html?token=...&email=...`
2. Token is validated (checked against hash, expiration, single-use)
3. User's `email_verified` is set to `true`
4. Token is marked as used
5. User is redirected to login with success message

### Login
1. User attempts to login
2. System checks `email_verified` status
3. If not verified: Shows error with "Resend verification email" link
4. If verified: Login proceeds normally

### Resend Verification
1. User clicks "Resend verification email" on login page
2. Rate limiting: Max 1 email per hour
3. Old tokens are invalidated
4. New token is generated and email sent

## Security Features

✅ **Password Hashing**: All passwords are hashed with bcrypt (10 rounds)
✅ **Token Hashing**: Verification tokens are hashed before storage
✅ **Single-Use Tokens**: Tokens are marked as used after verification
✅ **Token Expiration**: Tokens expire after 24 hours
✅ **Rate Limiting**: Max 1 verification email per hour per user
✅ **Email Verification Required**: Login blocked until email is verified

## Existing Accounts

**Important**: Existing accounts (created before this update) are automatically grandfathered in:
- They can login without verification
- Their passwords are migrated to hashed format on first login
- No action required from existing users

## Testing

### Local Testing
1. Set up `.env.local` with test Resend API key
2. Run `npm run dev`
3. Test signup flow at `http://localhost:3000/signup.html`
4. Check email inbox for verification link
5. Click link to verify
6. Test login

### Production Testing
1. Deploy to Vercel
2. Set environment variables in Vercel Dashboard
3. Test signup with real email
4. Verify email link works
5. Test login after verification

## Troubleshooting

### Emails Not Sending
- Check `RESEND_API_KEY` is set correctly
- Verify email domain in Resend dashboard
- Check Vercel function logs for errors

### Verification Link Not Working
- Check `APP_URL` is set to correct domain
- Verify token hasn't expired (24 hours)
- Check token hasn't been used already

### Login Fails After Verification
- Check user's `email_verified` field in database
- Verify password hash is correct
- Check API logs for errors

## Email Template

The email template is in `lib/email.js` and follows Sandro Sandri's design:
- Clean, minimalist design
- Single CTA button: "Confirm Email"
- Fallback text link
- 24-hour expiration notice
- Matches brand colors and fonts

## Next Steps

1. **Customize Email Template**: Edit `lib/email.js` to match your exact branding
2. **Add Email Domain**: Set up custom domain in Resend for professional emails
3. **Monitor**: Check Resend dashboard for email delivery stats
4. **Test**: Thoroughly test the flow before going live

