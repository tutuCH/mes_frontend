import { useCallback } from 'react'
import { GoogleLogin, GoogleOAuthProvider, useGoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Google Client ID from environment variables
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

interface GoogleAuthButtonProps {
  onSuccess: (idToken: string) => void
  onError?: (error: string) => void
  disabled?: boolean
  className?: string
}

/**
 * Google Sign-In Button Component
 *
 * This component provides Google OAuth 2.0 authentication.
 * It requires VITE_GOOGLE_CLIENT_ID to be set in the environment.
 *
 * The onSuccess callback receives the Google ID token, which should be
 * sent to the backend for verification and JWT token exchange.
 */
function GoogleAuthButtonInner({
  onSuccess,
  onError,
  disabled = false,
  className,
}: GoogleAuthButtonProps) {
  const { t } = useTranslation()

  const handleSuccess = useCallback(
    (credentialResponse: CredentialResponse) => {
      const idToken = credentialResponse.credential
      if (idToken) {
        onSuccess(idToken)
      } else {
        onError?.(t('auth.googleSignInFailed'))
      }
    },
    [onSuccess, onError, t]
  )

  const handleError = useCallback(() => {
    onError?.(t('auth.googleSignInFailed'))
  }, [onError, t])

  // If no Google Client ID is configured, show a placeholder
  if (!GOOGLE_CLIENT_ID) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled
        className={cn('w-full', className)}
      >
        <GoogleIcon className="mr-2 h-4 w-4" />
        {t('auth.googleNotConfigured')}
      </Button>
    )
  }

  // If disabled, show a disabled button
  if (disabled) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled
        className={cn('w-full', className)}
      >
        <GoogleIcon className="mr-2 h-4 w-4" />
        {t('auth.continueWithGoogle')}
      </Button>
    )
  }

  return (
    <div className={cn('w-full', className)}>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        useOneTap={false}
        auto_select={false}
        context="signin"
        theme="outline"
        size="large"
        width="100%"
        text="signin_with"
        shape="rectangular"
      />
    </div>
  )
}

/**
 * Wrapped Google Auth Button with OAuth Provider
 */
export function GoogleAuthButton(props: GoogleAuthButtonProps) {
  if (!GOOGLE_CLIENT_ID) {
    return <GoogleAuthButtonInner {...props} />
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <GoogleAuthButtonInner {...props} />
    </GoogleOAuthProvider>
  )
}

/**
 * Custom styled Google button (alternative to the default Google button)
 */
export function GoogleAuthButtonCustom({
  onSuccess,
  onError,
  disabled = false,
  isLoading = false,
  className,
}: GoogleAuthButtonProps & { isLoading?: boolean }) {
  const { t } = useTranslation()

  // If no Google Client ID is configured, show disabled state
  if (!GOOGLE_CLIENT_ID) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled
        className={cn('w-full', className)}
      >
        <GoogleIcon className="mr-2 h-4 w-4" />
        {t('auth.googleNotConfigured')}
      </Button>
    )
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <GoogleLoginButton
        onSuccess={onSuccess}
        onError={onError}
        disabled={disabled}
        isLoading={isLoading}
        className={className}
      />
    </GoogleOAuthProvider>
  )
}

function GoogleLoginButton({
  onSuccess,
  onError,
  disabled,
  isLoading,
  className,
}: GoogleAuthButtonProps & { isLoading?: boolean }) {
  const { t } = useTranslation()

  const login = useGoogleLogin({
    onSuccess: (response) => {
      // For implicit flow, we get access_token
      // For authorization code flow, we'd get code
      if (response.access_token) {
        onSuccess(response.access_token)
      }
    },
    onError: () => {
      onError?.(t('auth.googleSignInFailed'))
    },
    flow: 'implicit',
  })

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => login()}
      disabled={disabled || isLoading}
      className={cn('w-full', className)}
    >
      <GoogleIcon className="mr-2 h-4 w-4" />
      {isLoading ? t('auth.signingIn') : t('auth.continueWithGoogle')}
    </Button>
  )
}

// Google "G" logo SVG
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}
