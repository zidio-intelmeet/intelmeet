const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  statusCode: number;
  data?: T;
  errors?: unknown;
}

export interface AuthUser {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  avatar: string | null;
  role?: string;
  createdAt: string;
}

export interface LoginResponse { user: AuthUser; accessToken: string; }
export interface RegisterResponse { user: AuthUser; accessToken: string; }
export interface RefreshResponse { accessToken: string; }

export interface MeetingData {
  _id: string;
  tenantId: string;
  meetingId: string; // join code like "a1b2-c3d4"
  title: string;
  description: string | null;
  host: { _id: string; name: string; email: string; avatar: string | null } | string;
  participants: ({ _id: string; name: string; email: string; avatar: string | null } | string)[];
  status: 'Scheduled' | 'Ongoing' | 'Completed' | 'Cancelled';
  scheduledStartTime: string;
  scheduledEndTime: string;
  actualStartTime: string | null;
  actualEndTime: string | null;
  transcript: string | null;
  summary: string | null;
  actionItems: { title: string; assignee: string; dueDate: string | null; completed: boolean }[];
  recordingUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskData {
  _id: string;
  title: string;
  description: string | null;
  status: 'Open' | 'In Progress' | 'Completed' | 'Cancelled' | 'todo' | 'in_progress' | 'done';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent' | 'low' | 'medium' | 'high';
  assignee: { _id: string; name: string; email: string; avatar: string | null } | null;
  meetingId: string | null;
  dueDate: string | null;
  createdAt: string;
}

export interface TranscriptData {
  _id: string;
  meetingId: string;
  fullText: string;
  summary: string | null;
  actionItems: { text: string; assignee: string | null; deadline: string | null; completed: boolean; _id: string }[];
  keyTopics: string[];
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface NotificationData {
  _id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface OrganizationData {
  _id: string;
  name: string;
  slug: string;
  ownerId: { _id: string; name: string; email: string } | string;
  members: { userId: { _id: string; name: string; email: string; avatar: string | null }; role: string; joinedAt: string }[];
  invitations: { email: string; role: string; status: string; invitedAt: string; _id: string }[];
  logo: string | null;
}

class ApiService {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  constructor() { 
    this.baseUrl = API_URL;
  }

  setAccessToken(token: string | null) { 
    this.accessToken = token; 
  }

  getAccessToken(): string | null { 
    return this.accessToken; 
  }

  getBaseUrl(): string { 
    return this.baseUrl; 
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    
    // Add access token to Authorization header if available
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      // credentials: 'include' ensures cookies are sent with request (refresh token in httpOnly cookie)
      const response = await fetch(url, { 
        ...options, 
        headers, 
        credentials: 'include' // CRITICAL: Sends httpOnly cookies with every request
      });

      // Handle 401 - try to refresh token
      if (response.status === 401 && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
        const newToken = await this.tryRefreshToken();
        if (newToken) {
          // Retry request with new token
          headers['Authorization'] = `Bearer ${newToken}`;
          const retryResponse = await fetch(url, { 
            ...options, 
            headers, 
            credentials: 'include' 
          });
          
          if (retryResponse.ok) {
            const retryData = await retryResponse.json() as ApiResponse<T>;
            return retryData;
          } else if (retryResponse.status === 401) {
            // Still 401 after refresh - logout
            throw new ApiError('Session expired. Please login again.', 401);
          }
        }
        throw new ApiError('Session expired. Please login again.', 401);
      }

      const data = await response.json() as ApiResponse<T>;
      if (!response.ok) {
        throw new ApiError(data.message || 'API request failed', response.status, data.errors);
      }
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Network error', 0, error);
    }
  }

  private async tryRefreshToken(): Promise<string | null> {
    // Prevent multiple refresh attempts simultaneously
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        // Browser automatically sends refresh token cookie with credentials: 'include'
        const response = await fetch(`${this.baseUrl}/api/auth/refresh`, { 
          method: 'POST', 
          credentials: 'include', // CRITICAL: Sends httpOnly refresh token cookie
          headers: { 'Content-Type': 'application/json' } 
        });

        if (!response.ok) {
          this.accessToken = null;
          return null;
        }

        const data = await response.json() as ApiResponse<RefreshResponse>;
        const newToken = data.data?.accessToken || null;
        if (newToken) {
          this.accessToken = newToken;
        }
        return newToken;
      } catch (error) {
        console.error('Token refresh failed:', error);
        this.accessToken = null;
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // ─── Auth ──────────────────────────────────────────────────
  async register(name: string, email: string, password: string) { return this.request<RegisterResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }); }
  async login(email: string, password: string) { return this.request<LoginResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); }
  async getMe() { return this.request<AuthUser>('/api/auth/me', { method: 'GET' }); }
  async logout() { const r = await this.request('/api/auth/logout', { method: 'POST' }); this.accessToken = null; return r; }
  
