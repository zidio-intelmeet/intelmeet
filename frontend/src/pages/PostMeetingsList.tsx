import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService, type MeetingData } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../stores/authStore';

function DeleteIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

export default function PostMeetingsList() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<MeetingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleDelete = async (id: string) => {
    try { await apiService.deleteMeeting(id); fetchMeetings(); } catch { /* empty */ }
  };

  const getHostName = (meeting: MeetingData) => typeof meeting.host === 'string' ? 'Unknown' : meeting.host.name;
  const isHost = (meeting: MeetingData) => typeof meeting.host === 'string' ? meeting.host === user?.id : meeting.host._id === user?.id;

  const pastMeetings = meetings.filter(m => m.status === 'Completed' || m.status === 'Cancelled');
  
  const searchLower = searchQuery.toLowerCase();
  const searchFilter = (m: MeetingData) => {
    if (!searchLower) return true;
    const titleMatch = m.title?.toLowerCase().includes(searchLower);
    const hostMatch = typeof m.host !== 'string' && m.host.name?.toLowerCase().includes(searchLower);
    const dateMatch = m.createdAt && new Date(m.createdAt).toLocaleDateString().includes(searchLower);
    const scheduledMatch = m.scheduledStartTime && new Date(m.scheduledStartTime).toLocaleDateString().includes(searchLower);
    return titleMatch || hostMatch || dateMatch || scheduledMatch;
  };

  const filteredPastMeetings = pastMeetings.filter(searchFilter);

  return (
    <>
      <header className="border-b border-emerald-100 bg-white px-5 py-5 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Review & Summaries</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Post Meeting Dashboard</h1>
      </header>
      <section className="px-5 py-6 sm:px-8 lg:px-10">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full">
              <div className="relative w-full max-w-lg">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search past meetings by title, host, or date..."
                  className="w-full rounded-xl border border-emerald-100 bg-white px-10 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                />
                <svg className="absolute left-3 top-3 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <svg className="w-8 h-8 animate-spin text-emerald-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : filteredPastMeetings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">No past meetings found</h3>
              <p className="text-slate-500 text-sm mt-1">When you finish a meeting, it will appear here for review.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Past Meetings Archive
                </h2>
                <div className="grid gap-3">
                  {filteredPastMeetings.map((meeting) => (
                    <div 
                      key={meeting._id} 
                      className="bg-white rounded-2xl border border-slate-100 overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 hover:border-emerald-200 cursor-pointer"
                      onClick={() => navigate(`/dashboard/meetings/${meeting._id}/review`)}
                    >
                      <div className="flex items-start justify-between p-5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 mb-1">
                            <h3 className="text-base font-semibold text-slate-700 truncate">{meeting.title}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${meeting.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                              {meeting.status === 'Completed' ? 'Completed' : meeting.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              {meeting.actualEndTime
                                ? formatDistanceToNow(new Date(meeting.actualEndTime), { addSuffix: true })
                                : formatDistanceToNow(new Date(meeting.createdAt), { addSuffix: true })}
                            </span>
                            <span>Host: <span className="font-medium text-slate-600">{getHostName(meeting)}</span></span>
                            <span>{meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}</span>
                            {meeting.transcript && <span className="text-indigo-500 font-bold flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-md"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10" /></svg>Transcript</span>}
                            {meeting.recordingUrl && <span className="text-rose-500 font-bold flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-md"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" /></svg>Recording</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => navigate(`/dashboard/meetings/${meeting._id}/review`)} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-600/20">
                            Review Dashboard
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          </button>
                          {(isHost(meeting) || user?.role === 'Admin') && (
                            <button onClick={() => handleDelete(meeting._id)} className="p-2.5 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" aria-label="Delete"><DeleteIcon /></button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
