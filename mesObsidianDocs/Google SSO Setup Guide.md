# Google SSO Setup Guide

This guide explains how to configure Google Sign-In (SSO) for the MES Dashboard application.

## Prerequisites

- A Google account with access to Google Cloud Console
- Admin access to the MES Dashboard application

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top of the page
3. Click **New Project**
4. Enter a project name (e.g., "MES Dashboard")
5. Click **Create**

## Step 2: Enable the Google+ API (Optional)

> Note: For basic OAuth sign-in, this step may not be required as Google Identity Services handles authentication.

1. In the Google Cloud Console, navigate to **APIs & Services** > **Library**
2. Search for "Google+ API"
3. Click on it and then click **Enable**

## Step 3: Configure the OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Select the user type:
   - **Internal**: Only for users within your Google Workspace organization
   - **External**: For any Google account user
3. Click **Create**
4. Fill in the required information:
   - **App name**: MES Dashboard
   - **User support email**: Your support email
   - **Developer contact information**: Your email
5. Click **Save and Continue**
6. On the **Scopes** page, click **Add or Remove Scopes**
7. Select the following scopes:
   - `openid`
   - `email`
   - `profile`
8. Click **Update** and then **Save and Continue**
9. If External, add test users if needed, then click **Save and Continue**
10. Review your settings and click **Back to Dashboard**

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Select **Web application** as the application type
4. Enter a name (e.g., "MES Dashboard Web Client")
5. Under **Authorized JavaScript origins**, add:
   - `http://localhost:5173` (for local development)
   - `https://your-production-domain.com` (for production)
6. Under **Authorized redirect URIs**, add:
   - `http://localhost:5173` (for local development)
   - `https://your-production-domain.com` (for production)
7. Click **Create**
8. Copy the **Client ID** (you'll need this for the frontend configuration)

## Step 5: Configure the Frontend

1. Create or update the `.env` file in the frontend project root:

```env
VITE_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
```

2. Restart the development server for the changes to take effect

## Step 6: Configure the Backend

The backend needs to verify Google ID tokens received from the frontend. The backend should:

1. Receive the Google ID token from the frontend at the `/auth/google` endpoint
2. Verify the token with Google's servers
3. Extract user information (email, name, profile picture)
4. Create or find the user in the database
5. Return a JWT access token

### Backend Implementation Requirements

The `/auth/google` endpoint should:

```typescript
// Expected request body
{
  "idToken": "google-id-token-from-frontend"
}

// Expected response
{
  "access_token": "jwt-token",
  "token_type": "Bearer",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "role": "operator"
  }
}
```

### Verifying the ID Token (Node.js Example)

```typescript
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleToken(idToken: string) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();

  return {
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
    emailVerified: payload.email_verified,
  };
}
```

## Security Considerations

### Token Verification

- Always verify Google ID tokens on the backend
- Never trust the frontend alone for authentication
- Check that the token's `aud` (audience) matches your client ID
- Verify the token's `iss` (issuer) is `accounts.google.com` or `https://accounts.google.com`

### User Management

- Decide how to handle new users signing in with Google:
  - **Auto-create**: Automatically create a new user account
  - **Pre-registration required**: Only allow existing users to sign in
  - **Domain restriction**: Only allow users from specific email domains

### HTTPS Requirement

- Google OAuth requires HTTPS in production
- Use valid SSL certificates
- Redirect HTTP to HTTPS

## Troubleshooting

### "popup_closed_by_user" Error

- User closed the popup before completing sign-in
- Not an error; handle gracefully

### "idpiframe_initialization_failed" Error

- Third-party cookies may be blocked
- Ensure cookies are enabled in the browser
- Check that the authorized origins are correctly configured

### "invalid_client" Error

- Verify the Client ID is correct
- Check that the authorized origins match your domain exactly
- Ensure there are no trailing slashes in the origins

### Token Verification Fails

- Ensure the backend is using the same Client ID
- Check that the token hasn't expired
- Verify the token was received correctly (no truncation)

## Testing

1. Start the frontend application
2. Navigate to the login page
3. Click the "Continue with Google" button
4. Select your Google account
5. Verify you're redirected to the dashboard
6. Check the browser console for any errors

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID | `123456789.apps.googleusercontent.com` |

## Related Documentation

- [Google Identity Services Documentation](https://developers.google.com/identity/gsi/web)
- [OAuth 2.0 for Client-side Web Applications](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow)
- [@react-oauth/google Package](https://www.npmjs.com/package/@react-oauth/google)
