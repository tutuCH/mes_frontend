# GCP OAuth 2.0 Setup Guide

## Current Configuration

| Property | Value |
|----------|-------|
| **GCP Project ID** | `harrytucvmesdashbaord` |
| **Project Name** | `harrytuCvMesDashbaord` |
| **OAuth Client Name** | `mesDashboardDit` |
| **Client ID** | `783822294762-01s3o41674u5lk07vvrbmho3lih7keab.apps.googleusercontent.com` |
| **Client Secret** | `<CLIENT_SECRET_KEY_****tDVL>` |
| **Authorized JavaScript Origins** | `http://localhost:5173` |
| **Authorized Redirect URIs** | ⚠️ **NOT SET** |

---

## Action Items

### 1. Set Up Authorized Redirect URIs (REQUIRED)

Without setting redirect URIs, **Google OAuth will NOT work**. You will receive a `redirect_uri_mismatch` error.

#### Steps to Add Redirect URIs:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: `harrytuCvMesDashbaord`
3. Navigate to: **APIs & Services** → **Credentials**
4. Click on OAuth 2.0 Client ID: `mesDashboardDit`
5. Under **Authorized redirect URIs**, add the following:

| Environment | Redirect URI |
|-------------|--------------|
| Development | `http://localhost:5173/auth/callback` |
| Production | `https://your-domain.com/auth/callback` |

6. Click **Save**

#### Why This Is Required:

When a user clicks "Sign in with Google", Google redirects back to your application with an authorization code. If the redirect URI is not pre-authorized, Google rejects the redirect for security reasons.

---

### 2. Configure Environment Variables

Create or update your `.env.development` and `.env.production` files:

#### Frontend Environment Variables

```bash
# .env.development
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000

# Google OAuth (Frontend)
VITE_GOOGLE_CLIENT_ID=783822294762-01s3o41674u5lk07vvrbmho3lih7keab.apps.googleusercontent.com
```

```bash
# .env.production
VITE_API_URL=https://your-api-domain.com
VITE_WS_URL=https://your-api-domain.com

# Google OAuth (Frontend)
VITE_GOOGLE_CLIENT_ID=783822294762-01s3o41674u5lk07vvrbmho3lih7keab.apps.googleusercontent.com
```

#### Backend Environment Variables

```bash
# .env (Backend)

# Google OAuth (Backend - PKCE Flow)
GOOGLE_CLIENT_ID=783822294762-01s3o41674u5lk07vvrbmho3lih7keab.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<CLIENT_SECRET_KEY_****tDVL>
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/callback

# For production, update:
# GOOGLE_REDIRECT_URI=https://your-domain.com/auth/callback

# Security Secrets
JWT_SECRET=generate-a-secure-random-string-here
CSRF_SECRET=generate-another-secure-random-string-here

# Session
SESSION_SECRET=generate-session-secret-here
```

---

### 3. Generate Secure Secrets

The `JWT_SECRET`, `CSRF_SECRET`, and `SESSION_SECRET` must be cryptographically secure random strings.

#### Generate Secrets (Node.js):

```javascript
// Run this in Node.js to generate secrets
const crypto = require('crypto');

console.log('JWT_SECRET:', crypto.randomBytes(64).toString('hex'));
console.log('CSRF_SECRET:', crypto.randomBytes(64).toString('hex'));
console.log('SESSION_SECRET:', crypto.randomBytes(64).toString('hex'));
```

#### Generate Secrets (Python):

```python
import secrets

print(f"JWT_SECRET: {secrets.token_hex(64)}")
print(f"CSRF_SECRET: {secrets.token_hex(64)}")
print(f"SESSION_SECRET: {secrets.token_hex(64)}")
```

#### Generate Secrets (macOS/Linux):

```bash
# JWT_SECRET
openssl rand -hex 64

# CSRF_SECRET
openssl rand -hex 64

# SESSION_SECRET
openssl rand -hex 64
```

