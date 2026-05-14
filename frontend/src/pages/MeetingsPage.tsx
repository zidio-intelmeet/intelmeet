import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService, type MeetingData } from '../services/api';
import { ShareMeetingModal } from '../components/meeting/ShareMeetingModal';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../stores/authStore';

export default function MeetingsPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<MeetingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [showShare, setShowShare] = useState(false);
  const [shareData, setShareData] = useState<{ id: string; code: string } | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const fetchMeetings = async () => {
    try {
      const res = await apiService.getMeetings();
      setMeetings(res.data || []);
    } catch { /* empty */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMeetings(); }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    setCreating(true); setError('');
    try {
      const payload: any = { title: title.trim(), description: description.trim() || undefined };
      if (scheduledAt) {
        payload.scheduledStartTime = new Date(scheduledAt).toISOString();
        payload.scheduledEndTime = new Date(new Date(scheduledAt).getTime() + 60 * 60 * 1000).toISOString();
      }
      const res = await apiService.createMeeting(payload);
      const meeting = res.data;
      setShowCreate(false); setTitle(''); setDescription(''); setScheduledAt('');
      if (meeting) {
        setShareData({ id: meeting._id, code: meeting.meetingId });
        setShowShare(true);
      }
      fetchMeetings();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to create meeting'); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this meeting?')) return;
    try { await apiService.deleteMeeting(id); fetchMeetings(); } catch { /* empty */ }
  };

  const handleStartMeeting = async (meeting: MeetingData) => {
    try {
      if (meeting.status === 'Scheduled') {
        await apiService.startMeeting(meeting._id);
      }
      navigate(`/dashboard/meetings/${meeting._id}/video`);
    } catch (err) {
      console.error('Error starting meeting:', err);
      alert(err instanceof Error ? err.message : 'Failed to start meeting');
    }
  };

  const handleJoinMeeting = async (meeting: MeetingData) => {
    try {
      await apiService.joinMeetingAsParticipant(meeting._id);
      navigate(`/dashboard/meetings/${meeting._id}/video`);
    } catch (err) {
      console.error('Error joining meeting:', err);
      alert(err instanceof Error ? err.message : 'Failed to join meeting');
    }
  };

  const handleJoinByCode = async (e: FormEvent) => {
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

  const getHostName = (meeting: MeetingData) => {
    if (typeof meeting.host === 'string') return 'Unknown';
    return meeting.host.name;
  };

  const isHost = (meeting: MeetingData) => {
    if (typeof meeting.host === 'string') return meeting.host === user?.id;
    return meeting.host._id === user?.id;
  };

  // Separate meetings by status
  const liveMeetings = meetings.filter(m => m.status === 'Ongoing');
  const scheduledMeetings = meetings.filter(m => m.status === 'Scheduled');
  const pastMeetings = meetings.filter(m => m.status === 'Completed' || m.status === 'Cancelled');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meetings</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your video meetings</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Join by Code */}
          <form onSubmit={handleJoinByCode} className="flex items-center gap-2">
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              placeholder="Enter code (e.g. a1b2-c3d4)"
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm w-44 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
            />
            <button type="submit" className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium text-slate-700 transition-colors">
              Join
            </button>
          </form>
          {user?.role === 'Admin' && (
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New Meeting
            </button>
          )}
        </div>
      </div>

      {joinError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{joinError}</div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Create Meeting</h2>
            {error && <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Team standup" className="w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this meeting about?" rows={3} className="w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Schedule (optional)</label>
                <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreate(false); setError(''); }} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" disabled={creating} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60">
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Meetings List */}
      {loading ? (
        <div className="flex justify-center py-12"><svg className="w-8 h-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></div>
      ) : meetings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No meetings yet</h3>
          <p className="text-slate-500 text-sm mt-1">Create your first meeting to get started</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ══ LIVE MEETINGS ══════════════════════════════════ */}
          {liveMeetings.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                <h2 className="text-sm font-bold text-green-700 uppercase tracking-wider">Live Now</h2>
              </div>
              <div className="grid gap-4">
                {liveMeetings.map((meeting) => (
                  <div key={meeting._id} className="relative bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 rounded-2xl border-2 border-green-300 p-5 shadow-lg shadow-green-100/50 hover:shadow-xl transition-all">
                    {/* Glow effect */}
                    <div className="absolute inset-0 rounded-2xl bg-green-400/5 animate-pulse pointer-events-none" />
                    <div className="relative flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1">
                          <h3 className="text-base font-bold text-slate-900 truncate">{meeting.title}</h3>
                          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500 text-white animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            LIVE
                          </span>
                        </div>
                        {meeting.description && <p className="text-sm text-slate-600 line-clamp-1 mb-2">{meeting.description}</p>}
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>Host: <strong>{getHostName(meeting)}</strong></span>
                          <span>{meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}</span>
                          <span className="font-mono text-green-600 font-bold">#{meeting.meetingId}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleJoinMeeting(meeting)}
                        className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        Join Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ SCHEDULED MEETINGS ═════════════════════════════ */}
          {scheduledMeetings.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Upcoming
              </h2>
              <div className="grid gap-3">
                {scheduledMeetings.map((meeting) => (
                  <div key={meeting._id} className="bg-white rounded-2xl border border-blue-100 p-5 hover:shadow-md hover:border-blue-200 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1">
                          <h3 className="text-base font-semibold text-slate-900 truncate">{meeting.title}</h3>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Scheduled</span>
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
                        {(isHost(meeting) || user?.role === 'Admin') && (
                          <button
                            onClick={() => handleStartMeeting(meeting)}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors flex items-center gap-1.5"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
                            Start
                          </button>
                        )}
                        {(isHost(meeting) || user?.role === 'Admin') && (
                          <button onClick={() => handleDelete(meeting._id)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ PAST MEETINGS ═════════════════════════════════ */}
          {pastMeetings.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Past Meetings
              </h2>
              <div className="grid gap-3">
                {pastMeetings.map((meeting) => (
                  <div key={meeting._id} className="bg-white rounded-2xl border border-slate-100 p-5 opacity-80 hover:opacity-100 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1">
                          <h3 className="text-base font-semibold text-slate-700 truncate">{meeting.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            meeting.status === 'Completed' ? 'bg-slate-100 text-slate-600' : 'bg-red-100 text-red-600'
                          }`}>
                            {meeting.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span>
                            {meeting.actualEndTime
                              ? `Ended ${formatDistanceToNow(new Date(meeting.actualEndTime), { addSuffix: true })}`
                              : format(new Date(meeting.scheduledStartTime), 'MMM d, yyyy')}
                          </span>
                          <span>Host: {getHostName(meeting)}</span>
                          <span>{meeting.participants.length} participants</span>
                          {meeting.transcript && (
                            <span className="text-indigo-500 font-medium">📝 Transcript available</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Share Meeting Modal */}
      {shareData && (
        <ShareMeetingModal
          isOpen={showShare}
          meetingCode={shareData.code}
          meetingId={shareData.id}
          onClose={() => {
            setShowShare(false);
            setShareData(null);
          }}
        />
      )}
    </div>
  );
}
