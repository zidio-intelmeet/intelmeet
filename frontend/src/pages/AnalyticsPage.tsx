import { useState, useEffect } from 'react';
import { apiService, type MeetingData } from '../services/api';

export default function AnalyticsPage() {
  const [meetings, setMeetings] = useState<MeetingData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const r = await apiService.getMeetings(); setMeetings(r.data || []); }
      catch {} finally { setLoading(false); }
    })();
  }, []);

  const total = meetings.length;
  const live = meetings.filter(m => m.status === 'Ongoing').length;
  const ended = meetings.filter(m => m.status === 'Completed').length;
  const scheduled = meetings.filter(m => m.status === 'Scheduled').length;
  const totalDuration = meetings.reduce((sum, m) => {
    if (m.actualStartTime && m.actualEndTime) {
      return sum + (new Date(m.actualEndTime).getTime() - new Date(m.actualStartTime).getTime()) / 1000;
    }
    return sum;
  }, 0);
  const avgDuration = ended > 0 ? Math.round(totalDuration / ended / 60) : 0;
  const totalParticipants = meetings.reduce((sum, m) => sum + m.participants.length, 0);
  const withAI = meetings.filter(m => m.summary).length;

  const stats = [
    { label: 'Total Meetings', value: total, icon: '📹', color: 'bg-indigo-50 text-indigo-700' },
    { label: 'Live Now', value: live, icon: '🔴', color: 'bg-green-50 text-green-700' },
    { label: 'Scheduled', value: scheduled, icon: '📅', color: 'bg-blue-50 text-blue-700' },
    { label: 'Completed', value: ended, icon: '✅', color: 'bg-emerald-50 text-emerald-700' },
    { label: 'Avg Duration', value: `${avgDuration}m`, icon: '⏱️', color: 'bg-amber-50 text-amber-700' },
    { label: 'Total Participants', value: totalParticipants, icon: '👥', color: 'bg-violet-50 text-violet-700' },
    { label: 'AI Summaries', value: withAI, icon: '🤖', color: 'bg-pink-50 text-pink-700' },
    { label: 'Total Hours', value: `${Math.round(totalDuration / 3600)}h`, icon: '📊', color: 'bg-cyan-50 text-cyan-700' },
  ];

  if (loading) return <div className="flex justify-center py-12"><svg className="w-8 h-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900">Analytics</h1><p className="text-slate-500 text-sm mt-1">Meeting insights and productivity metrics</p></div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="text-2xl mb-2">{s.icon}</div>
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent meetings table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-900">Recent Meetings</h2></div>
        {meetings.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No meetings data yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-left"><th className="px-5 py-3 font-medium text-slate-500">Title</th><th className="px-5 py-3 font-medium text-slate-500">Status</th><th className="px-5 py-3 font-medium text-slate-500">Participants</th><th className="px-5 py-3 font-medium text-slate-500">Duration</th><th className="px-5 py-3 font-medium text-slate-500">AI</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {meetings.slice(0, 10).map(m => (
                  <tr key={m._id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">{m.title}</td>
                    <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.status === 'Ongoing' ? 'bg-green-100 text-green-700' : m.status === 'Completed' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700'}`}>{m.status === 'Ongoing' ? 'Live' : m.status}</span></td>
                    <td className="px-5 py-3 text-slate-600">{m.participants.length}</td>
                    <td className="px-5 py-3 text-slate-600">{m.actualStartTime && m.actualEndTime ? `${Math.round((new Date(m.actualEndTime).getTime() - new Date(m.actualStartTime).getTime()) / 60000)}m` : '—'}</td>
                    <td className="px-5 py-3">{m.summary ? <span className="text-green-600">✓</span> : <span className="text-slate-300">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
