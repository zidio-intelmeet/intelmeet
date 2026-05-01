import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { useAuthStore } from '../stores/authStore';

/**
 * This page handles the Google OAuth callback redirect.
 * After Google auth, the backend sets HttpOnly cookies (accessToken, refreshToken)
 * and redirects here. We call /api/auth/me to get the user profile,
 * then navigate to the dashboard.
 */
export default function AuthSuccessPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setLoading = useAuthStore((s) => s.setLoading);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // The backend already set the access token as an HttpOnly cookie.
        // We need to refresh to get a fresh access token we can store in memory.
        const refreshRes = await apiService.refreshToken();
        const accessToken = refreshRes.data?.accessToken;

        if (!accessToken) {
          throw new Error('Failed to obtain access token');
        }

        apiService.setAccessToken(accessToken);

        // Now fetch the user profile
        const meRes = await apiService.getMe();
        if (meRes.data) {
          setAuth(meRes.data, accessToken);
          navigate('/dashboard', { replace: true });
        } else {
          throw new Error('Failed to fetch user profile');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setLoading(false);
        // Redirect to login after a delay
        setTimeout(() => navigate('/login', { replace: true }), 3000);
      }
    };

    handleCallback();
  }, [navigate, setAuth, setLoading]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Authentication Failed</h2>
          <p className="text-sm text-slate-500 mb-2">{error}</p>
          <p className="text-xs text-slate-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <svg className="w-10 h-10 mx-auto mb-4 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Signing you in...</h2>
        <p className="text-sm text-slate-500">Please wait while we complete your authentication</p>
      </div>
    </div>
  );
}
