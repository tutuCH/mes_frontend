/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  confirmResetPassword as amplifyConfirmResetPassword,
  confirmSignUp as amplifyConfirmSignUp,
  fetchAuthSession,
  fetchUserAttributes,
  getCurrentUser,
  resetPassword as amplifyResetPassword,
  resendSignUpCode as amplifyResendSignUpCode,
  signIn as amplifySignIn,
  signInWithRedirect,
  signOut as amplifySignOut,
  signUp as amplifySignUp,
  updatePassword as amplifyUpdatePassword,
  updateUserAttributes,
} from 'aws-amplify/auth'
import { toast } from 'sonner'

import { api } from '@/services/api'
import { setAccessTokenProvider } from '@/services/apiClient'
import type { BackendUser, ChangePasswordRequest, UpdateProfileRequest } from '@/types/api'
import { t } from '@/utils/i18n'
import { createLogger } from '@/utils/logger'

import { mapAuthErrorMessage } from './authErrors'

const logger = createLogger('AuthProvider')

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface AppUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'operator' | 'manager'
  phoneNumber?: string
}

interface AuthContextType {
  user: AppUser | null
  authStatus: AuthStatus
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signUp: (name: string, email: string, password: string, phoneNumber: string) => Promise<void>
  confirmSignUp: (email: string, code: string) => Promise<void>
  resendSignUpCode: (email: string) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  confirmResetPassword: (email: string, code: string, newPassword: string) => Promise<void>
  getIdToken: () => Promise<string | null>
  getAccessToken: () => Promise<string | null>
  getAuthorizationHeader: () => Promise<Record<string, string>>
  updateProfile: (data: UpdateProfileRequest) => Promise<void>
  updatePhoneNumber: (phoneNumber: string) => Promise<void>
  changePassword: (data: ChangePasswordRequest) => Promise<void>
  refreshProfile: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  googleLogin: () => Promise<void>
}

function getEpochSecondsString() {
  return Math.floor(Date.now() / 1000).toString()
}

export function buildCognitoSignUpAttributes(name: string, email: string, phoneNumber: string) {
  return {
    email,
    name,
    phone_number: phoneNumber,
    updated_at: getEpochSecondsString(),
  }
}

export function buildCognitoPhoneUpdateAttributes(phoneNumber: string) {
  return {
    phone_number: phoneNumber,
    updated_at: getEpochSecondsString(),
  }
}

function mapBackendRoleToFrontend(accessLevel: BackendUser['accessLevel']): AppUser['role'] {
  switch (accessLevel) {
    case 'admin':
      return 'admin'
    case 'maintenance':
    case 'quality':
      return 'manager'
    case 'operator':
    case 'viewer':
    default:
      return 'operator'
  }
}

function mapBackendUser(backendUser: BackendUser, phoneNumber?: string): AppUser {
  return {
    id: backendUser.userId.toString(),
    name: backendUser.username,
    email: backendUser.email,
    role: mapBackendRoleToFrontend(backendUser.accessLevel),
    phoneNumber,
  }
}

