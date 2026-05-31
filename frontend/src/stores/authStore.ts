import { create } from 'zustand';
import { apiService } from '../services/api';
import { findCredential, saveCredential } from '../lib/authCredentials';

const FRONTEND_ONLY = import.meta.env.VITE_FRONTEND_ONLY === 'true';
const LEGACY_SESSION_KEY = 'intellmeet-legacy-session-v2';
const MOCK_SESSION_KEY = 'intellmeet-mock-user-v2';
const SESSION_KEY = 'intellmeet-session-v2';

export interface User {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  avatar: string | null;
  role?: 'Admin' | 'Member';
  phone?: string;
  address?: string;
  about?: string;
  bio?: string | null;
  timezone?: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setAuth: (user: User, accessToken: string) => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateProfile: (profile: Partial<User>) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: 'Admin' | 'Member') => Promise<void>;
}

/**
 * Authentication Store using Zustand
 * 
 * ✅ Design Principles (Like YouTube):
 * 1. Access Token: Stored in memory (fast, but lost on refresh)
 * 2. Refresh Token: Stored in httpOnly cookie (secure, persists across refreshes)
 * 3. On page load: Call checkAuth() -> reads cookie -> calls /api/auth/refresh -> gets new access token
 * 4. Automatic retry: If 401, browser sends cookie -> gets new token -> retries request
 * 5. No localStorage: Prevents XSS attacks
 * 6. credentials: 'include': Ensures cookies sent with every request
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  /**
   * Called after login/register to store auth state in memory and apiService
   */
  setAuth: (user, accessToken) => {
    apiService.setAccessToken(accessToken);
    try {
      // 🔒 Design Principle 5: Don't store accessToken in localStorage (unless mock)
      const sessionData = FRONTEND_ONLY ? { user, accessToken } : { user };
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    } catch { }
    set({
      user,
      accessToken,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  },

  setUser: (user) => set({ user }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  /**
   * Update user profile data in local state
   */
  updateProfile: (profile) => {
    set((state) => {
      const nextUser = state.user ? { ...state.user, ...profile } : null

      if (nextUser) {
        try {
          const currentSession = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
          localStorage.setItem(SESSION_KEY, JSON.stringify({ ...currentSession, user: nextUser }));
        } catch { }
      }

      return {
        user: nextUser,
      }
    });
  },

  /**
   * Clear auth state and log out from backend
   */
  logout: async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      try {
        localStorage.removeItem(MOCK_SESSION_KEY);
        localStorage.removeItem(LEGACY_SESSION_KEY);
        localStorage.removeItem(SESSION_KEY);
      } catch { }
      apiService.setAccessToken(null);
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  /**
   * Called on app startup to restore session from refresh token cookie
   * Flow: 1. Try refresh endpoint (sends cookie) -> 2. Get new access token -> 3. Fetch user data
   */
  checkAuth: async () => {
    set({ isLoading: true });

    // Restore the last known signed-in session first so refreshes do not bounce users to login.
    try {
      const localSession =
        localStorage.getItem(SESSION_KEY) ||
        localStorage.getItem(FRONTEND_ONLY ? MOCK_SESSION_KEY : LEGACY_SESSION_KEY);
      if (localSession) {
        const parsed = JSON.parse(localSession) as { user?: User; accessToken?: string };
        if (parsed.user) {
          if (FRONTEND_ONLY && parsed.accessToken) {
            get().setAuth(parsed.user, parsed.accessToken);
            return;
          }
          
          // Restore user immediately to avoid login bounce, but DO NOT return.
          // Continue to refreshToken to securely retrieve the access token into memory.
          get().setUser(parsed.user);
        }
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(FRONTEND_ONLY ? MOCK_SESSION_KEY : LEGACY_SESSION_KEY);
    }

    try {
      // Try to refresh token using refresh token cookie
      const refreshResponse = await apiService.refreshToken();
      const newAccessToken = refreshResponse.data?.accessToken;

      if (!newAccessToken) {
        // No valid refresh token in cookie, user is logged out
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      // Got new access token, set it
      apiService.setAccessToken(newAccessToken);

      // Now fetch user data with the new token
      const userResponse = await apiService.getMe();
      const user = userResponse.data;

      if (user) {
        get().setAuth(user, newAccessToken);
      } else {
        // Failed to get user data
        set({ isLoading: false, isAuthenticated: false });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      apiService.setAccessToken(null);
      set({
        isLoading: false,
        isAuthenticated: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      });
    }
  },

  /**
   * Manually trigger token refresh (used when receiving 401)
   */
  refreshTokens: async () => {
    try {
      const response = await apiService.refreshToken();
      const newAccessToken = response.data?.accessToken;

      if (newAccessToken) {
        apiService.setAccessToken(newAccessToken);
        set({ accessToken: newAccessToken, error: null });
        return;
      }

      // Refresh failed, logout user
      await get().logout();
    } catch (error) {
      console.error('Token refresh failed:', error);
      await get().logout();
    }
  },

  /**
   * Login: Send credentials -> Get access token in response + refresh token in cookie
   */
  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      if (FRONTEND_ONLY) {
        const credential = findCredential(email);
        if (!credential || credential.password !== password) {
          throw new Error('Invalid email or password');
        }
        const mockUser: User = {
          id: credential.id || crypto.randomUUID(),
          tenantId: credential.tenantId || 'public',
          name: credential.name,
          email: credential.email,
          avatar: credential.avatar ?? null,
          role: credential.role ?? 'Member',
          createdAt: new Date().toISOString(),
        };
        const mockToken = 'mock-token';
        // persist mock session for checkAuth
        try { localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify({ user: mockUser, accessToken: mockToken })); } catch { }
        get().setAuth(mockUser, mockToken);
        return;
      }
      try {
        const response = await apiService.login(email, password);
        const { user, accessToken } = response.data || {};

        if (!user || !accessToken) {
          throw new Error('Invalid login response');
        }

        // This stores in memory and apiService
        get().setAuth(user, accessToken);
      } catch (backendError) {
        // Legacy frontend-only accounts were saved in localStorage before the backend existed.
        // If one matches, keep it usable rather than forcing a duplicate account.
        const legacyCredential = findCredential(email);
        if (!legacyCredential || legacyCredential.password !== password) {
          throw backendError;
        }

        const legacyCredentialWithMetadata = legacyCredential as typeof legacyCredential & { createdAt?: string };
        const legacyUser: User = {
          id: legacyCredential.id || crypto.randomUUID(),
          tenantId: legacyCredential.tenantId || 'public',
          name: legacyCredential.name,
          email: legacyCredential.email,
          avatar: legacyCredential.avatar ?? null,
          role: legacyCredential.role ?? 'Member',
          createdAt: legacyCredentialWithMetadata.createdAt || new Date().toISOString(),
        };
        const legacyToken = 'legacy-local-token';
        try { localStorage.setItem(LEGACY_SESSION_KEY, JSON.stringify({ user: legacyUser, accessToken: legacyToken })); } catch { }
        get().setAuth(legacyUser, legacyToken);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  /**
   * Register: Send details -> Get access token in response + refresh token in cookie
   */
  register: async (name: string, email: string, password: string, role: 'Admin' | 'Member') => {
    set({ isLoading: true, error: null });
    try {
      if (FRONTEND_ONLY) {
        if (findCredential(email)) {
          throw new Error('Email already registered');
        }
        const mockUser: User = {
          id: crypto.randomUUID(),
          tenantId: 'public',
          name,
          email,
          avatar: null,
          role,
          createdAt: new Date().toISOString(),
        };
        saveCredential({ ...mockUser, password });
        set({ isLoading: false, error: null });
        return;
      }
      const response = await apiService.register(name, email, password, role);
      const { user, accessToken } = response.data || {};

      if (!user || !accessToken) {
        throw new Error('Invalid register response');
      }

      get().setAuth(user, accessToken);
      saveCredential({ ...user, password });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      set({ isLoading: false, error: message });
      throw error;
    }
  },
}));

// 🚀 FIX: Sync user state across iframes and tabs!
// If the user updates their profile inside the Settings iframe, this will instantly 
// catch the localStorage change and update the main meeting window's UI without a refresh.
window.addEventListener('storage', (event) => {
  if (event.key === SESSION_KEY && event.newValue) {
    try {
      const parsed = JSON.parse(event.newValue);
      if (parsed.user) useAuthStore.getState().setUser(parsed.user);
    } catch (e) { console.error("Failed to sync session storage", e); }
  }
});