  // 🚀 Modified: Fails silently if user is just logged out
  async refreshToken(): Promise<{ data?: { accessToken: string } }> { 
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/refresh`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
      if (!response.ok) return {}; 
      return response.json();
    } catch {
      return {};
    }
  }

  googleLogin(tenantId = 'public') { window.location.href = `${this.baseUrl}/api/auth/google?tenantId=${tenantId}`; }

  // ─── Organizations ─────────────────────────────────────────
  async createOrganization(name: string) { return this.request<OrganizationData>('/api/organizations', { method: 'POST', body: JSON.stringify({ name }) }); }
  async getMyOrganization() { return this.request<OrganizationData | null>('/api/organizations/me', { method: 'GET' }); }
  async getOrganizations() { return this.request<OrganizationData[]>('/api/organizations', { method: 'GET' }); }
  async addMember(orgId: string, email: string, role: 'Admin' | 'Member' | 'Viewer' = 'Member', name?: string) { return this.request<OrganizationData>(`/api/organizations/${orgId}/members`, { method: 'POST', body: JSON.stringify({ email, role, name }) }); }
  async acceptInvitation(token: string) { return this.request<{ organizationId: string }>('/api/invitations/accept', { method: 'POST', body: JSON.stringify({ token }) }); }
  async validateInvitation(token: string) { return this.request<{ valid: boolean; memberEmail: string; memberName: string; organizationName: string; organizationId: string; role: string }>('/api/invitations/validate?token=' + encodeURIComponent(token), { method: 'GET' }); }
  async removeMember(orgId: string, memberId: string) { return this.request(`/api/organizations/${orgId}/members/${memberId}`, { method: 'DELETE' }); }
  async getOrgMembers(orgId: string) { return this.request(`/api/organizations/${orgId}/members`, { method: 'GET' }); }

  // ─── Meetings ──────────────────────────────────────────────
  async createMeeting(data: { title: string; description?: string; scheduledStartTime?: string; scheduledEndTime?: string }) { return this.request<MeetingData>('/api/meetings', { method: 'POST', body: JSON.stringify(data) }); }
  async getMeetings(filters?: { status?: string }) { const params = filters?.status ? `?status=${filters.status}` : ''; return this.request<MeetingData[]>(`/api/meetings${params}`, { method: 'GET' }); }
  async getMeeting(id: string) { return this.request<MeetingData>(`/api/meetings/${id}`, { method: 'GET' }); }
  async getMeetingByCode(code: string) { return this.request<MeetingData>(`/api/meetings/code/${code}`, { method: 'GET' }); }
  async updateMeeting(id: string, data: Partial<{ title: string; description: string; scheduledStartTime: string; scheduledEndTime: string }>) { return this.request<MeetingData>(`/api/meetings/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  async deleteMeeting(id: string) { return this.request(`/api/meetings/${id}`, { method: 'DELETE' }); }
  async startMeeting(id: string) { return this.request<MeetingData>(`/api/meetings/${id}/start`, { method: 'POST' }); }
  async endMeeting(id: string) { return this.request<MeetingData>(`/api/meetings/${id}/end`, { method: 'POST' }); }
  async joinMeetingAsParticipant(id: string) { return this.request<MeetingData>(`/api/meetings/${id}/join`, { method: 'POST' }); }

  // ─── Tasks ─────────────────────────────────────────────────
  async createTask(data: { title: string; description?: string; priority?: string; assignee?: string; meetingId?: string; dueDate?: string }) { return this.request<TaskData>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }); }
  async getTasks(filters?: { status?: string }) { const params = filters?.status ? `?status=${filters.status}` : ''; return this.request<TaskData[]>(`/api/tasks${params}`, { method: 'GET' }); }
  async updateTask(id: string, data: Partial<{ title: string; status: string; priority: string; assignee: string; dueDate: string }>) { return this.request<TaskData>(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  async deleteTask(id: string) { return this.request(`/api/tasks/${id}`, { method: 'DELETE' }); }

  // ─── AI ────────────────────────────────────────────────────
  async submitTranscript(meetingId: string, text: string) { return this.request<TranscriptData>('/api/ai/transcript', { method: 'POST', body: JSON.stringify({ meetingId, text }) }); }
  async getTranscript(meetingId: string) { return this.request<TranscriptData>(`/api/ai/transcript/${meetingId}`, { method: 'GET' }); }
  async retryTranscriptProcessing(meetingId: string) { return this.request(`/api/ai/transcript/${meetingId}/retry`, { method: 'POST' }); }

  // ─── Notifications ─────────────────────────────────────────
  async getNotifications(limit = 20) { return this.request<NotificationData[]>(`/api/notifications?limit=${limit}`, { method: 'GET' }); }
  async getUnreadCount() { return this.request<{ count: number }>('/api/notifications/unread-count', { method: 'GET' }); }
  async markNotificationRead(id: string) { return this.request(`/api/notifications/${id}/read`, { method: 'PUT' }); }
  async markAllNotificationsRead() { return this.request('/api/notifications/read-all', { method: 'PUT' }); }
}

export class ApiError extends Error {
  public statusCode: number;
  public errors?: unknown;
  constructor(message: string, statusCode: number, errors?: unknown) { super(message); this.name = 'ApiError'; this.statusCode = statusCode; this.errors = errors; }
}

export const apiService = new ApiService();