function toAuthError(error: unknown): Error {
  const key = mapAuthErrorMessage(error)
  return new Error(t(key))
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading')

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const session = await fetchAuthSession()
      return session.tokens?.accessToken?.toString() ?? null
    } catch {
      return null
    }
  }, [])

  const getIdToken = useCallback(async (): Promise<string | null> => {
    try {
      const session = await fetchAuthSession()
      return session.tokens?.idToken?.toString() ?? null
    } catch {
      return null
    }
  }, [])

  const getAuthorizationHeader = useCallback(async (): Promise<Record<string, string>> => {
    const accessToken = await getAccessToken()

    if (!accessToken) {
      return {}
    }

    return {
      Authorization: `Bearer ${accessToken}`,
    }
  }, [getAccessToken])

  const refreshProfile = useCallback(async () => {
    const [profile, attributes] = await Promise.all([
      api.getProfile(),
      fetchUserAttributes().catch(() => ({} as Record<string, string>)),
    ])
    setUser(mapBackendUser(profile, attributes.phone_number))
    setAuthStatus('authenticated')
  }, [])

  const initializeAuth = useCallback(async () => {
    setAuthStatus('loading')

    try {
      const session = await fetchAuthSession()
      const accessToken = session.tokens?.accessToken?.toString()

      if (!accessToken) {
        setUser(null)
        setAuthStatus('unauthenticated')
        return
      }

      await getCurrentUser()
      await refreshProfile()
    } catch (error) {
      logger.debug('No active auth session found', error)
      setUser(null)
      setAuthStatus('unauthenticated')
    }
  }, [refreshProfile])

  useEffect(() => {
    setAccessTokenProvider(getAccessToken)

    return () => {
      setAccessTokenProvider(async () => null)
    }
  }, [getAccessToken])

  useEffect(() => {
    void initializeAuth()
  }, [initializeAuth])

  const signIn = useCallback(async (email: string, password: string) => {
    setAuthStatus('loading')

    let result: Awaited<ReturnType<typeof amplifySignIn>>
    try {
      result = await amplifySignIn({
        username: email,
        password,
      })
    } catch (error) {
      setAuthStatus('unauthenticated')
      throw toAuthError(error)
    }

    if (result.isSignedIn || result.nextStep.signInStep === 'DONE') {
      await refreshProfile()
      return
    }

    setAuthStatus('unauthenticated')

    if (result.nextStep.signInStep === 'CONFIRM_SIGN_UP') {
      throw new Error(t('auth.errors.userNotConfirmed'))
    }

    if (result.nextStep.signInStep === 'RESET_PASSWORD') {
      throw new Error(t('auth.errors.resetPasswordRequired'))
    }

    throw new Error(t('auth.errors.signInNotComplete'))
  }, [refreshProfile])

  const signOut = useCallback(async () => {
    try {
      await amplifySignOut()
      toast.success(t('auth.signOutSuccess'))
    } catch (error) {
      logger.error('Sign out failed', error)
      throw toAuthError(error)
    } finally {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_info')
      api.setCSRFToken(null)
      setUser(null)
      setAuthStatus('unauthenticated')
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithRedirect({ provider: 'Google' })
    } catch (error) {
      throw toAuthError(error)
    }
  }, [])

  const signUp = useCallback(async (name: string, email: string, password: string, phoneNumber: string) => {
    try {
      await amplifySignUp({
        username: email,
        password,
        options: {
          userAttributes: buildCognitoSignUpAttributes(name, email, phoneNumber),
        },
      })
    } catch (error) {
      throw toAuthError(error)
    }
  }, [])

  const confirmSignUp = useCallback(async (email: string, code: string) => {
    try {
      await amplifyConfirmSignUp({
        username: email,
        confirmationCode: code,
      })
    } catch (error) {
      throw toAuthError(error)
    }
  }, [])

  const resendSignUpCode = useCallback(async (email: string) => {
    try {
      await amplifyResendSignUpCode({ username: email })
      toast.success(t('auth.verificationCodeResent'))
    } catch (error) {
      throw toAuthError(error)
    }
  }, [])

  const forgotPassword = useCallback(async (email: string) => {
    try {
      await amplifyResetPassword({ username: email })
    } catch (error) {
      throw toAuthError(error)
    }
  }, [])

  const confirmResetPassword = useCallback(async (email: string, code: string, newPassword: string) => {
    try {
      await amplifyConfirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword,
      })
    } catch (error) {
      throw toAuthError(error)
    }
  }, [])

  const updateProfile = useCallback(async (data: UpdateProfileRequest) => {
    const response = await api.updateProfile(data)

    setUser((prevUser) =>
      prevUser
        ? {
          ...prevUser,
          name: response.username || prevUser.name,
          email: response.email || prevUser.email,
        }
        : null
    )
  }, [])

  const updatePhoneNumber = useCallback(async (phoneNumber: string) => {
    try {
      await updateUserAttributes({
        userAttributes: buildCognitoPhoneUpdateAttributes(phoneNumber),
      })

      setUser((prevUser) =>
        prevUser
          ? {
            ...prevUser,
            phoneNumber,
          }
          : null
      )
    } catch (error) {
      throw toAuthError(error)
    }
  }, [])

  const changePassword = useCallback(async (data: ChangePasswordRequest) => {
    try {
      await amplifyUpdatePassword({
        oldPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      toast.success(t('settings.personal.alerts.passwordChanged'))
    } catch (error) {
      throw toAuthError(error)
    }
  }, [])

  const value: AuthContextType = {
    user,
    authStatus,
    isLoading: authStatus === 'loading',
    signIn,
    signOut,
    signInWithGoogle,
    signUp,
    confirmSignUp,
    resendSignUpCode,
    forgotPassword,
    confirmResetPassword,
    getIdToken,
    getAccessToken,
    getAuthorizationHeader,
    updateProfile,
    updatePhoneNumber,
    changePassword,
    refreshProfile,
    login: signIn,
    logout: signOut,
    googleLogin: signInWithGoogle,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
