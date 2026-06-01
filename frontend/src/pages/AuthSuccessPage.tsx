import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiService } from '../services/api';
import { useAuthStore } from '../stores/authStore';

/**
 * This page handles the Google OAuth callback redirect.
 * After Google auth, the backend sets an HttpOnly refreshToken cookie
 * and redirects here. We call /api/auth/refresh to get a new access token,
 * then /api/auth/me to get the user profile, then navigate to /workspace.
 *
 * IMPORTANT: This only works correctly when the GOOGLE_CALLBACK_URL in the
 * backend .env points to the same domain as VITE_API_URL (e.g. both localhost:3001).
 * If the callback goes through a different domain (like ngrok), the cookie will
 * be set for that domain and the /api/auth/refresh call will return 401.
 */
export default function AuthSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setLoading = useAuthStore((s) => s.setLoading);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if Google redirected back with an error flag (e.g. /auth/success?error=google_auth_failed)
    const oauthError = searchParams.get('error');
    if (oauthError) {
      const errorMessages: Record<string, string> = {
        google_auth_failed: 'Google authentication was cancelled or failed.',
        google_token_failed: 'Failed to exchange Google authorization code.',
        google_token_missing: 'Google did not return a valid token.',
        google_profile_failed: 'Failed to fetch your Google profile.',
        google_profile_incomplete: 'Google profile data is incomplete.',
        google_auth_exception: 'An unexpected error occurred during Google sign-in.',
      };
      setError(errorMessages[oauthError] ?? 'Google authentication failed.');
      setLoading(false);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
      return;
    }

    const handleCallback = async () => {
      try {
        // The backend set a refreshToken HttpOnly cookie after Google auth.
        // Call /refresh to exchange that cookie for a new access token in memory.
        const refreshRes = await apiService.refreshToken();
        const accessToken = refreshRes.data?.accessToken;

        if (!accessToken) {
          throw new Error(
            'Could not get access token. If running locally, make sure GOOGLE_CALLBACK_URL (backend) ' +
            'and VITE_API_URL (frontend) use the same host. If deployed, ensure VITE_API_URL is set to ' +
            'your deployed backend URL and the backend supports SameSite: None cookies.'
          );
        }

        apiService.setAccessToken(accessToken);

        // Fetch user profile with the new access token
        const meRes = await apiService.getMe();
        if (meRes.data) {
          setAuth(meRes.data, accessToken);
          navigate('/workspace', { replace: true });
        } else {
          throw new Error('Failed to fetch user profile after Google sign-in.');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
        setLoading(false);
        setTimeout(() => navigate('/login', { replace: true }), 4000);
      }
    };

    handleCallback();
  }, [navigate, setAuth, setLoading, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md px-6">
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
