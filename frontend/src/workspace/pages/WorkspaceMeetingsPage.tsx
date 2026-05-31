import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom'; // 🚀 BUG FIX: Added Navigate import
import { useAuth } from '../../context/auth';
import { useAuthStore } from '../../stores/authStore';
import MeetingDetailsDrawer from '../components/MeetingDetailsDrawer';
import WorkspaceFrame from '../components/WorkspaceFrame';
import { apiService, type MeetingData } from '../../services/api';
import { format, isValid } from 'date-fns';

export default function WorkspaceMeetingsPage() {
  const { user } = useAuth();
  const isLoading = useAuthStore((state) => state.isLoading);
  const [meetings, setMeetings] = useState<MeetingData[]>([]);
  const navigate = useNavigate();
  const [isMeetingDrawerOpen, setIsMeetingDrawerOpen] = useState(false);
  const [drawerDefaultType, setDrawerDefaultType] = useState('Instant');

  async function loadMeetings() {
    try {
      const response = await apiService.getMeetings();
      setMeetings(response.data || []);
    } catch (error) {
      console.error("Failed to fetch meetings:", error);
    }
  }

  useEffect(() => {
    if (user) {
      loadMeetings();
    }
  }, [user]);

  // ✅ FIX: Actually create the meeting via API using the drawer form values
  async function handleCreateMeeting(values: { title: string; scheduledFor?: string; duration?: string }) {
    try {
      const payload: { title: string; scheduledStartTime?: string; scheduledEndTime?: string } = {
        title: values.title || 'Untitled Meeting',
      };
      if (values.scheduledFor) {
        payload.scheduledStartTime = new Date(values.scheduledFor).toISOString();
        // Calculate end time from duration
        const durationMinutes = parseInt(values.duration || '30') || 30;
        const endDate = new Date(new Date(values.scheduledFor).getTime() + durationMinutes * 60000);
        payload.scheduledEndTime = endDate.toISOString();
      }
      await apiService.createMeeting(payload);
      await loadMeetings();
    } catch (error) {
      console.error("Failed to create meeting:", error);
    }
  }

  const handleDeleteMeeting = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this meeting?")) {
      try {
        await apiService.deleteMeeting(id);
        setMeetings(meetings.filter(m => m._id !== id));
      } catch (error) {
        console.error("Failed to delete meeting:", error);
      }
    }
  };

  const formatMeetingDate = (meeting: MeetingData) => {
    if (meeting.status === 'Ongoing') return "Ongoing - Starts now";
    
    const date = meeting.scheduledStartTime ? new Date(meeting.scheduledStartTime) : null;
    if (date && isValid(date)) {
      return format(date, 'MMM dd, yyyy - hh:mm a');
    }
    
    return "Time TBD";
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7fbf8]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // 🚀 BUG FIX: Restored Auth Guard
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <WorkspaceFrame>
      <>
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
            <p className="text-gray-500">Manage your upcoming and past sessions</p>
          </div>
          {user?.role === 'Admin' && (
            <button
              onClick={() => {
                setDrawerDefaultType('Scheduled');
                setIsMeetingDrawerOpen(true);
              }}
              className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white transition hover:bg-emerald-700"
            >
              + New Meeting
            </button>
          )}
        </header>

        <section className="space-y-4">
          <div className="grid gap-4">
            {meetings.map((meeting) => (
              <article key={meeting._id} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{meeting.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">Status: <span className="capitalize">{meeting.status}</span></p>
                    <p className="text-sm font-medium text-emerald-600">
                      {formatMeetingDate(meeting)}
                    </p>
                  </div>
                  
                  <div className="flex gap-2 self-start lg:self-center">
                    {(meeting.status === 'Ongoing' || meeting.status === 'Scheduled') && (
                      <button
                        type="button"
                        onClick={() => navigate(`/dashboard/meetings/${meeting._id}/video`)}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
                      >
                        {meeting.status === 'Ongoing' ? 'Join Room' : 'Start Meeting'}
                      </button>
                    )}
                    
                    {(user?.role === 'Admin' || user?.id === (typeof meeting.host === 'object' ? meeting.host._id : meeting.host)) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMeeting(meeting._id)}
                        className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-bold text-rose-600 transition hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
            {meetings.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                {user?.role === 'Admin' ? 'No meetings found. Create your first meeting to get started.' : 'No meetings found. Ask your admin to create a meeting.'}
              </div>
            )}
          </div>
        </section>

        {isMeetingDrawerOpen && (
          <MeetingDetailsDrawer
            defaultType={drawerDefaultType}
            onClose={() => setIsMeetingDrawerOpen(false)}
            onCreate={handleCreateMeeting}
          />
        )}
      </>
    </WorkspaceFrame>
  );
}