
# Backend Security Implementation Guide

This document explains the backend implementation requirements for the security features added to the MES Dashboard frontend.

---

## Table of Contents

1. [CSRF Protection](#csrf-protection)
2. [PKCE OAuth Flow](#pkce-oauth-flow)
3. [Security Headers](#security-headers)
4. [Validation Schemas](#validation-schemas)

---

## 1. CSRF Protection

### Overview

The frontend now includes CSRF tokens in state-changing requests (POST, PUT, PATCH, DELETE) via the `X-CSRF-Token` header. The backend must generate and validate these tokens.

### Implementation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CSRF Token Flow                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. CLIENT                          SERVER                         │
│     │                                │                             │
│     │  GET /auth/profile             │                             │
│     │───────────────────────────────>│                             │
│     │                                │ Generate CSRF token          │
│     │<───────────────────────────────│ (UUID or random string)      │
│     │  Set-Cookie: csrf_token=xyz    │                             │
│     │  X-CSRF-Token: xyz             │                             │
│     │                                │                             │
│  2. CLIENT (State Change)           SERVER                         │
│     │                                │                             │
│     │  POST /user                    │                             │
│     │  Header: X-CSRF-Token: xyz     │                             │
│     │  Cookie: csrf_token=xyz        │                             │
│     │───────────────────────────────>│ Validate token matches       │
│     │                                │ (header == cookie)           │
│     │<───────────────────────────────│ 200 OK or 403 Forbidden     │
│     │                                │                             │
└─────────────────────────────────────────────────────────────────────┘
```

### Backend Implementation (Node.js/Express Example)

#### 1. CSRF Token Generation Middleware

```typescript
// src/middleware/csrf.ts
import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

// CSRF token configuration
const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/',
};

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * CSRF middleware - adds token to response
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Generate new token for each request
  const token = generateCSRFToken();

  // Set token in cookie (HttpOnly for security)
  res.cookie(CSRF_COOKIE_NAME, token, CSRF_COOKIE_OPTIONS);

  // Also send token in header for client-side access
  res.setHeader(CSRF_HEADER_NAME, token);

  // Store token in request for validation
  req.csrfToken = token;

  next();
}

/**
 * CSRF validation middleware
 */
export function validateCSRF(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();

  // Skip validation for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }

  // Get tokens from cookie and header
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers?.[CSRF_HEADER_NAME] as string;

  // Validate tokens exist and match
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({
      statusCode: 403,
      message: 'Invalid CSRF token',
      error: 'CSRF validation failed',
    });
  }

  // Optional: Rotate token after successful validation
  const newToken = generateCSRFToken();
  res.cookie(CSRF_COOKIE_NAME, newToken, CSRF_COOKIE_OPTIONS);
  res.setHeader(CSRF_HEADER_NAME, newToken);

  next();
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      csrfToken?: string;
    }
  }
}
```

#### 2. Apply CSRF Middleware

```typescript
// src/app.ts
import express from 'express';
import { csrfProtection, validateCSRF } from './middleware/csrf';

const app = express();

// Parse cookies
import cookieParser from 'cookie-parser';
app.use(cookieParser());

// Apply CSRF protection to all routes
app.use(csrfProtection);

// Validate CSRF for state-changing operations
app.use(validateCSRF);

// Example protected routes
app.post('/api/user', createUserHandler);      // Requires CSRF
app.put('/api/user/:email', updateUserHandler); // Requires CSRF
app.patch('/api/factories/:id', updateFactoryHandler); // Requires CSRF

// GET requests don't require CSRF validation
app.get('/api/factories', getFactoriesHandler);
app.get('/api/user', getUsersHandler);
```

#### 3. Response Format

All responses should include the CSRF token in both the cookie and a response header:

```
HTTP/1.1 200 OK
Set-Cookie: csrf_token=a1b2c3d4e5f6...; Path=/; HttpOnly; SameSite=Strict
X-CSRF-Token: a1b2c3d4e5f6...
Content-Type: application/json

