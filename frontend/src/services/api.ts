// API Configuration and utilities
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  statusCode: number;
  data?: T;
}

export interface User {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: string;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for auth
    });

    const data = await response.json() as ApiResponse<T>;

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  }

  // Auth endpoints
  async register(name: string, email: string, password: string) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  }

  async login(email: string, password: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe() {
    return this.request<User>('/api/auth/me', {
      method: 'GET',
    });
  }

  async logout() {
    return this.request('/api/auth/logout', {
      method: 'POST',
    });
  }

  async refreshToken() {
    return this.request('/api/auth/refresh', {
      method: 'POST',
    });
  }

  // Google OAuth
  googleLogin(tenantId: string = 'public') {
    const params = new URLSearchParams({
      tenantId,
    });
    window.location.href = `${this.baseUrl}/api/auth/google?${params}`;
  }
}

export const apiService = new ApiService();

// Auth utilities
export const isAuthenticated = (): boolean => {
  // Check if user has valid session via /api/auth/me
  return typeof document !== 'undefined' && !!document.cookie.includes('accessToken');
};

export const getAccessToken = (): string | null => {
  // Access token is stored as HttpOnly cookie, not directly accessible from JS
  // This is a security feature - the browser will automatically send it
  return null;
};
