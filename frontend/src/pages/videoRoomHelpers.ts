import type { MeetingData } from '../services/api';

export const workspaceShortcuts = [
  { label: 'Dashboard', to: '/workspace',  icon: 'M3 11.5 12 4l9 7.5M5 10v9h5v-5h4v5h5v-9' },
  { label: 'Teams',     to: '/teams',      icon: 'M17 20h5v-1a4 4 0 00-5-3.87M17 20H7m10 0v-1c0-.653-.084-1.287-.24-1.89M7 20H2v-1a4 4 0 015-3.87M7 20v-1c0-.653.084-1.287.24-1.89m0 0a5.002 5.002 0 019.52 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { label: 'Meetings',  to: '/meetings',   icon: 'M4 7h11a2 2 0 0 1 2 2v1.5l3-2v7l-3-2V15a2 2 0 0 1-2 2H4z' },
  { label: 'Schedule',  to: '/schedule',   icon: 'M7 3v4M17 3v4M4 9h16M5 5h14v15H5z' },
  { label: 'Settings',  to: '/settings',   icon: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 12h2M18 12h2M12 4v2M12 18v2' },
];

const ACTIVE_MEETING_STORAGE_KEY = 'intellmeet-active-meeting';

export function rememberActiveMeeting(meetingId: string) {
  try {
    localStorage.setItem(
      ACTIVE_MEETING_STORAGE_KEY,
      JSON.stringify({ meetingId, updatedAt: Date.now() })
    );
  } catch {
    // ignore local persistence issues in frontend-only mode
  }
}

export function clearActiveMeeting() {
  try {
    localStorage.removeItem(ACTIVE_MEETING_STORAGE_KEY);
  } catch {
    // ignore local persistence issues in frontend-only mode
  }
}

export function getMeetingElapsedSeconds(meeting: MeetingData | null) {
  if (!meeting) return 0;

  const startSource = meeting.actualStartTime || meeting.scheduledStartTime || meeting.createdAt;
  if (!startSource) return 0;

  const startedAt = new Date(startSource).getTime();
  if (Number.isNaN(startedAt)) return 0;

  return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
}
