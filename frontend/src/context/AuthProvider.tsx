import { useEffect, useMemo, type ReactNode } from 'react';
import { useAuthStore } from '../stores/authStore';
import { updateCredential } from '../lib/authCredentials';
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
  const updateStoreProfile = useAuthStore((state) => state.updateProfile);

  // Initialize auth on app startup - restore session from refresh token cookie
  useEffect(() => {
    checkAuth().catch(console.error);

    // Silent background auto-refresh every 10 minutes to keep session alive and prevent db sleeps
    const interval = setInterval(() => {
      const { isAuthenticated, refreshTokens } = useAuthStore.getState();
      if (isAuthenticated) {
        refreshTokens().catch(console.error);
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkAuth]);

  // Provide auth context to all child components
  const contextValue: AuthContextValue = useMemo(() => ({
    user: user || null,
    // These connect directly to store methods which handle API calls
    login: (email: string, password: string) => login(email, password),
    register: (name: string, email: string, password: string, role: 'Admin' | 'Member') => register(name, email, password, role),
    logout,
    updateProfile: async (profile) => {
      if (!user) return;
      updateStoreProfile(profile);
      updateCredential(user.email, profile);
    },
  }), [user, login, register, logout, updateStoreProfile]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
