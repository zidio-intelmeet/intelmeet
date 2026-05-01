import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, AUTH_STORAGE_KEY, normalizeUser, type AuthUser, type AuthContextValue } from './auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const storedUser = localStorage.getItem(AUTH_STORAGE_KEY)

    if (!storedUser) {
      return null
    }

    try {
      return normalizeUser(JSON.parse(storedUser) as AuthUser)
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      return null
    }
  })

  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
      return
    }

    localStorage.removeItem(AUTH_STORAGE_KEY)
  }, [user])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      login: (nextUser) => setUser(normalizeUser(nextUser)),
      updateProfile: (profile) =>
        setUser((currentUser) => (currentUser ? normalizeUser({ ...currentUser, ...profile }) : currentUser)),
      logout: () => setUser(null),
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
