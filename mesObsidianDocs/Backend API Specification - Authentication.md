# Backend API Specification - Authentication

This document specifies the expected backend API endpoints for the MES Dashboard authentication system. The frontend is already implemented and expects these endpoints to be available.

---

## Base URL

```
VITE_API_URL (default: http://localhost:3000)
```

All endpoints are relative to this base URL.

---

## Authentication Endpoints

### 1. Login

Authenticates a user with email and password.

**Endpoint:** `POST /auth/login`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**Error Responses:**

| Status | Body | Description |
|--------|------|-------------|
| 401 | `{ "statusCode": 401, "message": "Invalid credentials" }` | Wrong email or password |
| 401 | `{ "statusCode": 401, "message": "Email not verified" }` | User hasn't verified email |
| 429 | `{ "statusCode": 429, "message": "Too many attempts" }` | Rate limit exceeded |

---

### 2. Sign Up

Registers a new user account.

**Endpoint:** `POST /auth/signup`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (201):**
```json
{
  "message": "Account created successfully. Please verify your email.",
  "userId": 123,
  "email": "john@example.com"
}
```

**Error Responses:**

| Status | Body | Description |
|--------|------|-------------|
| 400 | `{ "statusCode": 400, "message": "Invalid email format" }` | Validation error |
| 400 | `{ "statusCode": 400, "message": "Password too weak" }` | Password requirements not met |
| 409 | `{ "statusCode": 409, "message": "Email already registered" }` | Duplicate email |

**Notes:**
- After signup, the backend should send a verification email
- User cannot login until email is verified
- Password should be hashed with bcrypt or argon2

---

### 3. Google SSO Login

Authenticates a user via Google OAuth.

**Endpoint:** `POST /auth/google`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6..."
}
```

The `idToken` is the Google ID token received from the Google Sign-In button on the frontend.

**Success Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "id": 123,
    "email": "user@gmail.com",
    "name": "John Doe",
    "role": "operator"
  }
}
```

**Error Responses:**

| Status | Body | Description |
|--------|------|-------------|
| 400 | `{ "statusCode": 400, "message": "Invalid token" }` | Token verification failed |
| 401 | `{ "statusCode": 401, "message": "Token expired" }` | Google token expired |

**Backend Implementation Notes:**

1. Verify the Google ID token using Google's library:
   ```typescript
   import { OAuth2Client } from 'google-auth-library';

   const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

   async function verifyGoogleToken(idToken: string) {
     const ticket = await client.verifyIdToken({
       idToken,
       audience: process.env.GOOGLE_CLIENT_ID,
     });
     return ticket.getPayload();
   }
   ```

2. Check if user exists by email:
   - If exists: Return JWT token
   - If not exists: Create new user with default role, then return JWT token

3. Google users are considered email-verified automatically

---

### 4. Verify Email

Verifies a user's email address using the token from the verification email.

**Endpoint:** `GET /auth/verify-email`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| token | string | Yes | Verification token from email |

**Example:** `GET /auth/verify-email?token=abc123xyz`

**Success Response (200):**
```json
{
  "message": "Email verified successfully",
  "email": "user@example.com"
}
```

**Error Responses:**

| Status | Body | Description |
|--------|------|-------------|
| 400 | `{ "statusCode": 400, "message": "Invalid verification link" }` | Token invalid |
| 400 | `{ "statusCode": 400, "message": "Verification link expired" }` | Token expired |
| 400 | `{ "statusCode": 400, "message": "Email already verified" }` | Already verified |

**Notes:**
- Token should expire after 24 hours
- Token should be single-use

---

### 5. Forgot Password

Initiates the password reset process by sending a reset email.

**Endpoint:** `POST /auth/forgot-password`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "message": "Password reset email sent"
}
```

**Notes:**
- Always return 200 even if email doesn't exist (prevents email enumeration)
- Send email with reset link: `https://your-domain.com/reset-password?token=xxx`
- Token should expire after 1 hour
- Token should be single-use

---

### 6. Reset Password

Resets the user's password using the token from the reset email.

**Endpoint:** `POST /auth/reset-password`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewSecurePass456!"
}
```

**Success Response (200):**
```json
{
  "message": "Password reset successful"
}
```

**Error Responses:**

| Status | Body | Description |
|--------|------|-------------|
| 400 | `{ "statusCode": 400, "message": "Invalid or expired token" }` | Token invalid/expired |
| 400 | `{ "statusCode": 400, "message": "Password too weak" }` | Requirements not met |

---

### 7. Get Profile

Gets the current user's profile information.

**Endpoint:** `GET /auth/profile`

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "userId": 123,
  "username": "John Doe",
  "email": "john@example.com",
  "accessLevel": "admin",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-20T14:22:00Z"
}
```

