import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '@/services/api'
import type { UpdateProfileRequest, ChangePasswordRequest, BackendUser } from '@/types/api'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'operator' | 'manager'
}

// Helper function to map backend accessLevel to frontend role
function mapBackendRoleToFrontend(accessLevel: BackendUser['accessLevel']): User['role'] {
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

// Helper function to map BackendUser to frontend User
function mapBackendUser(backendUser: BackendUser): User {
  return {
    id: backendUser.userId.toString(),
    name: backendUser.username,
    email: backendUser.email,
    role: mapBackendRoleToFrontend(backendUser.accessLevel),
  }
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  googleLogin: (idToken: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
  updateProfile: (data: UpdateProfileRequest) => Promise<void>
  changePassword: (data: ChangePasswordRequest) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const token = api.getToken()
      if (token) {
        try {
          const profile = await api.getProfile()
          setUser(mapBackendUser(profile))
        } catch (error) {
          console.error('Auth check failed:', error)
          api.setToken(null)
        }
      }
      setIsLoading(false)
    }
    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await api.login({ email, password })
      const { access_token } = response

      if (!access_token) {
        throw new Error('Login failed: No access token received')
      }

      api.setToken(access_token)

      // Fetch full profile now that we have the token
      const profile = await api.getProfile()
      setUser(mapBackendUser(profile))
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const googleLogin = async (idToken: string) => {
    try {
      const response = await api.googleLogin(idToken)
      const { access_token } = response

      if (!access_token) {
        throw new Error('Google login failed: No access token received')
      }

      // Token is already set by api.googleLogin
      // Fetch full profile
      const profile = await api.getProfile()
      setUser(mapBackendUser(profile))
    } catch (error) {
      console.error('Google login error:', error)
      throw error
    }
  }

  const signUp = async (name: string, email: string, password: string) => {
    try {
      await api.signUp({ username: name, email, password })
      // After signup, user needs to verify email before logging in
      // So we don't set user or token here
    } catch (error) {
      console.error('Signup error:', error)
      throw error
    }
  }

  const logout = () => {
    api.setToken(null)
    setUser(null)
  }

  const updateProfile = async (data: UpdateProfileRequest) => {
    const response = await api.updateProfile(data)
    setUser(prev => prev ? { ...prev, name: response.username || prev.name, email: response.email || prev.email } : null)
  }

  const changePassword = async (data: ChangePasswordRequest) => {
    await api.changePassword(data)
  }

  const refreshProfile = async () => {
    const profile = await api.getProfile()
    setUser(mapBackendUser(profile))
  }

  return (
    <AuthContext.Provider value={{ user, login, googleLogin, signUp, logout, isLoading, updateProfile, changePassword, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
