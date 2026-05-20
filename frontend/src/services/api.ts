import { updateCredential } from '../lib/authCredentials';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const FRONTEND_ONLY = import.meta.env.VITE_FRONTEND_ONLY === 'true';
const LOCAL_MEETINGS_KEY = 'intellmeet-local-api-meetings';
const LOCAL_TASKS_KEY = 'intellmeet-local-api-tasks';
const LOCAL_ORGS_KEY = 'intellmeet-local-orgs';
const LOCAL_TEAMS_KEY = 'intellmeet-local-teams';
const SESSION_KEYS = ['intellmeet-session-v2', 'intellmeet-mock-user-v2', 'intellmeet-legacy-session-v2'] as const;

function ok<T>(data: T, message = 'OK'): ApiResponse<T> {
  return { success: true, message, statusCode: 200, data };
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('intellmeet:local-data-updated', { detail: { key } }));
  }
}

function readCurrentSession() {
  for (const key of SESSION_KEYS) {
    const session = readLocal<{ user?: AuthUser; accessToken?: string } | null>(key, null);
    if (session?.user) {
      return session;
    }
  }
  return null;
}

function getCurrentSessionUser() {
  return readCurrentSession()?.user ?? null;
}

function getAccessibleOrganizationsForUser(currentUser: AuthUser | null, orgs: OrganizationData[]) {
  if (!currentUser) return orgs;

  const normalizedEmail = currentUser.email.trim().toLowerCase();
  const relevantOrgs = orgs.filter((org) => {
    const ownerMatch = typeof org.ownerId !== 'string' && org.ownerId.email.toLowerCase() === normalizedEmail;
    const memberMatch = org.members.some((member) => member.userId.email.toLowerCase() === normalizedEmail);
    const inviteMatch = org.invitations.some(
      (invitation) => invitation.email.toLowerCase() === normalizedEmail && invitation.status === 'Pending',
    );
    return ownerMatch || memberMatch || inviteMatch;
  });

  if (relevantOrgs.length > 0) return relevantOrgs;
  if (currentUser.role === 'Admin') return orgs;
  return [];
}

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
  invitations: { email: string; role: string; status: string; invitedAt: string; _id: string; invitedByName?: string; invitedMemberName?: string }[];
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
  async register(name: string, email: string, password: string, role: 'Admin' | 'Member') { return this.request<RegisterResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, role }) }); }
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
  async createOrganization(name: string) {
    if (FRONTEND_ONLY) {
      const orgs = readLocal<OrganizationData[]>(LOCAL_ORGS_KEY, []);
      const currentUser = getCurrentSessionUser();
      const owner = currentUser
        ? { _id: currentUser.id, name: currentUser.name, email: currentUser.email }
        : 'local';
      const creatorMember = currentUser
        ? [{
            userId: {
              _id: currentUser.id,
              name: currentUser.name,
              email: currentUser.email,
              avatar: currentUser.avatar,
            },
            role: 'Admin',
            joinedAt: new Date().toISOString(),
          }]
        : [];
      const org: OrganizationData = {
        _id: crypto.randomUUID(),
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        ownerId: owner,
        members: creatorMember,
        invitations: [],
        logo: null,
      };
      writeLocal(LOCAL_ORGS_KEY, [org, ...orgs.filter((item) => item._id !== org._id)]);
      return ok(org, 'Organization created');
    }
    return this.request<OrganizationData>('/api/organizations', { method: 'POST', body: JSON.stringify({ name }) });
  }
  async getMyOrganization() { return this.request<OrganizationData | null>('/api/organizations/me', { method: 'GET' }); }
  async getOrganizations() {
    if (FRONTEND_ONLY) {
      const orgs = readLocal<OrganizationData[]>(LOCAL_ORGS_KEY, []);
      const currentUser = getCurrentSessionUser();
      if (!currentUser) return ok(orgs);
      return ok(getAccessibleOrganizationsForUser(currentUser, orgs));
    }
    return this.request<OrganizationData[]>('/api/organizations', { method: 'GET' });
  }
  async updateOrganizationName(orgId: string, name: string) {
    if (FRONTEND_ONLY) {
      const orgs = readLocal<OrganizationData[]>('intellmeet-local-orgs', []);
      const org = orgs.find((item) => item._id === orgId);
      if (!org) throw new ApiError('Organization not found', 404);
      org.name = name;
      org.slug = name.toLowerCase().replace(/\s+/g, '-');
      writeLocal('intellmeet-local-orgs', orgs);
      return ok(org, 'Organization updated');
    }
    return this.request<OrganizationData>(`/api/organizations/${orgId}`, { method: 'PUT', body: JSON.stringify({ name }) });
  }
  async deleteOrganization(orgId: string) {
    if (FRONTEND_ONLY) {
      const orgs = readLocal<OrganizationData[]>('intellmeet-local-orgs', []);
      const nextOrgs = orgs.filter((item) => item._id !== orgId);
      writeLocal('intellmeet-local-orgs', nextOrgs);
      return ok({ success: true }, 'Organization deleted');
    }
    return this.request<{ success: boolean }>(`/api/organizations/${orgId}`, { method: 'DELETE' });
  }
  async addMember(orgId: string, email: string, role: 'Admin' | 'Member' | 'Viewer' = 'Member', name?: string) {
    if (FRONTEND_ONLY) {
      const orgs = readLocal<OrganizationData[]>('intellmeet-local-orgs', []);
      const org = orgs.find((item) => item._id === orgId);
      if (!org) throw new ApiError('Organization not found', 404);
      const normalizedEmail = email.trim().toLowerCase();
      const alreadyMember = org.members.some((member) => member.userId.email.toLowerCase() === normalizedEmail);
      if (alreadyMember) throw new ApiError('Member already exists in this workspace', 409);
      const existingPendingInvite = org.invitations.some((item) => item.email.toLowerCase() === normalizedEmail && item.status === 'Pending');
      if (existingPendingInvite) throw new ApiError('An invite is already pending for this email', 409);
      const session = readLocal<{ user?: AuthUser }>('intellmeet-session-v2', {});
      const invitation = {
        email: normalizedEmail,
        role,
        status: 'Pending',
        invitedAt: new Date().toISOString(),
        _id: crypto.randomUUID(),
        invitedByName: session.user?.name || 'Admin',
        invitedMemberName: name?.trim() || normalizedEmail.split('@')[0],
      };
      org.invitations = [invitation, ...org.invitations];
      writeLocal('intellmeet-local-orgs', orgs);
      return ok({ ...org, invitationLink: `${window.location.origin}/accept-invitation?token=${invitation._id}`, emailSent: false } as OrganizationData & { invitationLink: string; emailSent: boolean }, 'Member added');
    }
    return this.request<OrganizationData>(`/api/organizations/${orgId}/members`, { method: 'POST', body: JSON.stringify({ email, role, name }) });
  }
  async updateMemberRole(orgId: string, memberId: string, role: 'Admin' | 'Member' | 'Viewer') {
    if (FRONTEND_ONLY) {
      const orgs = readLocal<OrganizationData[]>('intellmeet-local-orgs', []);
      const org = orgs.find((item) => item._id === orgId);
      if (!org) throw new ApiError('Organization not found', 404);
      const member = org.members.find((item) => item.userId._id === memberId);
      if (!member) throw new ApiError('Member not found', 404);
      member.role = role;
      writeLocal('intellmeet-local-orgs', orgs);
      return ok(org, 'Role updated');
    }
    return this.request<OrganizationData>(`/api/organizations/${orgId}/members/${memberId}`, { method: 'PUT', body: JSON.stringify({ role }) });
  }
  async getPendingInvitationsForEmail(email: string) {
    if (FRONTEND_ONLY) {
      const orgs = readLocal<OrganizationData[]>('intellmeet-local-orgs', []);
      const invitations = orgs.flatMap((org) =>
        org.invitations
          .filter((invitation) => invitation.email.toLowerCase() === email.toLowerCase() && invitation.status === 'Pending')
          .map((invitation) => ({ ...invitation, organizationId: org._id, organizationName: org.name })),
      );
      return ok(invitations);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.request<any[]>('/api/invitations/pending', { method: 'GET' });
  }
  async acceptInvitation(token: string) {
    if (FRONTEND_ONLY) {
      const orgs = readLocal<OrganizationData[]>('intellmeet-local-orgs', []);
      const session = readLocal<{ user?: AuthUser; accessToken?: string }>('intellmeet-session-v2', {});
      const currentUser = session.user;
      if (!currentUser) throw new ApiError('Please login to accept the invitation', 401);

      for (const org of orgs) {
        const invitation = org.invitations.find((item) => item._id === token);
        if (invitation) {
          if (invitation.email.toLowerCase() !== currentUser.email.toLowerCase()) {
            throw new ApiError('This invitation belongs to a different email address', 403);
          }

          const existingMember = org.members.find((item) => item.userId.email.toLowerCase() === currentUser.email.toLowerCase());
          invitation.status = 'Accepted';
          if (existingMember) {
            existingMember.role = invitation.role;
          } else {
            org.members = [{
              userId: {
                _id: currentUser.id || crypto.randomUUID(),
                name: currentUser.name || invitation.invitedMemberName || invitation.email.split('@')[0],
                email: currentUser.email,
                avatar: currentUser.avatar ?? null,
              },
              role: invitation.role,
              joinedAt: new Date().toISOString(),
            }, ...org.members];
          }
          writeLocal('intellmeet-local-orgs', orgs);
          updateCredential(currentUser.email, { role: invitation.role === 'Admin' ? 'Admin' : 'Member' });
          localStorage.setItem('intellmeet-session-v2', JSON.stringify({
            ...session,
            user: {
              ...currentUser,
              role: invitation.role === 'Admin' ? 'Admin' : 'Member',
            },
          }));
          return ok({ organizationId: org._id }, 'Invitation accepted');
        }
      }
      throw new ApiError('Invitation not found', 404);
    }
    return this.request<{ organizationId: string }>('/api/invitations/accept', { method: 'POST', body: JSON.stringify({ token }) });
  }
  async validateInvitation(token: string) {
    if (FRONTEND_ONLY) {
      const orgs = readLocal<OrganizationData[]>('intellmeet-local-orgs', []);
      for (const org of orgs) {
        const invitation = org.invitations.find((item) => item._id === token);
        if (invitation) {
          return ok({ valid: true, memberEmail: invitation.email, memberName: invitation.invitedMemberName || invitation.email.split('@')[0], organizationName: org.name, organizationId: org._id, role: invitation.role, invitedByName: invitation.invitedByName });
        }
      }
      return ok({ valid: false, memberEmail: '', memberName: '', organizationName: '', organizationId: '', role: '' });
    }
    return this.request<{ valid: boolean; memberEmail: string; memberName: string; organizationName: string; organizationId: string; role: string; invitedByName?: string }>('/api/invitations/validate?token=' + encodeURIComponent(token), { method: 'GET' });
  }
  async removeMember(orgId: string, memberId: string) {
    if (FRONTEND_ONLY) {
      const orgs = readLocal<OrganizationData[]>(LOCAL_ORGS_KEY, []);
      const org = orgs.find((item) => item._id === orgId);
      if (!org) throw new ApiError('Organization not found', 404);

      const memberToRemove = org.members.find((item) => item.userId._id === memberId);
      if (!memberToRemove) throw new ApiError('Member not found', 404);

      org.members = org.members.filter((item) => item.userId._id !== memberId);
      org.invitations = org.invitations.filter((item) => item.email.toLowerCase() !== memberToRemove.userId.email.toLowerCase());

      const storedTeams = readLocal<Record<string, Array<{ id: string; name: string; memberIds: string[] }>>>(LOCAL_TEAMS_KEY, {});
      const workspaceTeams = Array.isArray(storedTeams[orgId]) ? storedTeams[orgId] : [];
      storedTeams[orgId] = workspaceTeams.map((team) => ({
        ...team,
        memberIds: team.memberIds.filter((id) => id !== memberId),
      }));

      writeLocal(LOCAL_ORGS_KEY, orgs);
      writeLocal(LOCAL_TEAMS_KEY, storedTeams);
      return ok(org, 'Member removed');
    }

    return this.request<OrganizationData>(`/api/organizations/${orgId}/members/${memberId}`, { method: 'DELETE' });
  }
  async cancelInvitation(orgId: string, invitationId: string) {
    if (FRONTEND_ONLY) {
      const orgs = readLocal<OrganizationData[]>('intellmeet-local-orgs', []);
      const org = orgs.find((item) => item._id === orgId);
      if (!org) throw new ApiError('Organization not found', 404);

      const invitationExists = org.invitations.some((item) => item._id === invitationId);
      if (!invitationExists) throw new ApiError('Invitation not found', 404);

      org.invitations = org.invitations.filter((item) => item._id !== invitationId);
      writeLocal('intellmeet-local-orgs', orgs);
      return ok(org, 'Invitation cancelled');
    }

    return this.request<OrganizationData>(`/api/organizations/${orgId}/invitations/${invitationId}`, { method: 'DELETE' });
  }
  async getOrgMembers(orgId: string) { return this.request(`/api/organizations/${orgId}/members`, { method: 'GET' }); }

  // ─── Meetings ──────────────────────────────────────────────
  async createMeeting(data: { title: string; description?: string; scheduledStartTime?: string; scheduledEndTime?: string }) {
    if (FRONTEND_ONLY) {
      const now = new Date();
      const start = data.scheduledStartTime ? new Date(data.scheduledStartTime) : now;
      const end = data.scheduledEndTime ? new Date(data.scheduledEndTime) : new Date(start.getTime() + 60 * 60 * 1000);
      const meeting: MeetingData = {
        _id: crypto.randomUUID(), tenantId: 'public', meetingId: Math.random().toString(36).slice(2, 6) + '-' + Math.random().toString(36).slice(2, 6),
        title: data.title, description: data.description ?? null, host: 'local', participants: [],
        status: data.scheduledStartTime ? 'Scheduled' : 'Ongoing', scheduledStartTime: start.toISOString(), scheduledEndTime: end.toISOString(),
        actualStartTime: data.scheduledStartTime ? null : now.toISOString(), actualEndTime: null, transcript: null, summary: null, actionItems: [], recordingUrl: null,
        createdAt: now.toISOString(), updatedAt: now.toISOString(),
      };
      const meetings = [meeting, ...readLocal<MeetingData[]>(LOCAL_MEETINGS_KEY, [])];
      writeLocal(LOCAL_MEETINGS_KEY, meetings);
      return ok(meeting, 'Meeting created');
    }
    return this.request<MeetingData>('/api/meetings', { method: 'POST', body: JSON.stringify(data) });
  }
  async getMeetings(filters?: { status?: string }) {
    if (FRONTEND_ONLY) {
      const meetings = readLocal<MeetingData[]>(LOCAL_MEETINGS_KEY, []);
      const currentUser = getCurrentSessionUser();
      const accessibleOrganizations = getAccessibleOrganizationsForUser(
        currentUser,
        readLocal<OrganizationData[]>(LOCAL_ORGS_KEY, []),
      );

      let visibleMeetings = meetings;

      if (currentUser && currentUser.role !== 'Admin' && accessibleOrganizations.length === 0) {
        visibleMeetings = [];
      }

      return ok(filters?.status ? visibleMeetings.filter((m) => m.status === filters.status) : visibleMeetings);
    }
    const params = filters?.status ? `?status=${filters.status}` : '';
    return this.request<MeetingData[]>(`/api/meetings${params}`, { method: 'GET' });
  }
  async getMeeting(id: string) {
    if (FRONTEND_ONLY) {
      const meeting = readLocal<MeetingData[]>(LOCAL_MEETINGS_KEY, []).find((m) => m._id === id);
      if (!meeting) throw new ApiError('Meeting not found', 404);
      return ok(meeting);
    }
    return this.request<MeetingData>(`/api/meetings/${id}`, { method: 'GET' });
  }
  async getMeetingByCode(code: string) {
    if (FRONTEND_ONLY) {
      const meeting = readLocal<MeetingData[]>(LOCAL_MEETINGS_KEY, []).find((m) => m.meetingId === code);
      if (!meeting) throw new ApiError('Meeting not found', 404);
      return ok(meeting);
    }
    return this.request<MeetingData>(`/api/meetings/code/${code}`, { method: 'GET' });
  }
  async updateMeeting(id: string, data: Partial<{ title: string; description: string; scheduledStartTime: string; scheduledEndTime: string }>) { return this.request<MeetingData>(`/api/meetings/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  async deleteMeeting(id: string) {
    if (FRONTEND_ONLY) { writeLocal(LOCAL_MEETINGS_KEY, readLocal<MeetingData[]>(LOCAL_MEETINGS_KEY, []).filter((m) => m._id !== id)); return ok(null); }
    return this.request(`/api/meetings/${id}`, { method: 'DELETE' });
  }
  async startMeeting(id: string) {
    if (FRONTEND_ONLY) {
      const meetings = readLocal<MeetingData[]>(LOCAL_MEETINGS_KEY, []);
      const meeting = meetings.find((m) => m._id === id);
      if (!meeting) throw new ApiError('Meeting not found', 404);
      meeting.status = 'Ongoing'; meeting.actualStartTime = new Date().toISOString();
      writeLocal(LOCAL_MEETINGS_KEY, meetings); return ok(meeting);
    }
    return this.request<MeetingData>(`/api/meetings/${id}/start`, { method: 'POST' });
  }
  async endMeeting(id: string) {
    if (FRONTEND_ONLY) {
      const meetings = readLocal<MeetingData[]>(LOCAL_MEETINGS_KEY, []);
      const meeting = meetings.find((m) => m._id === id);
      if (!meeting) throw new ApiError('Meeting not found', 404);
      meeting.status = 'Completed'; meeting.actualEndTime = new Date().toISOString();
      writeLocal(LOCAL_MEETINGS_KEY, meetings); return ok(meeting);
    }
    return this.request<MeetingData>(`/api/meetings/${id}/end`, { method: 'POST' });
  }
  async joinMeetingAsParticipant(id: string) { if (FRONTEND_ONLY) return this.getMeeting(id); return this.request<MeetingData>(`/api/meetings/${id}/join`, { method: 'POST' }); }

  // ─── Tasks ─────────────────────────────────────────────────
  async createTask(data: { title: string; description?: string; priority?: string; assignee?: string; meetingId?: string; dueDate?: string }) {
    if (FRONTEND_ONLY) {
      const task: TaskData = { _id: crypto.randomUUID(), title: data.title, description: data.description ?? null, status: 'Open', priority: (data.priority as TaskData['priority']) ?? 'Medium', assignee: null, meetingId: data.meetingId ?? null, dueDate: data.dueDate ?? null, createdAt: new Date().toISOString() };
      const tasks = [task, ...readLocal<TaskData[]>(LOCAL_TASKS_KEY, [])]; writeLocal(LOCAL_TASKS_KEY, tasks); return ok(task);
    }
    return this.request<TaskData>('/api/tasks', { method: 'POST', body: JSON.stringify(data) });
  }
  async getTasks(filters?: { status?: string }) { if (FRONTEND_ONLY) { const tasks=readLocal<TaskData[]>(LOCAL_TASKS_KEY, []); return ok(filters?.status ? tasks.filter(t=>t.status===filters.status) : tasks); } const params = filters?.status ? `?status=${filters.status}` : ''; return this.request<TaskData[]>(`/api/tasks${params}`, { method: 'GET' }); }
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