import { create } from 'zustand';
import { apiService } from '../services/api';

export interface User {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  avatar: string | null;
  role?: string;
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
  register: (name: string, email: string, password: string) => Promise<void>;
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
    set((state) => ({
      user: state.user ? { ...state.user, ...profile } : null,
    }));
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
        set({
          user,
          accessToken: newAccessToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
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
      const response = await apiService.login(email, password);
      const { user, accessToken } = response.data || {};

      if (!user || !accessToken) {
        throw new Error('Invalid login response');
      }

      // This stores in memory and apiService
      get().setAuth(user, accessToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  /**
   * Register: Send details -> Get access token in response + refresh token in cookie
   */
  register: async (name: string, email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.register(name, email, password);
      const { user, accessToken } = response.data || {};

      if (!user || !accessToken) {
        throw new Error('Invalid register response');
      }

      get().setAuth(user, accessToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      set({ isLoading: false, error: message });
      throw error;
    }
  },
}));
