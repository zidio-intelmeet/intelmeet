import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService, type MeetingData } from '../services/api';
import { ShareMeetingModal } from '../components/meeting/ShareMeetingModal';
import { format } from 'date-fns';
import { useAuthStore } from '../stores/authStore';
import { NewMeetingDrawer } from './NewMeetingDrawer';
function DeleteIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

const ACTIVE_MEETING_STORAGE_KEY = 'intellmeet-active-meeting';

function readActiveMeetingId(): string | null {
  try {
    const raw = localStorage.getItem(ACTIVE_MEETING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { meetingId?: string };
    return parsed.meetingId || null;
  } catch {
    return null;
  }
}

function clearActiveMeeting() {
  try {
    localStorage.removeItem(ACTIVE_MEETING_STORAGE_KEY);
  } catch {
  }
}
export default function MeetingsPage() {
  const defaultDuration = (() => {
    try {
      const raw = localStorage.getItem('intellmeet-workspace-preferences');
      const preferences = raw ? JSON.parse(raw) as { defaultMeetingDuration?: string } : {};
      return preferences.defaultMeetingDuration || '30 minutes';
    } catch {
      return '30 minutes';
    }
  })();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<MeetingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [meetingType, setMeetingType] = useState('Instant');
  const [duration, setDuration] = useState(defaultDuration);
  const [openMenu, setOpenMenu] = useState<'type' | 'duration' | null>(null);
  const [meetingFilter, setMeetingFilter] = useState<'all' | 'current' | 'scheduled' | 'past'>('all');
  const [scheduledAt, setScheduledAt] = useState('');
  const [participants, setParticipants] = useState('');
  const [agenda, setAgenda] = useState('');
  const [recordMeeting, setRecordMeeting] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [showShare, setShowShare] = useState(false);
  const [shareData, setShareData] = useState<{ id: string; code: string } | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [localMeetings, setLocalMeetings] = useState<{ id: string; title: string; host: string; code: string }[] | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(() => readActiveMeetingId());
  
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const fetchMeetings = async () => {
    try {
      const res = await apiService.getMeetings();
      setMeetings(res.data || []);
    } catch { /* empty */ }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchMeetings(); }, []);
  useEffect(() => {
    const onFocus = () => fetchMeetings();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('intellmeet-meetings-v2');
      if (raw) setLocalMeetings(JSON.parse(raw));
    } catch {
      setLocalMeetings(null);
    }
  }, []);
  useEffect(() => {
    const syncActiveMeeting = () => setActiveMeetingId(readActiveMeetingId());
    window.addEventListener('focus', syncActiveMeeting);
    return () => window.removeEventListener('focus', syncActiveMeeting);
  }, []);
  const handleCreate = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    setCreating(true); setError('');
    try {
      const payload: { title: string; scheduledStartTime?: string; scheduledEndTime?: string } = { title: title.trim() };
      if (scheduledAt) {
        const durationMinutes = Number.parseInt(duration, 10) || 30;
        payload.scheduledStartTime = new Date(scheduledAt).toISOString();
        payload.scheduledEndTime = new Date(new Date(scheduledAt).getTime() + durationMinutes * 60 * 1000).toISOString();
      }
      const res = await apiService.createMeeting(payload);
      const meeting = res.data;
      setShowCreate(false); setTitle(''); setMeetingType('Instant'); setDuration(defaultDuration); setScheduledAt(''); setParticipants(''); setAgenda(''); setRecordMeeting(true);
      if (meeting) {
        setShareData({ id: meeting._id, code: meeting.meetingId });
        setShowShare(true);
      }
      fetchMeetings();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to create meeting'); }
    finally { setCreating(false); }
  };
  const handleDelete = async (id: string) => {
    try { await apiService.deleteMeeting(id); fetchMeetings(); } catch { /* empty */ }
  };
  const handleDeleteLocalMeeting = (id: string) => {
    setLocalMeetings((cur) => {
      const next = (cur || []).filter((m) => m.id !== id);
      try { localStorage.setItem('intellmeet-meetings-v2', JSON.stringify(next)); } catch { /* empty */ }
      return next;
    });
  };
  const handleStartMeeting = async (meeting: MeetingData) => {
    try {
      if (meeting.status === 'Scheduled') await apiService.startMeeting(meeting._id);
      navigate(`/dashboard/meetings/${meeting._id}/video`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start meeting');
    }
  };
  const handleJoinMeeting = async (meeting: MeetingData) => {
    try {
      if (meeting._id !== activeMeetingId) {
        await apiService.joinMeetingAsParticipant(meeting._id);
      }
      navigate(`/dashboard/meetings/${meeting._id}/video`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to join meeting');
    }
  };
  const handleJoinByCode = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoinError('');
    try {
      const res = await apiService.getMeetingByCode(joinCode.trim());
      if (res.data) {
        await apiService.joinMeetingAsParticipant(res.data._id);
        navigate(`/dashboard/meetings/${res.data._id}/video`);
      }
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Meeting not found');
    }
  };
  const getHostName = (meeting: MeetingData) => typeof meeting.host === 'string' ? 'Unknown' : meeting.host.name;
  const isHost = (meeting: MeetingData) => typeof meeting.host === 'string' ? meeting.host === user?.id : meeting.host._id === user?.id;
  const isTimeReached = (meeting: MeetingData) => meeting.scheduledStartTime ? now >= new Date(meeting.scheduledStartTime) : false;
  const liveMeetings = meetings
    .filter(m => m.status === 'Ongoing')
    .sort((a, b) => {
      if (a._id === activeMeetingId) return -1;
      if (b._id === activeMeetingId) return 1;
      return 0;
    });
  const scheduledMeetings = meetings.filter(m => m.status === 'Scheduled');
  const hasLocalMeetings = Boolean(localMeetings && localMeetings.length > 0);
  const searchLower = searchQuery.toLowerCase();
  const searchFilter = (m: MeetingData) => {
    if (!searchLower) return true;
    const titleMatch = m.title?.toLowerCase().includes(searchLower);
    const hostMatch = typeof m.host !== 'string' && m.host.name?.toLowerCase().includes(searchLower);
    const dateMatch = m.createdAt && new Date(m.createdAt).toLocaleDateString().includes(searchLower);
    const scheduledMatch = m.scheduledStartTime && new Date(m.scheduledStartTime).toLocaleDateString().includes(searchLower);
    return titleMatch || hostMatch || dateMatch || scheduledMatch;
  };

  const filteredLiveMeetings = (meetingFilter === 'all' || meetingFilter === 'current' ? liveMeetings : []).filter(searchFilter);
  const filteredScheduledMeetings = (meetingFilter === 'all' || meetingFilter === 'scheduled' ? scheduledMeetings : []).filter(searchFilter);
  const hasAnyMeetings =
    filteredLiveMeetings.length > 0 ||
    filteredScheduledMeetings.length > 0 ||
    hasLocalMeetings;
  const ongoingMeeting = filteredLiveMeetings.find((meeting) => meeting._id === activeMeetingId) || null;
  useEffect(() => {
    if (activeMeetingId && !ongoingMeeting) {
      clearActiveMeeting();
      setActiveMeetingId(null);
    }
  }, [activeMeetingId, ongoingMeeting]);
  return (
    <>
      <header className="border-b border-emerald-100 bg-white px-5 py-5 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Meetings</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Meetings</h1>
      </header>
      <section className="px-5 py-6 sm:px-8 lg:px-10">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenu((current) => current === 'type' ? null : 'type')}
                  className="flex min-w-44 items-center justify-between rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                >
                  <span>
                    {meetingFilter === 'all'
                      ? 'All active meetings'
                      : meetingFilter === 'current'
                        ? 'Current meetings'
                        : 'Scheduled meetings'}
                  </span>
                  <span className="text-slate-400">V</span>
                </button>
                {openMenu === 'type' && (
                  <div className="absolute right-0 top-full z-20 mt-2 w-52 rounded-2xl border border-emerald-100 bg-white p-3 shadow-xl shadow-emerald-950/10">
                    <div className="flex items-center justify-between border-b border-emerald-50 pb-2">
                      <h3 className="text-sm font-bold text-slate-900">Type</h3>
                      <button
                        type="button"
                        onClick={() => setOpenMenu(null)}
                        className="rounded-lg px-2 py-1 text-sm font-bold text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
                        aria-label="Close type menu"
                      >
                        ×
                      </button>
                    </div>
                    <div className="mt-2 space-y-0.5">
                      {[
                        { value: 'all' as const, label: 'All active meetings' },
                        { value: 'current' as const, label: 'Current meetings' },
                        { value: 'scheduled' as const, label: 'Scheduled meetings' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setMeetingFilter(option.value);
                            setOpenMenu(null);
                          }}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-emerald-50"
                        >
                          <span>{option.label}</span>
                          <span className={[
                            'flex h-5 w-5 items-center justify-center rounded-full border',
                            meetingFilter === option.value ? 'border-emerald-600' : 'border-slate-300',
                          ].join(' ')}>
                            {meetingFilter === option.value && <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, host, or date..."
                  className="w-full rounded-xl border border-emerald-100 bg-white px-10 py-2 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                />
                <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <form onSubmit={handleJoinByCode} className="flex items-center gap-2">
                <input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value)}
                  placeholder="Enter code (e.g. a1b2-c3d4)"
                  className="w-full rounded-xl border border-emerald-100 px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 sm:w-44"
                />
                <button type="submit" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100">
                  Join
                </button>
              </form>
              {user?.role === 'Admin' && (
                <button onClick={() => setShowCreate(true)} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-colors hover:bg-emerald-700">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  New Meeting
                </button>
              )}
            </div>
          </div>
          {joinError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{joinError}</div>
          )}
          {ongoingMeeting && (
            <div className="rounded-2xl border border-emerald-200 bg-linear-to-r from-emerald-50 via-white to-emerald-50 p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Ongoing Meeting</p>
                  <h2 className="mt-2 truncate text-xl font-bold text-slate-950">{ongoingMeeting.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    You already have this meeting open. Jump straight back in anytime.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/dashboard/meetings/${ongoingMeeting._id}/video`)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Return to meeting
                </button>
              </div>
            </div>
          )}          {showCreate && (
            <NewMeetingDrawer
              title={title}
              setTitle={setTitle}
              meetingType={meetingType}
              setMeetingType={setMeetingType}
              duration={duration}
              setDuration={setDuration}
              scheduledAt={scheduledAt}
              setScheduledAt={setScheduledAt}
              participants={participants}
              setParticipants={setParticipants}
              agenda={agenda}
              setAgenda={setAgenda}
              recordMeeting={recordMeeting}
              setRecordMeeting={setRecordMeeting}
              openMenu={openMenu}
              setOpenMenu={setOpenMenu}
              creating={creating}
              error={error}
              onSubmit={handleCreate}
              onClose={() => { setShowCreate(false); setError(''); }}
            />
          )}          {loading ? (
            <div className="flex justify-center py-12">
              <svg className="w-8 h-8 animate-spin text-emerald-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : !hasAnyMeetings ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">No meetings yet</h3>
              <p className="text-slate-500 text-sm mt-1">Create your first meeting to get started</p>
            </div>
          ) : (
            <div className="space-y-6">
              {localMeetings && localMeetings.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Local meetings</h2>
                  <div className="grid gap-3">
                    {localMeetings.map((lm) => (
                      <div key={lm.id} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-slate-900 truncate">{lm.title}</h3>
                            <p className="mt-2 text-sm text-slate-500">Hosted by {lm.host}</p>
                            <p className="mt-1 font-bold text-slate-800">Code: {lm.code}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button onClick={() => navigate(`/meeting/${lm.code}`)} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors">Join Room</button>
                            <button onClick={() => handleDeleteLocalMeeting(lm.id)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" aria-label="Delete"><DeleteIcon /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {filteredLiveMeetings.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                    <h2 className="text-sm font-bold text-green-700 uppercase tracking-wider">Live Now</h2>
                  </div>
                  <div className="grid gap-4">
                    {filteredLiveMeetings.map((meeting) => (
                      <div key={meeting._id} className="relative bg-linear-to-r from-green-50 via-emerald-50 to-teal-50 rounded-2xl border-2 border-green-300 p-5 shadow-lg shadow-green-100/50">
                        <div className="absolute inset-0 rounded-2xl bg-green-400/5 animate-pulse pointer-events-none" />
                        <div className="relative flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2.5 mb-1">
                              <h3 className="text-base font-bold text-slate-900 truncate">{meeting.title}</h3>
                              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500 text-white animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-white" />LIVE
                              </span>
                            </div>
                            {meeting.description && <p className="text-sm text-slate-600 line-clamp-1 mb-2">{meeting.description}</p>}
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span>Host: <strong>{getHostName(meeting)}</strong></span>
                              <span>{meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}</span>
                              <span className="font-mono text-green-600 font-bold">#{meeting.meetingId}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <button onClick={() => handleJoinMeeting(meeting)} className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-all shadow-md flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                              {meeting._id === activeMeetingId ? 'Continue' : 'Join Now'}
                            </button>
                            {(isHost(meeting) || user?.role === 'Admin') && (
                              <button onClick={() => handleDelete(meeting._id)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" aria-label="Delete"><DeleteIcon /></button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {filteredScheduledMeetings.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Upcoming
                  </h2>
                  <div className="grid gap-3">
                    {filteredScheduledMeetings.map((meeting) => {
                      const timeReached = isTimeReached(meeting);
                      return (
                        <div key={meeting._id} className={`bg-white rounded-2xl border p-5 transition-all ${timeReached ? 'border-green-300 shadow-md shadow-green-100/50' : 'border-blue-100 hover:shadow-md hover:border-blue-200'}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2.5 mb-1">
                                <h3 className="text-base font-semibold text-slate-900 truncate">{meeting.title}</h3>
                                {timeReached ? (
                                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Time to join!
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Scheduled</span>
                                )}
                              </div>
                              {meeting.description && <p className="text-sm text-slate-500 line-clamp-1 mb-2">{meeting.description}</p>}
                              <div className="flex items-center gap-4 text-xs text-slate-400">
                                <span className="flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  {format(new Date(meeting.scheduledStartTime), 'MMM d, yyyy h:mm a')}
                                </span>
                                <span>Host: {getHostName(meeting)}</span>
                                <span className="font-mono text-indigo-500">#{meeting.meetingId}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              {!isHost(meeting) && (
                                timeReached ? (
                                  <button onClick={() => handleJoinMeeting(meeting)} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-all shadow-md flex items-center gap-1.5 animate-pulse">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                    Join Now
                                  </button>
                                ) : (
                                  <button onClick={() => handleJoinMeeting(meeting)} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors flex items-center gap-1.5">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                    Join
                                  </button>
                                )
                              )}
                              {(isHost(meeting) || user?.role === 'Admin') && (
                                timeReached ? (
                                  <button onClick={() => handleStartMeeting(meeting)} className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-all shadow-md flex items-center gap-1.5 animate-pulse">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
                                    Join Now
                                  </button>
                                ) : (
                                  <button onClick={() => handleStartMeeting(meeting)} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors flex items-center gap-1.5">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
                                    Start
                                  </button>
                                )
                              )}
                              {(isHost(meeting) || user?.role === 'Admin') && (
                                <button onClick={() => handleDelete(meeting._id)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" aria-label="Delete"><DeleteIcon /></button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          {shareData && (
            <ShareMeetingModal
              isOpen={showShare}
              meetingCode={shareData.code}
              meetingId={shareData.id}
              onClose={() => { setShowShare(false); setShareData(null); }}
            />
          )}
        </div>
      </section>
    </>
  );
}



