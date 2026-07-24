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
  role?: 'Admin' | 'Member';
  createdAt: string;
}

export interface LoginResponse { user: AuthUser; accessToken: string; }
export interface RegisterResponse { user: AuthUser; accessToken: string; }
export interface RefreshResponse { accessToken: string; }

export interface MeetingData {
  _id: string;
  tenantId: string;
  meetingId: string;
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
  isRead: boolean;
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
  private tenantId: string | null = null;
  private refreshPromise: Promise<string | null> | null = null;
  public onSessionExpired?: () => void;

  constructor() {
    this.baseUrl = API_URL;
    this.accessToken = localStorage.getItem('accessToken');
    this.tenantId = localStorage.getItem('tenantId');
  }

  setAccessToken(token: string | null) {
    this.accessToken = token; 
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  }

  setTenantId(tenantId: string | null) {
    this.tenantId = tenantId;
    if (tenantId) {
      localStorage.setItem('tenantId', tenantId);
    } else {
      localStorage.removeItem('tenantId');
    }
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // 🚀 FIX: Removed Ngrok bypass headers to prevent CORS preflight block
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    // 🚀 FIX: Automatically set Content-Type to JSON unless sending FormData (for image uploads)
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    if (this.tenantId) {
      headers['x-tenant-id'] = this.tenantId;
    }

    try {
      const response = await fetch(url, { 
        ...options,
        headers,
        credentials: 'include' 
      });

      // 🚀 FIX: Used `endpoint` instead of `options.url` to resolve the TypeScript error
      if (response.status === 401 && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
        const newToken = await this.tryRefreshToken();
        if (newToken) {
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
            this.setAccessToken(null); 
            if (this.onSessionExpired) this.onSessionExpired();
            throw new ApiError('Session expired. Please login again.', 401);
          }
        }
        this.setAccessToken(null); 
        if (this.onSessionExpired) this.onSessionExpired();
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
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseUrl}/api/auth/refresh`, { 
          method: 'POST',
          credentials: 'include', 
          headers: { 
            'Content-Type': 'application/json',
            // 🚀 FIX: Removed Ngrok headers here as well
          }
        });

        if (!response.ok) {
          this.setAccessToken(null);
          return null;
        }

        const data = await response.json() as ApiResponse<RefreshResponse>;
        const newToken = data.data?.accessToken || null;
        
        if (newToken) {
          this.setAccessToken(newToken);
        }
        return newToken;
      } catch (error) {
        console.error('Token refresh failed:', error);
        this.setAccessToken(null);
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // --- AUTHENTICATION & PROFILE ---
  async register(name: string, email: string, password: string, role?: string) { 
    const res = await this.request<RegisterResponse>('/api/auth/register', { 
      method: 'POST', 
      body: JSON.stringify({ name, email, password, role }) 
    });
    if (res.data?.accessToken) {
      this.setAccessToken(res.data.accessToken);
    }
    if (res.data?.user?.tenantId) {
      this.setTenantId(res.data.user.tenantId);
    }
    return res;
  }
  
  async login(email: string, password: string) { 
    const res = await this.request<LoginResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (res.data?.accessToken) {
      this.setAccessToken(res.data.accessToken);
    }
    if (res.data?.user?.tenantId) {
      this.setTenantId(res.data.user.tenantId);
    }
    return res;
  }

  async forgotPassword(email: string) { return this.request<{ message: string }>('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }); }
  async resetPassword(token: string, password: string) { return this.request<{ message: string }>('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }); }
  
  async getMe() { 
    const res = await this.request<AuthUser>('/api/auth/me', { method: 'GET' }); 
    if (res.data?.tenantId) {
      this.setTenantId(res.data.tenantId);
    }
    return res;
  }
  
  async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' }); 
    } catch (error) {
      console.warn("Backend session already dead, clearing local token anyway.");
    } finally {
      this.setAccessToken(null);
      this.setTenantId(null);
    }
  }
  
  async refreshToken(): Promise<{ data?: { accessToken: string } }> { 
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/refresh`, { 
        method: 'POST', 
        credentials: 'include', 
        headers: { 
          'Content-Type': 'application/json',
        } 
      });
      if (!response.ok) return {}; 
      const json = await response.json();
      if (json.data?.accessToken) this.setAccessToken(json.data.accessToken);
      return json;
    } catch {
      return {};
    }
  }

  googleLogin(tenantId = 'public') { window.location.href = `${this.baseUrl}/api/auth/google?tenantId=${tenantId}`; }

  // 🚀 FIX: Accept FormData directly so image uploads work properly
  async updateProfile(data: FormData) {
    return this.request<AuthUser>('/api/auth/profile', { method: 'PUT', body: data as any });
  }

  // --- ORGANIZATIONS ---
  async createOrganization(name: string) { return this.request<OrganizationData>('/api/organizations', { method: 'POST', body: JSON.stringify({ name }) }); }
  async updateOrganizationName(id: string, name: string) { return this.request<OrganizationData>(`/api/organizations/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }); }
  async deleteOrganization(id: string) { return this.request(`/api/organizations/${id}`, { method: 'DELETE' }); }
  async getMyOrganization() { return this.request<OrganizationData | null>('/api/organizations/me', { method: 'GET' }); }
  async getOrganizations() { return this.request<OrganizationData[]>('/api/organizations', { method: 'GET' }); }
  async addMember(orgId: string, email: string, role: 'Admin' | 'Member' | 'Viewer' = 'Member', name?: string) { return this.request<OrganizationData>(`/api/organizations/${orgId}/members`, { method: 'POST', body: JSON.stringify({ email, role, name }) }); }
  async acceptInvitation(token: string) { return this.request<{ organizationId: string }>('/api/invitations/accept', { method: 'POST', body: JSON.stringify({ token }) }); }
  async validateInvitation(token: string) { return this.request<{ valid: boolean; memberEmail: string; memberName: string; organizationName: string; organizationId: string; role: string }>('/api/invitations/validate?token=' + encodeURIComponent(token), { method: 'GET' }); }
  
  async getPendingInvitationsForEmail(email: string) { 
    try {
      return await this.request<any[]>(`/api/invitations/pending?email=${encodeURIComponent(email)}`, { method: 'GET' });
    } catch (error) {
      return { success: true, message: 'Fallback', statusCode: 200, data: [] };
    }
  }

  async removeMember(orgId: string, memberId: string) { return this.request(`/api/organizations/${orgId}/members/${memberId}`, { method: 'DELETE' }); }
  async getOrgMembers(orgId: string) { return this.request(`/api/organizations/${orgId}/members`, { method: 'GET' }); }

  // --- MEETINGS ---
  async createMeeting(data: { title: string; description?: string; scheduledStartTime?: string; scheduledEndTime?: string }) { return this.request<MeetingData>('/api/meetings', { method: 'POST', body: JSON.stringify(data) }); }
  async getMeetings(filters?: { status?: string }) { const params = filters?.status ? `?status=${filters.status}` : ''; return this.request<MeetingData[]>(`/api/meetings${params}`, { method: 'GET' }); }
  async getMeeting(id: string) { return this.request<MeetingData>(`/api/meetings/${id}`, { method: 'GET' }); }
  async getMeetingByCode(code: string) { return this.request<MeetingData>(`/api/meetings/code/${code}`, { method: 'GET' }); }
  async updateMeeting(id: string, data: Partial<{ title: string; description: string; scheduledStartTime: string; scheduledEndTime: string }>) { return this.request<MeetingData>(`/api/meetings/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  async deleteMeeting(id: string) { return this.request(`/api/meetings/${id}`, { method: 'DELETE' }); }
  async startMeeting(id: string) { return this.request<MeetingData>(`/api/meetings/${id}/start`, { method: 'POST' }); }
  async endMeeting(id: string) { return this.request<MeetingData>(`/api/meetings/${id}/end`, { method: 'POST' }); }
  async joinMeetingAsParticipant(id: string) { return this.request<MeetingData>(`/api/meetings/${id}/join`, { method: 'POST' }); }
  async uploadMeetingRecording(id: string, blob: Blob) {
    const formData = new FormData();
    formData.append("recording", blob, `recording-${id}.webm`);
    return this.request<MeetingData>(`/api/meetings/${id}/recording`, {
      method: "POST",
      body: formData,
    });
  }

  // --- TASKS ---
  async createTask(data: { title: string; description?: string; priority?: string; assignee?: string; meetingId?: string; dueDate?: string }) { return this.request<TaskData>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }); }
  async getTasks(filters?: { status?: string }) { const params = filters?.status ? `?status=${filters.status}` : ''; return this.request<TaskData[]>(`/api/tasks${params}`, { method: 'GET' }); }
  async updateTask(id: string, data: Partial<{ title: string; status: string; priority: string; assignee: string; dueDate: string }>) { return this.request<TaskData>(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  async deleteTask(id: string) { return this.request(`/api/tasks/${id}`, { method: 'DELETE' }); }

  // --- TRANSCRIPTS & AI ---
  async submitTranscript(meetingId: string, text: string) { return this.request<TranscriptData>('/api/ai/transcribe', { method: 'POST', body: JSON.stringify({ meetingId, transcript: text }) }); }
  async getTranscript(meetingId: string) { return this.request<TranscriptData>(`/api/ai/transcript/${meetingId}`, { method: 'GET' }); }
  async retryTranscriptProcessing(meetingId: string) { return this.request(`/api/ai/transcript/${meetingId}/retry`, { method: 'POST' }); }

  async generateSummary(meetingId: string) { 
    return this.request<{ meetingId: string, summary: string }>('/api/ai/summarize', { method: 'POST', body: JSON.stringify({ meetingId }) }); 
  }
  async extractActionItems(meetingId: string) { 
    return this.request<{ meetingId: string, actionItems: any[] }>('/api/ai/extract-actions', { method: 'POST', body: JSON.stringify({ meetingId }) }); 
  }
  async analyzeSentiment(meetingId: string) { 
    return this.request<{ meetingId: string, sentiment: any }>('/api/ai/sentiment', { method: 'POST', body: JSON.stringify({ meetingId }) }); 
  }
  async getSummary(meetingId: string) { 
    return this.request<{ meetingId: string, summary: string, actionItems: any[] }>(`/api/ai/summary/${meetingId}`, { method: 'GET' }); 
  }

  // --- NOTIFICATIONS ---
  async getNotifications(limit = 20) { return this.request<NotificationData[]>(`/api/notifications?limit=${limit}`, { method: 'GET' }); }
  async getUnreadCount() { return this.request<{ count: number }>('/api/notifications/unread-count', { method: 'GET' }); }
  async markNotificationRead(id: string) { return this.request(`/api/notifications/${id}/read`, { method: 'PUT' }); }
  async markAllNotificationsRead() { return this.request('/api/notifications/read-all', { method: 'PUT' }); }
}

export const apiService = new ApiService();

export class ApiError extends Error {
  public statusCode: number;
  public errors?: unknown;
  
  constructor(message: string, statusCode: number, errors?: unknown) { 
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
  
}