import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService, type MeetingData } from '../services/api';
import { ShareMeetingModal } from '../components/meeting/ShareMeetingModal';
import { format } from 'date-fns';

export default function MeetingsPage() {
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
      const res = await apiService.createMeeting({ title: title.trim(), description: description.trim() || undefined, scheduledAt: scheduledAt || undefined });
      const meeting = res.data;
      setShowCreate(false); setTitle(''); setDescription(''); setScheduledAt('');
      if (meeting) {
        setShareData({ id: meeting._id, code: meeting.meetingCode });
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

  const handleJoinMeeting = async (meetingId: string, status: string) => {
    try {
      // If meeting is scheduled, start it first
      if (status === 'scheduled') {
        await apiService.startMeeting(meetingId);
      }
      // Navigate to video room
      navigate(`/dashboard/meetings/${meetingId}/video`);
    } catch (err) {
      console.error('Error joining meeting:', err);
      alert(err instanceof Error ? err.message : 'Failed to join meeting');
    }
  };

  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700',
    live: 'bg-green-100 text-green-700',
    ended: 'bg-slate-100 text-slate-600',
    cancelled: 'bg-red-100 text-red-600',
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meetings</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your video meetings</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Meeting
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-100 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Create Meeting</h2>
            {error && <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Team standup" className="w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm input-ring" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this meeting about?" rows={3} className="w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm input-ring resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Schedule (optional)</label>
                <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm input-ring" />
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
        <div className="grid gap-4">
          {meetings.map((meeting) => (
            <div key={meeting._id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <h3 className="text-base font-semibold text-slate-900 truncate">{meeting.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[meeting.status]}`}>{meeting.status}</span>
                  </div>
                  {meeting.description && <p className="text-sm text-slate-500 line-clamp-1 mb-2">{meeting.description}</p>}
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      {meeting.scheduledAt ? format(new Date(meeting.scheduledAt), 'MMM d, yyyy h:mm a') : format(new Date(meeting.createdAt), 'MMM d, yyyy')}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}
                    </span>
                    <span className="font-mono text-indigo-500">#{meeting.meetingCode}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {(meeting.status === 'scheduled' || meeting.status === 'live') && (
                    <button 
                      onClick={() => handleJoinMeeting(meeting._id, meeting.status)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {meeting.status === 'scheduled' ? 'Start' : 'Join'}
                    </button>
                  )}
                  {meeting.status === 'scheduled' && (
                    <button onClick={() => handleDelete(meeting._id)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
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
