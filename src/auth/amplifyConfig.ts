import { Amplify } from 'aws-amplify'

const region = import.meta.env.VITE_COGNITO_REGION
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID
const userPoolWebClientId = import.meta.env.VITE_COGNITO_WEB_CLIENT_ID
const cognitoDomain = import.meta.env.VITE_COGNITO_DOMAIN
const redirectSignIn = import.meta.env.VITE_COGNITO_REDIRECT_SIGN_IN || 'http://localhost:5173/login'
const redirectSignOut = import.meta.env.VITE_COGNITO_REDIRECT_SIGN_OUT || 'http://localhost:5173/login'

const requiredCognitoEnv = {
  VITE_COGNITO_REGION: region,
  VITE_COGNITO_USER_POOL_ID: userPoolId,
  VITE_COGNITO_WEB_CLIENT_ID: userPoolWebClientId,
  VITE_COGNITO_DOMAIN: cognitoDomain,
}

export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId: userPoolWebClientId,
      loginWith: {
        email: true,
        oauth: {
          domain: cognitoDomain,
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: [redirectSignIn],
          redirectSignOut: [redirectSignOut],
          responseType: 'code' as const,
          providers: ['Google' as const],
        },
      },
    },
  },
}

let isConfigured = false

export function configureAmplify() {
  if (isConfigured) {
    return
  }

  const missingEnvVars = Object.entries(requiredCognitoEnv)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missingEnvVars.length > 0) {
    const errorMessage =
      `[Auth] Missing required Cognito environment variables: ${missingEnvVars.join(', ')}.`

    if (import.meta.env.DEV) {
      throw new Error(errorMessage)
    }

    console.warn(errorMessage)
  }

  Amplify.configure(amplifyConfig)
  isConfigured = true
}