{
  "id": 123,
  "email": "user@example.com",
  "name": "John Doe"
}
```

### Alternative: Using csurf Library

For production, consider using the `csurf` library:

```bash
npm install csurf cookie-parser
```

```typescript
import cookieParser from 'cookie-parser';
import csurf from 'csurf';

app.use(cookieParser());
const csrf = csurf({ cookie: true });

app.use(csrf);

// Error handling for CSRF failures
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      statusCode: 403,
      message: 'Invalid CSRF token',
    });
  }
  next(err);
});
```

---

## 2. PKCE OAuth Flow

### Overview

The current Google OAuth implementation uses the implicit flow, which is less secure. The frontend is ready to migrate to PKCE (Proof Key for Code Exchange), which requires backend implementation of the authorization code exchange.

### Current vs Target Flow

**Current (Implicit Flow - Less Secure):**
```
Client ──────> Google (Authorization)
       <────── Access Token (directly in URL fragment)
```

**Target (PKCE Flow - More Secure):**
```
Client ──────> Google (Authorization) with code_challenge
       <────── Authorization Code
       ───────> Backend (code + code_verifier)
              ───────> Google (Token Exchange)
              <─────── Access Token + Refresh Token
       <─────── Session/JWT
```

### PKCE Implementation Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PKCE OAuth Flow                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. CLIENT PREPATION                                                     │
│     ├─ Generate code_verifier (random 43-128 chars)                    │
│     └─ Generate code_challenge = BASE64URL(SHA256(code_verifier))      │
│                                                                         │
│  2. AUTHORIZATION REQUEST                                               │
│     Client ───────────────────────────────────────────────> Google      │
│     GET /oauth2/v1/authorize?                                           │
│       client_id=CLIENT_ID                                               │
│       &redirect_uri=REDIRECT_URI                                        │
│       &response_type=code                                               │
│       &scope=email profile                                              │
│       &state=RANDOM_STATE                                               │
│       &code_challenge=CHALLENGE                                         │
│       &code_challenge_method=S256                                        │
│                                                                         │
│  3. AUTHORIZATION RESPONSE                                              │
│     Client <───────────────────────────────────────────── Google        │
│     REDIRECT_URI?code=AUTH_CODE&state=RANDOM_STATE                      │
│                                                                         │
│  4. TOKEN EXCHANGE (Backend)                                            │
│     Client ───────────────────────────────────────> Your Backend        │
│     POST /api/auth/google                                               │
│     {                                                                   │
│       "code": "AUTH_CODE_FROM_GOOGLE",                                  │
│       "codeVerifier": "ORIGINAL_CODE_VERIFIER"                          │
│     }                                                                   │
│                                                                         │
│     Your Backend ───────────────────────────────> Google                │
│     POST /token                                                          │
│     {                                                                   │
│       "code": "AUTH_CODE",                                              │
│       "client_id": "CLIENT_ID",                                         │
│       "client_secret": "CLIENT_SECRET",                                 │
│       "redirect_uri": "REDIRECT_URI",                                   │
│       "grant_type": "authorization_code",                               │
│       "code_verifier": "CODE_VERIFIER"                                  │
│     }                                                                   │
│                                                                         │
│     Your Backend <─────────────────────────────── Google                │
│     {                                                                   │
│       "access_token": "ACCESS_TOKEN",                                   │
│       "refresh_token": "REFRESH_TOKEN",                                 │
│       "id_token": "ID_TOKEN",                                           │
│       "expires_in": 3600                                                │
│     }                                                                   │
│                                                                         │
│  5. SESSION CREATION                                                    │
│     Your Backend creates session/JWT and returns to client              │
│                                                                         │
│     Client <───────────────────────────────────── Your Backend         │
│     {                                                                   │
│       "access_token": "JWT_FOR_API",                                    │
│       "user": {                                                         │
│         "id": 123,                                                      │
│         "email": "user@example.com",                                   │
│         "name": "John Doe"                                              │
│       }                                                                 │
│     }                                                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Backend Implementation (Node.js/Express)

#### 1. PKCE Code Verifier/Challenge Utilities

```typescript
// src/utils/pkce.ts
import { createHash, randomBytes } from 'crypto';

