import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '@/services/api'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'operator' | 'manager'
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
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
          const profile = await api.getProfile() as any
          setUser({
            id: profile.userId.toString(),
            name: profile.username,
            email: profile.email,
            role: profile.accessLevel === 'admin' ? 'admin' : 'operator' // Map roles
          })
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
      const profile = await api.getProfile() as any
      
      setUser({
        id: profile.userId.toString(),
        name: profile.username,
        email: profile.email,
        role: profile.accessLevel === 'admin' ? 'admin' : 'operator'
      })
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const logout = () => {
    api.setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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
