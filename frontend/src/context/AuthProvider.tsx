import { useEffect, useMemo, type ReactNode } from 'react';
import { useAuthStore } from '../stores/authStore';
import { AuthContext, type AuthContextValue } from './auth';

/**
 * AuthProvider - Initializes authentication on app startup
 * 
 * Flow on page load:
 * 1. Component mounts
 * 2. Call checkAuth() - tries to refresh token using refresh token cookie
 * 3. If successful: access token + user data restored
 * 4. If failed: user stays logged out
 * 
 * This enables persistent login like YouTube - close browser, come back, still logged in!
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const logout = useAuthStore((state) => state.logout);

  // Initialize auth on app startup - restore session from refresh token cookie
  useEffect(() => {
    checkAuth().catch(console.error);
  }, [checkAuth]);

  // Provide auth context to all child components
  const contextValue: AuthContextValue = useMemo(() => ({
    user: user || null,
    // These connect directly to store methods which handle API calls
    login: (email: string, password: string) => login(email, password),
    register: (name: string, email: string, password: string) => register(name, email, password),
    logout,
    updateProfile: async (profile) => {
      // Placeholder - would update user profile via API
      console.log('Update profile:', profile);
    },
  }), [user, login, register, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
