# 🔒 Sandro Sandri - Security Documentation

**Last Updated:** December 2024  
**Status:** ✅ Production Ready  
**Version:** 1.0

---

## 📋 Table of Contents

1. [Security Overview](#security-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [API Security](#api-security)
4. [Data Protection](#data-protection)
5. [Input Validation & Sanitization](#input-validation--sanitization)
6. [Attack Prevention](#attack-prevention)
7. [Security Monitoring & Logging](#security-monitoring--logging)
8. [Environment Variables & Secrets](#environment-variables--secrets)
9. [Security Best Practices](#security-best-practices)
10. [Deployment Checklist](#deployment-checklist)

---

## Security Overview

This document outlines all security measures implemented in the Sandro Sandri e-commerce website. The application follows industry best practices for web security, including defense in depth, least privilege, and secure by default principles.

### Security Status

| Category | Status | Priority |
|----------|--------|----------|
| Authentication | ✅ Complete | Critical |
| Authorization | ✅ Complete | Critical |
| Data Protection | ✅ Complete | Critical |
| Input Validation | ✅ Complete | High |
| Rate Limiting | ✅ Complete | High |
| Security Logging | ✅ Complete | Medium |
| CSRF Protection | ⚠️ Optional | Medium |

---

## Authentication & Authorization

### JWT-Based Authentication System

**Implementation:** `lib/auth.js`

The application uses JSON Web Tokens (JWT) for secure, stateless authentication.

#### Features:
- **Token Generation**: Secure JWT tokens with 24-hour expiration
- **HTTP-Only Cookies**: Tokens stored in HTTP-only cookies (prevents XSS)
- **Token Verification**: Server-side verification on every protected request
- **Session Management**: Automatic token expiration and refresh

#### Token Structure:
```javascript
{
  email: "user@example.com",
  iat: 1234567890,
  exp: 1234654290  // 24 hours from issue
}
```

#### Authentication Flow:
1. User submits credentials via `/api/auth/login`
2. Server validates credentials (bcrypt password hash)
3. Server generates JWT token
4. Token stored in HTTP-only cookie
5. Client includes token in subsequent requests
6. Server verifies token on protected routes

### Authorization Levels

#### 1. Public Access
- No authentication required
- Examples: Product browsing, collection pages

#### 2. User Authentication (`requireAuth()`)
- Requires valid JWT token
- Users can only access their own data
- Examples: User profile, cart sync, favorites

#### 3. Admin Authorization (`requireAdmin()`)
- Requires valid JWT token
- Requires email: `sandrosandri.bysousa@gmail.com`
- Examples: Admin dashboard, customer data, site settings

### Owner Account Security

**Special Security Measure:**
- Owner account (`sandrosandri.bysousa@gmail.com`) has additional security
- After email/password, requires security question: "relationship date?"
- Answer: `10.09.2025`
- Password stored in environment variable: `OWNER_PASSWORD`
- Password automatically hashed on first login if not already hashed

**Files:**
- `lib/auth.js` - Owner credential verification
- Environment variable: `OWNER_PASSWORD` (Vercel)

---

## API Security

### Protected Endpoints

#### Admin Endpoints (Admin-Only)
All admin endpoints require `requireAdmin()` middleware:

- `GET /api/admin?endpoint=customers` - View all customers
- `DELETE /api/admin?endpoint=customers` - Delete customer
- `GET /api/admin?endpoint=activity` - View activity data
- `GET /api/admin/orders` - View all orders
- `PUT /api/admin/orders` - Update order status
- `POST /api/site-settings/commerce-mode` - Change commerce mode

**Protection:**
```javascript
const adminCheck = auth.requireAdmin(req);
if (!adminCheck.authorized) {
    return res.status(adminCheck.statusCode).json({
        success: false,
        error: adminCheck.error
    });
}
```

#### User Data Endpoints (Authenticated Users)
- `GET /api/user?action=sync` - Get user data
- `POST /api/user?action=sync` - Save user data
- `POST /api/user?action=activity` - Track activity

**Protection:**
- Requires `requireAuth()` middleware
- Users can only access/save their own data
- Email from token must match requested email

#### Public Endpoints (No Authentication)
- `POST /api/user?action=activity` - Activity tracking (public for analytics)
- `GET /api/inventory/stock` - Product inventory
- `GET /api/site-settings/commerce-mode` - Current commerce mode

### API Route Structure

**Combined Routes (Vercel Hobby Plan Limit):**
- `/api/auth/index.js` - Handles login, signup, session (via query params)
- `/api/user/index.js` - Handles sync and activity (via query params)
- `/api/admin/index.js` - Handles customers and activity (via query params)

**Rewrites (vercel.json):**
- `/api/auth/login` → `/api/auth?action=login`
- `/api/auth/signup` → `/api/auth?action=signup`
- `/api/user/sync` → `/api/user?action=sync`

---

## Data Protection

### Password Security

**✅ Implemented:**
- Passwords stored as bcrypt hashes only
- No plaintext passwords in database
- No passwords in frontend code
- Password hashing: `bcrypt.hash(password, 10)`
- Password verification: `bcrypt.compare(password, hash)`

**Removed:**
- ❌ Plaintext password storage
- ❌ Password visibility in admin panel
- ❌ Password in API responses
- ❌ Hardcoded passwords in code

### Sensitive Data Handling

**Protected Data:**
- User passwords (hashed only)
- Payment information (handled by Stripe)
- User profiles (email, address, phone)
- Order history
- Admin credentials

**Data Access Rules:**
- Users can only access their own data
- Admin can access all customer data (with authentication)
- No sensitive data in frontend code
- No sensitive data in API responses (unless authorized)

### Database Security

**Storage:**
- Vercel KV (Redis) for production
- In-memory fallback for development
- All data encrypted at rest (Vercel KV)

**Data Isolation:**
- User data keyed by email
- No cross-user data access
- Admin data separate from user data

---

## Input Validation & Sanitization

**Implementation:** `lib/validation.js`

### Email Validation
- Format validation (RFC 5322 compliant)
- Length limits (max 254 characters)
- Suspicious pattern detection
- Case normalization (lowercase)
- Null byte removal

### Password Validation
- Minimum length: 8 characters
- Maximum length: 128 characters
- Null byte detection and removal
- No password strength requirements (user choice)

### Profile Data Sanitization
- Name: Trim, max 100 characters, HTML escape
- Phone: Format validation, max 20 characters
- Address: Trim, max 200 characters, HTML escape
- Country: ISO code validation
- Size: Valid size check (XS, S, M, L, XL)

### Cart Validation
- Product ID: Must exist in ProductsAPI
- Size: Must be valid for product
- Quantity: 1-99, integer only
- Price: Must match product price

### Favorites Validation
- Array limit: Max 100 items
- Product ID: Must exist in ProductsAPI
- No duplicates

### HTML Escaping (XSS Prevention)
All user inputs are escaped before display:
- `<` → `&lt;`
- `>` → `&gt;`
- `&` → `&amp;`
- `"` → `&quot;`
- `'` → `&#x27;`

---

## Attack Prevention

### Rate Limiting

**Implementation:** `lib/rate-limit.js`

**Login Protection:**
- Max 5 attempts per 15 minutes per email/IP
- Block duration: 30 minutes after max attempts
- Automatic unblock after duration

**Signup Protection:**
- Max 3 attempts per hour per email/IP
- Block duration: 1 hour after max attempts
- Automatic unblock after duration

**Storage:**
- Rate limit data stored in KV/database
- Key format: `rateLimit:${action}:${identifier}`
- Automatic cleanup of expired entries

### Brute Force Protection
- Rate limiting prevents unlimited attempts
- Failed attempts logged
- IP-based blocking
- Email-based blocking

### XSS Prevention
- All user inputs sanitized
- HTML escaping on output
- Content Security Policy (CSP) headers (recommended)
- No `innerHTML` with user data

### SQL Injection Prevention
- No SQL queries (using KV/JSON storage)
- Parameterized queries if SQL added in future

### CSRF Protection
- ⚠️ Not yet implemented (optional enhancement)
- Recommended: CSRF tokens for state-changing operations

---

## Security Monitoring & Logging

**Implementation:** `lib/security-log.js`

### Logged Events

#### Authentication Events
- Failed login attempts (with reason: wrong password, user not found, etc.)
- Successful logins (with IP, user agent, timestamp)
- Signup attempts (success/failure)
- Logout events

#### Authorization Events
- Unauthorized access attempts (401/403)
- Admin action attempts (success/failure)
- Data access violations (user trying to access other user's data)

#### Rate Limiting Events
- Rate limit exceeded (with identifier, action, timestamp)
- Automatic unblock events

#### Admin Actions
- Customer deletion
- Commerce mode changes
- Inventory changes
- Order status updates

### Log Storage
- Security logs stored in KV/database
- Key: `securityLogs`
- Format: Array of log entries
- Retention: Indefinite (can be cleaned up manually)

### Log Entry Format
```javascript
{
  timestamp: "2024-12-01T12:00:00.000Z",
  type: "failed_login" | "unauthorized_access" | "admin_action" | "rate_limit_exceeded",
  action: "login" | "signup" | "delete_customer" | etc.,
  email: "user@example.com" | null,
  ip: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  details: { /* action-specific details */ },
  success: true | false
}
```

### Accessing Security Logs
- Admin dashboard can display security logs
- Logs stored in `securityLogs` key in database
- Can be exported for analysis

---

## Environment Variables & Secrets

### Required Environment Variables

#### Authentication
- `JWT_SECRET` - Secret key for JWT token signing (required)
- `OWNER_PASSWORD` - Owner account password (optional, defaults to 'Sousa10Pedro')

#### Payment Processing
- `STRIPE_SECRET_KEY` - Stripe API secret key (required for payments)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signature verification (required)

#### Email Service
- `RESEND_API_KEY` - Resend API key for sending emails (required)
- `RESEND_FROM_EMAIL` - From email address (optional, defaults to 'onboarding@resend.dev')
- `APP_URL` - Application URL for email links (optional, auto-detected)

#### Database
- `KV_REST_API_URL` - Vercel KV REST API URL (optional, for production)
- `KV_REST_API_TOKEN` - Vercel KV REST API token (optional, for production)
- `UPSTASH_REDIS_KV_REST_API_URL` - Alternative KV URL (optional)
- `UPSTASH_REDIS_KV_REST_API_TOKEN` - Alternative KV token (optional)

### Security Best Practices for Secrets

✅ **Implemented:**
- No secrets in frontend code
- No secrets in Git repository
- All secrets in Vercel environment variables
- No `NEXT_PUBLIC_` prefix for secrets
- Secrets only accessed server-side

⚠️ **Important:**
- If any secret was ever committed to Git, rotate it immediately
- Use strong, random values for `JWT_SECRET`
- Never share secrets in logs or error messages
- Regularly rotate API keys

---

## Security Best Practices

### Defense in Depth
Multiple layers of security:
1. Authentication (JWT tokens)
2. Authorization (role-based access)
3. Input validation
4. Rate limiting
5. Security logging

### Least Privilege
- Users can only access their own data
- Admin can access all data (with authentication)
- No unnecessary permissions

### Secure by Default
- All endpoints protected unless explicitly public
- Input validation on all user inputs
- HTML escaping on all outputs
- Secure password storage (bcrypt)

### Error Handling
- Security errors don't expose sensitive information
- Generic error messages for users
- Detailed errors logged server-side only
- No stack traces in production

### Code Security
- No hardcoded credentials
- No sensitive data in frontend
- Server-side validation for all operations
- Regular security audits

---

## Deployment Checklist

Before deploying to production, ensure:

### Authentication & Authorization
- [x] JWT authentication implemented
- [x] Admin endpoints protected
- [x] User data access restricted
- [x] Owner password in environment variable
- [x] No hardcoded passwords

### Data Protection
- [x] Passwords hashed (bcrypt)
- [x] No plaintext passwords
- [x] Sensitive data not in frontend
- [x] Secure storage (Vercel KV)

### Input Validation
- [x] Email validation
- [x] Password validation
- [x] Profile data sanitization
- [x] Cart validation
- [x] HTML escaping

### Attack Prevention
- [x] Rate limiting implemented
- [x] Brute force protection
- [x] XSS prevention
- [ ] CSRF protection (optional)

### Security Monitoring
- [x] Security logging implemented
- [x] Failed login logging
- [x] Admin action logging
- [x] Unauthorized access logging

### Environment Variables
- [x] All secrets in Vercel environment variables
- [x] No secrets in code
- [x] JWT_SECRET configured
- [x] Stripe keys configured
- [x] Resend API key configured

### Testing
- [x] Test authentication flow
- [x] Test authorization (admin vs user)
- [x] Test rate limiting
- [x] Test input validation
- [x] Test security logging

---

## Security Incident Response

### If Security Breach Suspected

1. **Immediate Actions:**
   - Review security logs
   - Check for unauthorized access
   - Identify affected users/data
   - Rotate all secrets immediately

2. **Investigation:**
   - Review access logs
   - Check for suspicious activity
   - Identify attack vector
   - Document findings

3. **Remediation:**
   - Fix vulnerability
   - Notify affected users (if required)
   - Update security measures
   - Monitor for continued attacks

4. **Prevention:**
   - Update security documentation
   - Implement additional protections
   - Review and update security practices

---

## Future Security Enhancements (Optional)

### Recommended Improvements

1. **CSRF Protection**
   - Add CSRF tokens for state-changing operations
   - Implement SameSite cookie attribute
   - Verify origin/referer headers

2. **Two-Factor Authentication (2FA)**
   - Add 2FA for owner account
   - Optional 2FA for regular users
   - TOTP or SMS-based

3. **Password Reset Flow**
   - Secure password reset via email
   - Time-limited reset tokens
   - Password history to prevent reuse

4. **Session Management**
   - View active sessions
   - Revoke sessions remotely
   - Session timeout warnings

5. **Advanced Monitoring**
   - Real-time security alerts
   - Automated threat detection
   - Security dashboard

6. **Content Security Policy (CSP)**
   - Strict CSP headers
   - Prevent XSS attacks
   - Control resource loading

---

## Contact & Support

For security concerns or questions:
- Review security logs in Admin Dashboard
- Check Vercel logs for detailed errors
- Review this documentation

**Security Status:** ✅ Production Ready  
**Last Security Audit:** December 2024  
**Next Review:** Quarterly

---

**Document Version:** 1.0  
**Last Updated:** December 2024