---

## What Happens If You Don't Set These Keys?

### 🔴 Critical Issues (App Will NOT Work)

| Missing Key | Impact | Error Message |
|-------------|--------|---------------|
| **Authorized Redirect URIs** | ❌ Google OAuth completely broken | `Error 400: redirect_uri_mismatch` |
| **GOOGLE_CLIENT_SECRET** (Backend) | ❌ Cannot exchange authorization code | `invalid_client` or `unauthorized_client` |
| **JWT_SECRET** | ❌ Cannot sign/verify JWT tokens | `jwt secret not found` or `invalid signature` |

### 🟡 Medium Issues (Reduced Security)

| Missing Key | Impact | Risk |
|-------------|--------|------|
| **CSRF_SECRET** | CSRF protection may not work properly | Cross-Site Request Forgery attacks possible |
| **SESSION_SECRET** | Session management may fail | Session hijacking possible |

### 🟢 Low Impact (Development Only)

| Missing Key | Impact | Risk |
|-------------|--------|------|
| **VITE_GOOGLE_CLIENT_ID** (Frontend) | Google Sign-In button not shown | No authentication, but app still works |

---

## Detailed Impact Analysis

### Issue 1: Missing Authorized Redirect URIs

**Symptoms:**
- User clicks "Continue with Google"
- Google shows error page: `Error 400: redirect_uri_mismatch`
- User cannot sign in

**Root Cause:**
Google requires pre-authorized redirect URIs for security. Without this, anyone could use your Client ID to redirect users to malicious sites.

**Fix:**
Add redirect URIs in Google Cloud Console (see Action Item 1).

---

### Issue 2: Missing GOOGLE_CLIENT_SECRET

**Symptoms:**
- Frontend receives authorization code successfully
- Backend token exchange request fails
- Error: `invalid_client` or `unauthorized_client`

**Root Cause:**
The backend needs the Client Secret to prove it is the legitimate owner of the Client ID when exchanging authorization codes.

**Fix:**
Set `GOOGLE_CLIENT_SECRET` in backend `.env` file.

---

### Issue 3: Missing JWT_SECRET

**Symptoms:**
- Authentication succeeds, but:
  - Generated tokens cannot be verified
  - API requests return `401 Unauthorized`
  - User gets logged out immediately

**Root Cause:**
JWT tokens must be signed with a secret. Without it, the application cannot verify token authenticity.

**Fix:**
Set `JWT_SECRET` in backend `.env` file.

---

### Issue 4: Missing CSRF_SECRET

**Symptoms:**
- State-changing requests (POST/PUT/PATCH/DELETE) may fail
- Errors: `Invalid CSRF token` or `403 Forbidden`

**Root Cause:**
CSRF tokens are used to prevent cross-site request forgery attacks. Without a secret, token generation/validation may fail.

**Fix:**
Set `CSRF_SECRET` in backend `.env` file.

---

## Environment Variable Reference

### Frontend (`.env.development` / `.env.production`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✅ Yes | Backend API base URL |
| `VITE_WS_URL` | ✅ Yes | WebSocket server URL |
| `VITE_GOOGLE_CLIENT_ID` | ✅ Yes | Google OAuth Client ID (for frontend) |

### Backend (`.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CLIENT_ID` | ✅ Yes | Google OAuth Client ID (for backend) |
| `GOOGLE_CLIENT_SECRET` | ✅ Yes | Google OAuth Client Secret |
| `GOOGLE_REDIRECT_URI` | ✅ Yes | Must match authorized redirect URI |
| `JWT_SECRET` | ✅ Yes | Secret for signing JWT tokens |
| `CSRF_SECRET` | ⚠️ Recommended | Secret for CSRF token generation |
| `SESSION_SECRET` | ⚠️ Recommended | Secret for session encryption |

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Add production redirect URI: `https://your-domain.com/auth/callback`
- [ ] Update `GOOGLE_REDIRECT_URI` in production `.env`
- [ ] Generate unique, strong secrets for production (NEVER use development secrets)
- [ ] Store secrets securely (use AWS Secrets Manager, HashiCorp Vault, or similar)
- [ ] Enable HTTPS (required for OAuth in production)
- [ ] Update `VITE_API_URL` and `VITE_WS_URL` to production URLs
- [ ] Test OAuth flow end-to-end in production environment