/**
 * Generate a code verifier for PKCE
 * Must be 43-128 characters, using [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
 */
export function generateCodeVerifier(): string {
  const length = Math.floor(Math.random() * (128 - 43 + 1)) + 43;
  const random = randomBytes(length);
  return random
    .toString('base64')
    .replace(/\+/g, '~')
    .replace(/\//g, '-')
    .replace(/=/g, '');
}

/**
 * Generate code challenge from verifier
 */
export function generateCodeChallenge(verifier: string): string {
  return createHash('sha256')
    .update(verifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Validate code verifier against challenge
 */
export function verifyCodeChallenge(verifier: string, challenge: string): boolean {
  const computedChallenge = generateCodeChallenge(verifier);
  return computedChallenge === challenge;
}
```

#### 2. Google OAuth Configuration

```typescript
// src/config/googleOAuth.ts
export const googleOAuthConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5173/auth/callback',
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
  scopes: ['openid', 'email', 'profile'],
};
```

#### 3. OAuth Endpoints

```typescript
// src/routes/auth.ts
import { Router } from 'express';
import axios from 'axios';
import { googleOAuthConfig } from '../config/googleOAuth';
import { verifyCodeChallenge } from '../utils/pkce';

const router = Router();

/**
 * POST /api/auth/google
 * Exchange authorization code for tokens using PKCE
 */
router.post('/google', async (req, res) => {
  try {
    const { code, codeVerifier, redirectUri } = req.body;

    // Validate request
    if (!code || !codeVerifier) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Authorization code and verifier are required',
      });
    }

    // Exchange code for tokens with Google
    const tokenResponse = await axios.post(
      googleOAuthConfig.tokenUrl,
      new URLSearchParams({
        code,
        client_id: googleOAuthConfig.clientId,
        client_secret: googleOAuthConfig.clientSecret,
        redirect_uri: redirectUri || googleOAuthConfig.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token, id_token } = tokenResponse.data;

    // Get user info from Google
    const userInfoResponse = await axios.get(googleOAuthConfig.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const googleUser = userInfoResponse.data;

    // Find or create user in database
    const user = await findOrCreateGoogleUser(googleUser);

    // Generate JWT for your application
    const jwtToken = generateAppJWT(user);

    // Return token and user info
    return res.status(200).json({
      access_token: jwtToken,
      refresh_token: refresh_token, // Store for later refresh
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    });

  } catch (error: any) {
    console.error('Google OAuth error:', error.response?.data || error.message);

    return res.status(401).json({
      statusCode: 401,
      message: 'Authentication failed',
      error: error.response?.data?.error_description || 'Invalid authorization code',
    });
  }
});

/**
 * POST /api/auth/google/refresh
 * Refresh access token using refresh token
 */
router.post('/google/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Refresh token is required',
      });
    }

    // Exchange refresh token for new access token
    const tokenResponse = await axios.post(
      googleOAuthConfig.tokenUrl,
      new URLSearchParams({
        refresh_token: refreshToken,
        client_id: googleOAuthConfig.clientId,
        client_secret: googleOAuthConfig.clientSecret,
        grant_type: 'refresh_token',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token: new_refresh_token } = tokenResponse.data;

    return res.status(200).json({
      access_token,
      refresh_token: new_refresh_token || refresh_token,
    });

  } catch (error: any) {
    return res.status(401).json({
      statusCode: 401,
      message: 'Token refresh failed',
    });
  }
});

