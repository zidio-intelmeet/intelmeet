import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService, type MeetingData, type TranscriptData } from '../services/api';
import { useMeetingStore } from '../stores/meetingStore';
import { format } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────
type TabId = 'summary' | 'transcript' | 'recording' | 'participation' | 'tasks';

interface ParsedTranscriptEntry {
  timestamp: string | null;
  speaker: string;
  message: string;
}

interface SummarySection {
  heading: string;
  items: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Deterministic color from a string (for avatar circles) */
function hashColor(name: string): string {
  const colors = [
    'from-indigo-500 to-violet-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
    'from-rose-500 to-pink-500',
    'from-cyan-500 to-blue-500',
    'from-fuchsia-500 to-purple-500',
    'from-lime-500 to-green-500',
    'from-sky-500 to-indigo-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getHostObj(host: MeetingData['host']): { _id?: string; name: string; email: string; avatar: string | null } | null {
  if (!host || typeof host === 'string') return null;
  return host;
}

function getParticipantObj(p: MeetingData['participants'][number]): { _id: string; name: string; email: string; avatar: string | null } | null {
  if (typeof p === 'string') return null;
  return p;
}

function computeDuration(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms <= 0) return null;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function parseTranscript(raw: string): ParsedTranscriptEntry[] {
  return raw
    .split('\n')
    .filter((l) => l.trim())
    .map((line) => {
      // Formats: "[HH:MM:SS] Speaker: msg"  or  "Speaker: msg"
      const tsMatch = line.match(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*(.*)$/);
      let rest = line;
      let timestamp: string | null = null;
      if (tsMatch) {
        timestamp = tsMatch[1];
        rest = tsMatch[2];
      }
      const speakerMatch = rest.match(/^([^:]+):\s*(.*)$/);
      if (speakerMatch) {
        return { timestamp, speaker: speakerMatch[1].trim(), message: speakerMatch[2].trim() };
      }
      return { timestamp, speaker: 'Unknown', message: rest.trim() };
    });
}

function parseSummary(raw: string): SummarySection[] {
  const sections: SummarySection[] = [];
  let current: SummarySection | null = null;
  for (const line of raw.split('\n')) {
    const heading = line.match(/^#{1,4}\s+(.+)$/);
    if (heading) {
      if (current) sections.push(current);
      current = { heading: heading[1].trim(), items: [] };
    } else if (line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().startsWith('*')) {
      const text = line.trim().replace(/^[-•*]\s*/, '');
      if (text && current) current.items.push(text);
      else if (text) {
        current = { heading: 'Summary', items: [text] };
      }
    } else if (line.trim() && current) {
      current.items.push(line.trim());
    } else if (line.trim() && !current) {
      current = { heading: 'Executive Summary', items: [line.trim()] };
    }
  }
  if (current) sections.push(current);
  return sections;
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const icons = {
  back: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  summary: (
    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  transcript: (
    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  ),
  recording: (
    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  participation: (
    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  tasks: (
    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  search: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  download: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  calendar: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  clock: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  ),
  emptyDoc: (
    <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  emptyChat: (
    <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  emptyCamera: (
    <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  emptyTasks: (
    <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  users: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
};

// ─── Tab definitions ──────────────────────────────────────────────────────────
const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'summary', label: 'Summary', icon: icons.summary },
  { id: 'transcript', label: 'Transcript', icon: icons.transcript },
  { id: 'recording', label: 'Recording', icon: icons.recording },
  { id: 'participation', label: 'Participation', icon: icons.participation },
  { id: 'tasks', label: 'Tasks', icon: icons.tasks },
];

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="text-white/10 mb-6">{icon}</div>
      <h3 className="text-lg font-semibold text-white/70 mb-2">{title}</h3>
      <p className="text-sm text-white/40 max-w-sm text-center leading-relaxed">{description}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function PostMeetingDashboard() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState<MeetingData | null>(null);
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('summary');
  const [transcriptSearch, setTranscriptSearch] = useState('');

  // ── Data fetching ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!meetingId) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const meetingRes = await apiService.getMeeting(meetingId);
        const m = meetingRes.data ?? null;
        setMeeting(m);

        // Also attempt to load transcript and summary (they may 404)
        const [transcriptRes, summaryRes] = await Promise.allSettled([
          apiService.getTranscript(meetingId),
          apiService.getSummary(meetingId),
        ]);

        if (transcriptRes.status === 'fulfilled' && transcriptRes.value.data) {
          setTranscriptData(transcriptRes.value.data);
        }
        if (summaryRes.status === 'fulfilled' && summaryRes.value.data) {
          setSummaryText(summaryRes.value.data.summary);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load meeting data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [meetingId]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const hostObj = meeting ? getHostObj(meeting.host) : null;
  const participantsList = useMemo(
    () => (meeting?.participants ?? []).map(getParticipantObj).filter(Boolean) as { _id: string; name: string; email: string; avatar: string | null }[],
    [meeting],
  );
  const duration = meeting ? computeDuration(meeting.actualStartTime, meeting.actualEndTime) : null;
  const storeRecordingUrl = useMeetingStore(state => state.recordingUrl);
  const effectiveRecordingUrl = meeting?.recordingUrl || storeRecordingUrl || null;

  // Merge summary sources: API summary > meeting.summary > transcriptData.summary
  const effectiveSummary = summaryText || meeting?.summary || transcriptData?.summary || null;

  // Merge transcript sources
  const effectiveTranscript = transcriptData?.fullText || meeting?.transcript || null;

  const parsedTranscript = useMemo(() => (effectiveTranscript ? parseTranscript(effectiveTranscript) : []), [effectiveTranscript]);

  const filteredTranscript = useMemo(() => {
    if (!transcriptSearch.trim()) return parsedTranscript;
    const q = transcriptSearch.toLowerCase();
    return parsedTranscript.filter((e) => e.speaker.toLowerCase().includes(q) || e.message.toLowerCase().includes(q));
  }, [parsedTranscript, transcriptSearch]);

  const parsedSummary = useMemo(() => (effectiveSummary ? parseSummary(effectiveSummary) : []), [effectiveSummary]);

  // Merge action items
  const actionItems = useMemo(() => {
    const meetingItems = meeting?.actionItems ?? [];
    const transcriptItems = (transcriptData?.actionItems ?? []).map((ai) => ({
      title: ai.text,
      assignee: ai.assignee || 'Unassigned',
      dueDate: ai.deadline,
      completed: ai.completed,
    }));
    // Prefer meeting items if they exist, otherwise fallback
    return meetingItems.length > 0 ? meetingItems : transcriptItems;
  }, [meeting, transcriptData]);

  // ── Loading / error states ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0f172a 50%, #1e293b 100%)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-400 animate-spin" />
          </div>
          <p className="text-sm text-white/50 font-medium tracking-wide">Loading meeting data…</p>
        </div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0f172a 50%, #1e293b 100%)' }}>
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Meeting Not Found</h2>
          <p className="text-sm text-white/40 mb-6">{error || 'The requested meeting could not be loaded.'}</p>
          <button
            onClick={() => navigate('/meetings')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
          >
            {icons.back}
            Back to Meetings
          </button>
        </div>
      </div>
    );
  }

  // ── Format header info ────────────────────────────────────────────────────
  const dateStr = meeting.scheduledStartTime
    ? format(new Date(meeting.scheduledStartTime), 'EEEE, MMMM d, yyyy')
    : format(new Date(meeting.createdAt), 'EEEE, MMMM d, yyyy');

  const timeStr = meeting.actualStartTime
    ? format(new Date(meeting.actualStartTime), 'h:mm a') +
      (meeting.actualEndTime ? ` – ${format(new Date(meeting.actualEndTime), 'h:mm a')}` : '')
    : meeting.scheduledStartTime
    ? format(new Date(meeting.scheduledStartTime), 'h:mm a') +
      (meeting.scheduledEndTime ? ` – ${format(new Date(meeting.scheduledEndTime), 'h:mm a')}` : '')
    : '';

  // ── Download helpers ──────────────────────────────────────────────────────
  const downloadTranscript = () => {
    if (!effectiveTranscript) return;
    const blob = new Blob([effectiveTranscript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${meeting.meetingId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0a0f1e 0%, #0f172a 40%, #131c30 100%)' }}>
      {/* ── Mesh gradient decorations ──────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-[0.07]" style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -left-32 w-[500px] h-[500px] rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10">
        {/* ═══════════════════════════════════════════════════════════════════
            HEADER
        ═══════════════════════════════════════════════════════════════════ */}
        <header className="relative overflow-hidden">
          {/* Gradient bar */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.12) 40%, rgba(168,85,247,0.08) 100%)' }} />
          <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.3), transparent)' }} />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Back button */}
            <button
              onClick={() => navigate('/meetings')}
              className="group inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/90 transition-colors duration-200 mb-6"
            >
              <span className="flex items-center justify-center w-8 h-8 rounded-xl border border-white/10 bg-white/5 group-hover:bg-white/10 group-hover:border-white/20 transition-all duration-200 backdrop-blur-sm">
                {icons.back}
              </span>
              <span className="font-medium">Back to Meetings</span>
            </button>

            {/* Title area */}
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">{meeting.title}</h1>
                  <span
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
                    style={{
                      background:
                        meeting.status === 'Completed'
                          ? 'rgba(52,211,153,0.15)'
                          : meeting.status === 'Ongoing'
                          ? 'rgba(251,191,36,0.15)'
                          : meeting.status === 'Cancelled'
                          ? 'rgba(248,113,113,0.15)'
                          : 'rgba(96,165,250,0.15)',
                      color:
                        meeting.status === 'Completed'
                          ? '#34d399'
                          : meeting.status === 'Ongoing'
                          ? '#fbbf24'
                          : meeting.status === 'Cancelled'
                          ? '#f87171'
                          : '#60a5fa',
                    }}
                  >
                    {meeting.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/50">
                  <span className="inline-flex items-center gap-1.5">
                    {icons.calendar}
                    {dateStr}
                  </span>
                  {timeStr && (
                    <span className="inline-flex items-center gap-1.5">
                      {icons.clock}
                      {timeStr}
                    </span>
                  )}
                  {hostObj && (
                    <span className="inline-flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Hosted by {hostObj.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Stats pills */}
              <div className="flex flex-wrap gap-3">
                {/* Participants count */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                  <span className="text-indigo-400">{icons.users}</span>
                  <span className="text-sm font-medium text-white/70">{participantsList.length} Participant{participantsList.length !== 1 ? 's' : ''}</span>
                </div>
                {/* Duration */}
                {duration && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                    <span className="text-violet-400">{icons.clock}</span>
                    <span className="text-sm font-medium text-white/70">{duration}</span>
                  </div>
                )}
                {/* Transcript badge */}
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border backdrop-blur-sm"
                  style={{
                    borderColor: effectiveTranscript ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.1)',
                    background: effectiveTranscript ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.05)',
                  }}
                >
                  <span className={effectiveTranscript ? 'text-emerald-400' : 'text-white/30'}>{icons.transcript}</span>
                  <span className={`text-sm font-medium ${effectiveTranscript ? 'text-emerald-400/80' : 'text-white/30'}`}>
                    {effectiveTranscript ? 'Transcript' : 'No Transcript'}
                  </span>
                </div>
                {/* Recording badge */}
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border backdrop-blur-sm"
                  style={{
                    borderColor: effectiveRecordingUrl ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.1)',
                    background: effectiveRecordingUrl ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.05)',
                  }}
                >
                  <span className={effectiveRecordingUrl ? 'text-emerald-400' : 'text-white/30'}>{icons.recording}</span>
                  <span className={`text-sm font-medium ${effectiveRecordingUrl ? 'text-emerald-400/80' : 'text-white/30'}`}>
                    {effectiveRecordingUrl ? 'Recording' : 'No Recording'}
                  </span>
                </div>
                {/* Meeting code */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                  <span className="text-xs font-mono text-white/40 tracking-widest">{meeting.meetingId}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB NAVIGATION
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="sticky top-0 z-30 backdrop-blur-xl" style={{ background: 'rgba(10,15,30,0.85)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-1.5 py-3 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'text-white shadow-lg shadow-indigo-500/20'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                  }`}
                  style={
                    activeTab === tab.id
                      ? { background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }
                      : undefined
                  }
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
            {/* Subtle separator */}
            <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.2), transparent)' }} />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB CONTENT
        ═══════════════════════════════════════════════════════════════════ */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* ─── SUMMARY TAB ────────────────────────────────────────────── */}
          {activeTab === 'summary' && (
            <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
              {parsedSummary.length > 0 ? (
                parsedSummary.map((section, idx) => {
                  // Color-code sections based on heading keywords
                  const headingLower = section.heading.toLowerCase();
                  const isExecutive = headingLower.includes('executive') || headingLower.includes('overview') || idx === 0;
                  const isDecision = headingLower.includes('decision');
                  const isNextSteps = headingLower.includes('next') || headingLower.includes('action') || headingLower.includes('follow');

                  let borderColor = 'rgba(99,102,241,0.4)';
                  let bgColor = 'rgba(99,102,241,0.05)';
                  let dotColor = 'bg-indigo-400';
                  let headingColor = 'text-indigo-300';

                  if (isDecision) {
                    borderColor = 'rgba(52,211,153,0.4)';
                    bgColor = 'rgba(52,211,153,0.05)';
                    dotColor = 'bg-emerald-400';
                    headingColor = 'text-emerald-300';
                  } else if (isNextSteps) {
                    borderColor = 'rgba(251,191,36,0.4)';
                    bgColor = 'rgba(251,191,36,0.05)';
                    dotColor = 'bg-amber-400';
                    headingColor = 'text-amber-300';
                  } else if (isExecutive) {
                    borderColor = 'rgba(139,92,246,0.5)';
                    bgColor = 'rgba(139,92,246,0.06)';
                    dotColor = 'bg-violet-400';
                    headingColor = 'text-violet-300';
                  }

                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border backdrop-blur-sm overflow-hidden transition-all duration-300 hover:scale-[1.005]"
                      style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}
                    >
                      {/* Left gradient border accent */}
                      <div className="flex">
                        <div className="w-1 shrink-0 rounded-l-2xl" style={{ background: borderColor }} />
                        <div className="flex-1 p-6" style={{ background: bgColor }}>
                          <h3 className={`text-base font-semibold mb-4 ${headingColor}`}>{section.heading}</h3>
                          <ul className="space-y-3">
                            {section.items.map((item, i) => (
                              <li key={i} className="flex items-start gap-3">
                                <span className={`w-1.5 h-1.5 rounded-full ${dotColor} mt-2 shrink-0`} />
                                <span className="text-sm text-white/70 leading-relaxed">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyState
                  icon={icons.emptyDoc}
                  title="No Summary Available"
                  description="A summary wasn't generated for this meeting. AI summaries are created automatically when a transcript is available."
                />
              )}
            </div>
          )}

          {/* ─── TRANSCRIPT TAB ─────────────────────────────────────────── */}
          {activeTab === 'transcript' && (
            <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
              {effectiveTranscript ? (
                <>
                  {/* Toolbar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">{icons.search}</span>
                      <input
                        type="text"
                        placeholder="Search transcript…"
                        value={transcriptSearch}
                        onChange={(e) => setTranscriptSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all duration-200"
                      />
                    </div>
                    {/* Download */}
                    <button
                      onClick={downloadTranscript}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200"
                    >
                      {icons.download}
                      Download
                    </button>
                  </div>

                  {/* Transcript entries */}
                  <div className="space-y-2">
                    {filteredTranscript.length > 0 ? (
                      filteredTranscript.map((entry, idx) => {
                        const colorGrad = hashColor(entry.speaker);
                        return (
                          <div
                            key={idx}
                            className="group flex items-start gap-3 p-4 rounded-2xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.08] transition-all duration-200"
                          >
                            {/* Avatar */}
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${colorGrad} flex items-center justify-center shrink-0 shadow-lg`}>
                              <span className="text-xs font-bold text-white">{initials(entry.speaker)}</span>
                            </div>
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-white/80">{entry.speaker}</span>
                                {entry.timestamp && (
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-white/30">{entry.timestamp}</span>
                                )}
                              </div>
                              <p className="text-sm text-white/55 leading-relaxed">{entry.message}</p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-12 text-center">
                        <p className="text-sm text-white/40">No entries match your search.</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={icons.emptyChat}
                  title="No Transcript Available"
                  description="A transcript wasn't captured for this meeting. Transcripts are generated automatically during meetings with AI transcription enabled."
                />
              )}
            </div>
          )}

          {/* ─── RECORDING TAB ──────────────────────────────────────────── */}
          {activeTab === 'recording' && (
            <div className="animate-[fadeIn_0.3s_ease-out]">
              {effectiveRecordingUrl ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm overflow-hidden">
                    <video
                      controls
                      className="w-full aspect-video bg-black"
                      src={effectiveRecordingUrl}
                      style={{ outline: 'none' }}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={effectiveRecordingUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] shadow-lg shadow-indigo-500/20"
                      style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                    >
                      {icons.download}
                      Download Recording
                    </a>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={icons.emptyCamera}
                  title="No Recording Available"
                  description="No recording was captured for this meeting. Recordings can be enabled by the host before or during the meeting."
                />
              )}
            </div>
          )}

          {/* ─── PARTICIPATION TAB ──────────────────────────────────────── */}
          {activeTab === 'participation' && (
            <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
              {/* Stats row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-5">
                  <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1">Participants</p>
                  <p className="text-2xl font-bold text-white">{participantsList.length}</p>
                </div>
                {duration && (
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-5">
                    <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1">Duration</p>
                    <p className="text-2xl font-bold text-white">{duration}</p>
                  </div>
                )}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-5">
                  <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1">Status</p>
                  <p className="text-2xl font-bold text-white">{meeting.status}</p>
                </div>
              </div>

              {/* Participant cards */}
              {participantsList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {participantsList.map((p) => {
                    const isHost = hostObj && p._id === hostObj._id;
                    const colorGrad = hashColor(p.name);
                    return (
                      <div
                        key={p._id}
                        className="group rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-5 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-300"
                      >
                        <div className="flex items-center gap-4">
                          {/* Avatar */}
                          {p.avatar ? (
                            <img
                              src={p.avatar}
                              alt={p.name}
                              className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/10"
                            />
                          ) : (
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorGrad} flex items-center justify-center shadow-lg`}>
                              <span className="text-sm font-bold text-white">{initials(p.name)}</span>
                            </div>
                          )}
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-white/90 truncate">{p.name}</p>
                              {isHost && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider" style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa' }}>
                                  Host
                                </span>
                              )}
                              {!isHost && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                                  Member
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-white/40 truncate mt-0.5">{p.email}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={
                    <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  }
                  title="No Participant Data"
                  description="Participant information is not available for this meeting."
                />
              )}
            </div>
          )}

          {/* ─── TASKS TAB ──────────────────────────────────────────────── */}
          {activeTab === 'tasks' && (
            <div className="space-y-3 animate-[fadeIn_0.3s_ease-out]">
              {actionItems.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-white/40">
                      {actionItems.filter((a) => a.completed).length} of {actionItems.length} completed
                    </p>
                  </div>
                  {actionItems.map((item, idx) => (
                    <div
                      key={idx}
                      className={`group flex items-start gap-4 p-5 rounded-2xl border backdrop-blur-sm transition-all duration-300 hover:scale-[1.003] ${
                        item.completed
                          ? 'border-emerald-500/10 bg-emerald-500/[0.03]'
                          : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/[0.1]'
                      }`}
                    >
                      {/* Checkbox */}
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border transition-all duration-200 ${
                          item.completed
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                            : 'border-white/20 bg-white/5'
                        }`}
                      >
                        {item.completed && icons.check}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-relaxed ${item.completed ? 'text-white/40 line-through' : 'text-white/80'}`}>
                          {item.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {/* Assignee */}
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc' }}>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {item.assignee}
                          </span>
                          {/* Due date */}
                          {item.dueDate && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: 'rgba(251,191,36,0.12)', color: '#fcd34d' }}>
                              {icons.calendar}
                              {format(new Date(item.dueDate), 'MMM d, yyyy')}
                            </span>
                          )}
                          {/* Completion badge */}
                          {item.completed && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: 'rgba(52,211,153,0.12)', color: '#6ee7b7' }}>
                              {icons.check}
                              Done
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <EmptyState
                  icon={icons.emptyTasks}
                  title="No Action Items"
                  description="No action items were captured from this meeting. Action items are automatically extracted when AI transcription is enabled."
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Global animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

export default PostMeetingDashboard;