---

## Testing Your Setup

### 1. Test Redirect URI Configuration

```bash
# Open this URL in your browser
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=783822294762-01s3o41674u5lk07vvrbmho3lih7keab.apps.googleusercontent.com&
  redirect_uri=http://localhost:5173/auth/callback&
  response_type=code&
  scope=email%20profile&
  state=test
```

**Expected Result:** Google consent screen appears
**Error Result:** `Error 400: redirect_uri_mismatch` → Redirect URI not configured

### 2. Test Environment Variables

```bash
# Frontend
echo $VITE_GOOGLE_CLIENT_ID
# Should output: 783822294762-01s3o41674u5lk07vvrbmho3lih7keab.apps.googleusercontent.com

# Backend
echo $GOOGLE_CLIENT_SECRET
# Should output: your-actual-client-secret
```

### 3. Test Complete OAuth Flow

1. Start frontend: `npm run dev`
2. Start backend: `npm start` (or your backend start command)
3. Navigate to `http://localhost:5173/login`
4. Click "Continue with Google"
5. Authorize the application
6. Verify successful login and redirect to dashboard

---

## Troubleshooting

### Error: "redirect_uri_mismatch"

**Cause:** Redirect URI not added to Google Cloud Console
**Fix:** Add `http://localhost:5173/auth/callback` to authorized redirect URIs

### Error: "unauthorized_client"

**Cause:** Client Secret is incorrect or not set
**Fix:** Verify `GOOGLE_CLIENT_SECRET` in backend `.env` matches Google Cloud Console

### Error: "JWT secret not found"

**Cause:** `JWT_SECRET` not set in backend environment
**Fix:** Add `JWT_SECRET` to backend `.env` file

### Error: "Invalid CSRF token"

**Cause:** `CSRF_SECRET` not set or CSRF middleware not configured
**Fix:** Add `CSRF_SECRET` to backend `.env` and ensure CSRF middleware is applied

---

## Quick Start Commands

```bash
# 1. Set up frontend environment
cat > .env.development << EOF
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=783822294762-01s3o41674u5lk07vvrbmho3lih7keab.apps.googleusercontent.com
EOF

# 2. Set up backend environment (replace with actual secrets)
cat > .env << EOF
GOOGLE_CLIENT_ID=783822294762-01s3o41674u5lk07vvrbmho3lih7keab.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<CLIENT_SECRET_KEY_****tDVL>
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/callback
JWT_SECRET=$(openssl rand -hex 64)
CSRF_SECRET=$(openssl rand -hex 64)
SESSION_SECRET=$(openssl rand -hex 64)
EOF

# 3. Start development servers
npm run dev  # Frontend
npm start    # Backend (in separate terminal)
```

---

## Summary

| Action | Priority | Impact If Missing |
|--------|----------|-------------------|
| Set Authorized Redirect URIs | 🔴 Critical | OAuth completely broken |
| Set GOOGLE_CLIENT_SECRET | 🔴 Critical | Cannot exchange auth code |
| Set JWT_SECRET | 🔴 Critical | Cannot verify tokens |
| Set CSRF_SECRET | 🟡 Recommended | CSRF protection may fail |
| Set SESSION_SECRET | 🟡 Recommended | Session issues possible |

**Bottom Line:** You MUST set the Authorized Redirect URIs in Google Cloud Console, or Google OAuth will not work at all. All other secrets should also be set for proper security and functionality.
