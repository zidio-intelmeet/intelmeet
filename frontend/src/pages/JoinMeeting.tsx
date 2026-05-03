import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export default function JoinMeeting() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const joinMeeting = async () => {
      // Check if user is authenticated
      if (!user) {
        // Redirect to login with callback
        navigate(`/login?callback=/meetings/${code}/join`);
        return;
      }

      try {
        // Fetch meeting details
        if (!code) {
          setError('Invalid meeting code');
          setLoading(false);
          return;
        }

        const res = await apiService.getMeetingByCode(code);
        const meeting = res.data;

        if (!meeting) {
          setError('Meeting not found');
          setLoading(false);
          return;
        }

        // Redirect to video room
        navigate(`/dashboard/meetings/${meeting._id}/video`);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to join meeting. Meeting might be closed or invalid.'
        );
        setLoading(false);
      }
    };

    joinMeeting();
  }, [code, user, navigate]);

  if (loading) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-600/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg
              className="w-8 h-8 text-indigo-500 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <p className="text-white font-medium">Joining meeting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-white font-bold text-lg mb-2">Unable to Join Meeting</h2>
        <p className="text-slate-300 mb-6">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/dashboard/meetings')}
            className="flex-1 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
          >
            View Meetings
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
