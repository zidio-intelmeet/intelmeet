import { createContext, useContext } from 'react'

export type AuthUser = {
  name: string
  email: string
  phone?: string
  address?: string
  about?: string
  avatar?: string | null
}

export type AuthContextValue = {
  user: AuthUser | null
  login: (user: AuthUser) => void
  updateProfile: (profile: Partial<AuthUser>) => void
  logout: () => void
}

export const AUTH_STORAGE_KEY = 'intellmeet-user'

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function normalizeUser(user: AuthUser): AuthUser {
  const email = user.email.trim()
  const fallbackName = email.split('@')[0]?.replace(/[._-]+/g, ' ') || 'IntellMeet User'

  return {
    name: user.name.trim() || fallbackName,
    email,
    phone: user.phone?.trim() || '',
    address: user.address?.trim() || '',
    about: user.about?.trim() || '',
    avatar: user.avatar ?? null,
  }
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
