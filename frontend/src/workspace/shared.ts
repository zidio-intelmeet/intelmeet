export const dashboardLinks = [
  { label: 'Dashboard', to: '/workspace', icon: 'M3 11.5 12 4l9 7.5M5 10v9h5v-5h4v5h5v-9' },
  { label: 'Teams', to: '/teams', icon: 'M17 20h5v-1a4 4 0 00-5-3.87M17 20H7m10 0v-1c0-.653-.084-1.287-.24-1.89M7 20H2v-1a4 4 0 015-3.87M7 20v-1c0-.653.084-1.287.24-1.89m0 0a5.002 5.002 0 019.52 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { label: 'Meetings', to: '/meetings', icon: 'M4 7h11a2 2 0 0 1 2 2v1.5l3-2v7l-3-2V15a2 2 0 0 1-2 2H4z' },
  { label: 'Schedule', to: '/schedule', icon: 'M7 3v4M17 3v4M4 9h16M5 5h14v15H5z' },
  { label: 'Settings', to: '/settings', icon: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 12h2M18 12h2M12 4v2M12 18v2' },
]

export const statCards = [
  { label: 'Total Meetings', value: '0', detail: '0 completed', tone: 'bg-emerald-50 text-emerald-700', icon: 'M4 7h11a2 2 0 0 1 2 2v1.5l3-2v7l-3-2V15a2 2 0 0 1-2 2H4z' },
  { label: 'Active Meetings', value: '0', detail: '0 scheduled', tone: 'bg-teal-50 text-teal-700', icon: 'M8 17V7m0 10 8-5-8-5' },
  { label: 'This Week', value: '0', detail: 'Upcoming meetings', tone: 'bg-green-50 text-green-700', icon: 'M7 3v4M17 3v4M4 9h16M5 5h14v15H5z' },
]

export const quickActions = [
  { title: 'Start Instant Meeting', detail: 'Begin a meeting right now', tone: 'bg-emerald-50 text-emerald-700', icon: 'M12 5v14M5 12h14' },
  { title: 'Invite Team Members', detail: 'Grow your workspace', tone: 'bg-lime-50 text-lime-700', icon: 'M12 5v6M9 8h6M7 20a5 5 0 0 1 10 0M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' },
]

export function transitionPath(destination: string) {
  return `/transition?to=${encodeURIComponent(destination)}`
}

export type StoredMeeting = {
  id: string
  title: string
  code: string
  host: string
  status: 'Live' | 'Ended' | 'Scheduled'
  createdAt: string
  recording: string
  type: string
  scheduledFor: string
  duration: string
  agenda: string
  participants: string
}

export type MeetingFormValues = {
  title: string
  type: string
  scheduledFor: string
  duration: string
  agenda: string
  participants: string
  recording: string
  status: StoredMeeting['status']
}

export const scheduleColumns = [
  { id: 'todo', title: 'To Do', accent: 'bg-amber-500' },
  { id: 'progress', title: 'In Progress', accent: 'bg-emerald-500' },
  { id: 'scheduled', title: 'Done', accent: 'bg-rose-500' },
] as const

export type ScheduleColumnId = (typeof scheduleColumns)[number]['id']

export type ScheduleTask = {
  id: string
  title: string
  note: string
  dueAt: string
  columnId: ScheduleColumnId
  createdAt: number
  assigneeId?: string
  assigneeName?: string
  assigneeEmail?: string
  teamId?: string
  teamName?: string
}

export type ScheduleSortOrder = 'newest' | 'earliest' | 'az'

export type WorkspacePreferences = {
  emailNotifications: boolean
  meetingReminders: boolean
  compactMode: boolean
  defaultMeetingDuration: string
  taskCompletionAlerts: boolean
  autoJoinMic: boolean
  autoJoinCamera: boolean
  blurProfileDetails: boolean
  rememberWorkspaceDrafts: boolean
}

export const defaultWorkspacePreferences: WorkspacePreferences = {
  emailNotifications: true,
  meetingReminders: true,
  compactMode: false,
  defaultMeetingDuration: '30 minutes',
  taskCompletionAlerts: true,
  autoJoinMic: true,
  autoJoinCamera: true,
  blurProfileDetails: false,
  rememberWorkspaceDrafts: true,
}

const LEGACY_MEETINGS_STORAGE_KEY = 'intellmeet-meetings'
const MEETINGS_STORAGE_KEY = 'intellmeet-meetings-v2'
const WORKSPACE_PREFERENCES_KEY = 'intellmeet-workspace-preferences'
const ACTIVE_MEETING_STORAGE_KEY = 'intellmeet-active-meeting'

const seedMeetings: StoredMeeting[] = []

export function readMeetings() {
  try {
    localStorage.removeItem(LEGACY_MEETINGS_STORAGE_KEY)
    const storedMeetings = localStorage.getItem(MEETINGS_STORAGE_KEY)
    return storedMeetings ? (JSON.parse(storedMeetings) as StoredMeeting[]) : seedMeetings
  } catch {
    localStorage.removeItem(MEETINGS_STORAGE_KEY)
    return seedMeetings
  }
}

export function writeMeetings(meetings: StoredMeeting[]) {
  localStorage.setItem(MEETINGS_STORAGE_KEY, JSON.stringify(meetings))
}

export function readScheduleTasks() {
  try {
    const raw = localStorage.getItem('intellmeet-schedule-tasks')
    return raw ? JSON.parse(raw) as ScheduleTask[] : []
  } catch {
    return []
  }
}

export function readWorkspacePreferences() {
  try {
    const raw = localStorage.getItem(WORKSPACE_PREFERENCES_KEY)
    return raw
      ? { ...defaultWorkspacePreferences, ...JSON.parse(raw) as Partial<WorkspacePreferences> }
      : defaultWorkspacePreferences
  } catch {
    return defaultWorkspacePreferences
  }
}

export function writeWorkspacePreferences(preferences: WorkspacePreferences) {
  localStorage.setItem(WORKSPACE_PREFERENCES_KEY, JSON.stringify(preferences))
}

export function syncCompactModeClass(enabled: boolean) {
  document.documentElement.classList.toggle('intellmeet-compact', enabled)
}

export function readActiveMeetingId() {
  try {
    const raw = localStorage.getItem(ACTIVE_MEETING_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { meetingId?: string }
    return parsed.meetingId || null
  } catch {
    return null
  }
}

export function getWorkspaceMeetingsDestination() {
  const activeMeetingId = readActiveMeetingId()
  return activeMeetingId ? `/dashboard/meetings/${activeMeetingId}/video` : '/meetings'
}

export function readDismissedNotificationIds(): Set<string> {
  try {
    const raw = localStorage.getItem('intellmeet-dismissed-notifications')
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

export function readReadNotificationIds(): Set<string> {
  try {
    const raw = localStorage.getItem('intellmeet-read-notifications')
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

export function writeDismissedNotificationIds(ids: Set<string>) {
  localStorage.setItem('intellmeet-dismissed-notifications', JSON.stringify([...ids]))
}

export function writeReadNotificationIds(ids: Set<string>) {
  localStorage.setItem('intellmeet-read-notifications', JSON.stringify([...ids]))
}

export function createMeeting(host: string, values?: Partial<MeetingFormValues>) {
  const code = Math.random().toString(36).slice(2, 10)
  const meeting: StoredMeeting = {
    id: crypto.randomUUID(),
    title: values?.title?.trim() || 'Instant Meeting',
    code,
    host,
    status: values?.status ?? 'Live',
    createdAt: new Date().toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    recording: values?.recording ?? 'Recording will appear here after the meeting ends',
    type: values?.type ?? 'Instant',
    scheduledFor: values?.scheduledFor ?? 'Starts now',
    duration: values?.duration ?? '30 minutes',
    agenda: values?.agenda?.trim() || 'No agenda added',
    participants: values?.participants?.trim() || 'No participants added',
  }
  const meetings = [meeting, ...readMeetings()]
  writeMeetings(meetings)
  return meeting
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidPhone(phone: string) {
  return /^\+?[0-9\s-]{7,}$/.test(phone)
}

export function getInitials(name: string, email: string) {
  const source = name?.trim() || email
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return source.slice(0, 2).toUpperCase()
}