export default router;
```

#### 4. Frontend Migration Steps

Once backend is ready, update `src/components/auth/GoogleAuthButton.tsx`:

```typescript
// Change the flow from 'implicit' to 'authorization-code'
const login = useGoogleLogin({
  onSuccess: async (response) => {
    // response.code contains the authorization code
    if (response.code) {
      // Send code to backend for exchange
      const result = await api.googleLogin({
        code: response.code,
        codeVerifier: storedCodeVerifier, // Store from PKCE generation
      });
      onSuccess(result.access_token);
    }
  },
  onError: () => {
    onError?.(t('auth.googleSignInFailed'));
  },
  flow: 'authorization-code', // Changed from 'implicit'
});
```

### Google Cloud Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to APIs & Services > Credentials
4. Edit OAuth 2.0 Client ID
5. Add your redirect URI (e.g., `http://localhost:5173/auth/callback`)
6. No additional configuration needed - PKCE is built into OAuth 2.0

---

## 3. Security Headers

### Required Headers

Add these security headers to all responses:

```typescript
// src/middleware/securityHeaders.ts
import { Request, Response, NextFunction } from 'express';

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com",
      "frame-src https://accounts.google.com",
    ].join('; ')
  );

  // Strict Transport Security (HTTPS only)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  next();
}
```

Apply middleware:

```typescript
import { securityHeaders } from './middleware/securityHeaders';

app.use(securityHeaders);
```

---

## 4. Validation Schemas

### Backend Validation

The frontend Zod schemas should be mirrored on the backend. Here are examples:

```typescript
// src/validation/authValidation.ts
import { body, validationResult } from 'express-validator';

export const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
];

export const signUpValidation = [
  body('email')
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[^A-Za-z0-9]/)
    .withMessage('Password must contain at least one special character'),
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
];

export const factoryValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Factory name is required'),
  body('rows')
    .isInt({ min: 1, max: 20 })
    .withMessage('Rows must be between 1 and 20'),
  body('columns')
    .isInt({ min: 1, max: 20 })
    .withMessage('Columns must be between 1 and 20'),
];

// Validation middleware
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      statusCode: 400,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};
```

Usage:

```typescript
import { loginValidation, signUpValidation, factoryValidation, validate } from './validation/authValidation';

// Apply validation to routes
router.post('/auth/login', loginValidation, validate, loginHandler);
router.post('/auth/sign-up', signUpValidation, validate, signUpHandler);
router.post('/factories', factoryValidation, validate, createFactoryHandler);
```

---

## 5. Environment Variables

Add these to your `.env` file:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/callback

# CSRF
CSRF_SECRET=your-random-secret-key-for-additional-security

# Session
SESSION_SECRET=your-random-session-secret
JWT_SECRET=your-jwt-secret-key

# API
API_URL=http://localhost:3000
NODE_ENV=development
```

---

## 6. Testing

### CSRF Testing

```bash
# Should succeed
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Cookie: csrf_token=$(cat csrf_token.txt)"

# Should fail (no CSRF token)
curl -X POST http://localhost:3000/api/user \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Should succeed (with CSRF token)
curl -X POST http://localhost:3000/api/user \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $(cat csrf_token.txt)" \
  -H "Cookie: csrf_token=$(cat csrf_token.txt)" \
  -d '{"email":"test@example.com","password":"Password123!"}'
```

### PKCE Testing

Use the frontend OAuth flow to test:
1. Navigate to login page
2. Click "Continue with Google"
3. Authorize the application
4. Verify successful login and token exchange

---

## Summary Checklist

- [ ] Implement CSRF token generation and validation
- [ ] Add security headers middleware
- [ ] Implement PKCE OAuth endpoints
- [ ] Add backend validation schemas
- [ ] Update Google Cloud Console if needed
- [ ] Test CSRF protection
- [ ] Test PKCE OAuth flow
- [ ] Deploy with environment variables
