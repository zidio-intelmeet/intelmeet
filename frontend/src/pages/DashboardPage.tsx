import { useAuthStore } from '../stores/authStore';
import { apiService } from '../services/api';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Meeting {
  _id: string;
  title: string;
  status: 'Scheduled' | 'Ongoing' | 'Completed' | 'Cancelled';
  meetingId: string;
  createdAt: string;
  scheduledStartTime: string;
  actualStartTime?: string;
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const response = await apiService.getMeetings();
      setMeetings(response.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const liveMeetings = meetings.filter((m) => m.status === 'Ongoing').length;
  const scheduledMeetings = meetings.filter((m) => m.status === 'Scheduled').length;
  const endedMeetings = meetings.filter((m) => m.status === 'Completed').length;
  const recentMeetings = meetings.slice(0, 3);

  const quickStats = [
    {
      label: 'Total Meetings',
      value: meetings.length.toString(),
      change: `${endedMeetings} completed`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      color: 'indigo',
    },
    {
      label: 'Active Meetings',
      value: liveMeetings.toString(),
      change: `${scheduledMeetings} scheduled`,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm0 0V6m0 0c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm0 0V6" />
        </svg>
      ),
      color: 'emerald',
    },
    {
      label: 'Total Participants',
      value: meetings.length.toString(),
      change: 'Across all meetings',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      color: 'amber',
    },
    {
      label: 'This Week',
      value: scheduledMeetings.toString(),
      change: 'Upcoming meetings',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'violet',
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', iconBg: 'bg-indigo-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', iconBg: 'bg-emerald-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', iconBg: 'bg-amber-100' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', iconBg: 'bg-violet-100' },
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {user?.name?.split(' ')[0] || 'there'} 👋
        </h1>
        <p className="text-slate-500 mt-1">Here's what's happening with your workspace today.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat) => {
          const colors = colorMap[stat.color];
          return (
            <div
              key={stat.label}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-500">{stat.label}</span>
                <div className={`w-9 h-9 rounded-xl ${colors.iconBg} flex items-center justify-center ${colors.text}`}>
                  {stat.icon}
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-400 mt-1">{stat.change}</p>
            </div>
          );
        })}
      </div>

      {/* Quick actions + Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {user?.role === 'Admin' && (
              <>
                <button
                  onClick={() => navigate('/meetings')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 group-hover:bg-indigo-200 flex items-center justify-center transition-colors">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Start Instant Meeting</p>
                    <p className="text-xs text-slate-500">Begin a video call right now</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/meetings')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center transition-colors">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Schedule Meeting</p>
                    <p className="text-xs text-slate-500">Plan a meeting for later</p>
                  </div>
                </button>

                <button onClick={() => navigate('/team')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-violet-50 hover:bg-violet-100 transition-colors text-left group">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 group-hover:bg-violet-200 flex items-center justify-center transition-colors">
                    <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Invite Team Members</p>
                    <p className="text-xs text-slate-500">Grow your workspace</p>
                  </div>
                </button>
              </>
            )}

            <button onClick={() => navigate('/projects')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors text-left group">
              <div className="w-10 h-10 rounded-xl bg-amber-100 group-hover:bg-amber-200 flex items-center justify-center transition-colors">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">View Kanban Board</p>
                <p className="text-xs text-slate-500">Manage your tasks and progress</p>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Meetings</h2>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : recentMeetings.length > 0 ? (
            <div className="space-y-3">
              {recentMeetings.map((meeting) => (
                <div
                  key={meeting._id}
                  className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                  onClick={() => navigate(`/dashboard/meetings/${meeting._id}/video`)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{meeting.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            meeting.status === 'Ongoing'
                              ? 'bg-green-100 text-green-800'
                              : meeting.status === 'Scheduled'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {meeting.status === 'Ongoing' ? 'Live' : meeting.status}
                        </span>
                        <span className="text-xs text-slate-500">Code: {meeting.meetingId}</span>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {meeting.scheduledStartTime
                      ? `Scheduled: ${format(new Date(meeting.scheduledStartTime), 'MMM dd, yyyy HH:mm')}`
                      : meeting.actualStartTime
                      ? `Started: ${format(new Date(meeting.actualStartTime), 'MMM dd, yyyy HH:mm')}`
                      : `Created: ${format(new Date(meeting.createdAt), 'MMM dd, yyyy HH:mm')}`}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-900">No meetings yet</p>
              <p className="text-xs text-slate-500 mt-1">Create your first meeting to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