**Error Responses:**

| Status | Body | Description |
|--------|------|-------------|
| 401 | `{ "statusCode": 401, "message": "Unauthorized" }` | Invalid/expired token |

**Notes:**
- The `accessLevel` field is mapped to roles in the frontend:
  - `admin` → Full access
  - `operator` → Standard access
  - `manager` → Manager access

---

### 8. Update Profile

Updates the current user's profile information.

**Endpoint:** `PUT /auth/profile`

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "John Smith",
  "email": "john.smith@example.com"
}
```

**Success Response (200):**
```json
{
  "userId": 123,
  "username": "John Smith",
  "email": "john.smith@example.com",
  "accessLevel": "admin"
}
```

**Error Responses:**

| Status | Body | Description |
|--------|------|-------------|
| 400 | `{ "statusCode": 400, "message": "Email already in use" }` | Duplicate email |
| 401 | `{ "statusCode": 401, "message": "Unauthorized" }` | Invalid token |

---

### 9. Change Password

Changes the current user's password.

**Endpoint:** `PUT /auth/change-password`

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword456!"
}
```

**Success Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

**Error Responses:**

| Status | Body | Description |
|--------|------|-------------|
| 400 | `{ "statusCode": 400, "message": "Current password incorrect" }` | Wrong password |
| 400 | `{ "statusCode": 400, "message": "New password too weak" }` | Requirements not met |
| 401 | `{ "statusCode": 401, "message": "Unauthorized" }` | Invalid token |

---

## JWT Token Structure

The JWT access token should contain:

```json
{
  "sub": "123",
  "email": "user@example.com",
  "role": "admin",
  "iat": 1705312200,
  "exp": 1705315800
}
```

| Field | Description |
|-------|-------------|
| sub | User ID |
| email | User email |
| role | User role (admin, operator, manager) |
| iat | Issued at timestamp |
| exp | Expiration timestamp |

---

## Password Requirements

The backend should enforce these password requirements:

- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 special character (!@#$%^&*(),.?":{}|<>)

---

## Rate Limiting Recommendations

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /auth/login | 5 requests | 1 minute |
| POST /auth/signup | 3 requests | 1 hour |
| POST /auth/forgot-password | 3 requests | 1 hour |
| POST /auth/google | 10 requests | 1 minute |

---

## Email Templates Required

### 1. Email Verification

**Subject:** Verify your MES Dashboard account

**Content should include:**
- Welcome message
- Verification link: `https://your-domain.com/verify-email?token=xxx`
- Link expiration notice (24 hours)
- Support contact

### 2. Password Reset

**Subject:** Reset your MES Dashboard password

**Content should include:**
- Password reset request notice
- Reset link: `https://your-domain.com/reset-password?token=xxx`
- Link expiration notice (1 hour)
- Security warning (ignore if not requested)
- Support contact

---

## Security Checklist

- [ ] Hash passwords with bcrypt (cost factor 12) or argon2
- [ ] Use HTTPS in production
- [ ] Implement rate limiting
- [ ] Log failed login attempts
- [ ] Use secure random tokens for verification/reset
- [ ] Set appropriate CORS headers
- [ ] Validate all inputs on the server
- [ ] Sanitize data before database queries
- [ ] Use parameterized queries to prevent SQL injection
- [ ] Set secure JWT secret (256+ bits)
- [ ] Implement token refresh mechanism (optional but recommended)

---

## Environment Variables

Backend should have these environment variables:

```env
# JWT Configuration
JWT_SECRET=your-secure-secret-key-min-256-bits
JWT_EXPIRES_IN=1h

# Google OAuth (for token verification)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Email Service
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=your-smtp-password

# Frontend URL (for email links)
FRONTEND_URL=https://your-domain.com
```

---

## TypeScript Types Reference

```typescript
// Request Types
interface LoginRequest {
  email: string;
  password: string;
}

interface SignUpRequest {
  name: string;
  email: string;
  password: string;
}

interface GoogleLoginRequest {
  idToken: string;
}

interface ForgotPasswordRequest {
  email: string;
}

interface ResetPasswordRequest {
  token: string;
  password: string;
}

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

interface UpdateProfileRequest {
  name?: string;
  email?: string;
}

// Response Types
interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface SignUpResponse {
  message: string;
  userId: number;
  email: string;
}

interface UserProfile {
  userId: number;
  username: string;
  email: string;
  accessLevel: 'admin' | 'operator' | 'manager';
  createdAt?: string;
  updatedAt?: string;
}

interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}
```
