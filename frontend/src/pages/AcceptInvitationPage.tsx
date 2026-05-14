import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/auth';
import { apiService } from '../services/api';

interface InvitationData {
  valid: boolean;
  memberEmail: string;
  memberName: string;
  organizationName: string;
  organizationId: string;
  role: string;
}

export const AcceptInvitationPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    const validateInvitation = async () => {
      try {
        if (!token) {
          setError('No invitation token provided');
          setIsLoading(false);
          return;
        }

        const response = await apiService.validateInvitation(token);
        if (response.data?.valid) {
          setInvitationData(response.data);
        } else {
          setError('Invalid or expired invitation');
        }
      } catch (err) {
        console.error('Validation error:', err);
        setError('Failed to validate invitation. Please check the link and try again.');
      } finally {
        setIsLoading(false);
      }
    };

    validateInvitation();
  }, [token]);

  const handleAcceptInvitation = async () => {
    if (!user) {
      navigate('/login', { state: { returnTo: `/accept-invitation?token=${token}` } });
      return;
    }

    if (!token) return;

    setIsAccepting(true);
    try {
      const response = await apiService.acceptInvitation(token);
      if (response.data?.organizationId) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setError(response.message || 'Failed to accept invitation');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Aboard!</h1>
          <p className="text-gray-600 mb-4">You've successfully joined the organization.</p>
          <p className="text-sm text-gray-400">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitation Invalid</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!invitationData) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You're Invited!</h1>
          <p className="text-gray-600">Join {invitationData.organizationName} on IntellMeet</p>
        </div>

        {/* Invitation Details */}
        <div className="bg-emerald-50 rounded-lg p-6 mb-8 space-y-4">
          <div>
            <p className="text-sm text-gray-600">Organization</p>
            <p className="text-lg font-semibold text-gray-900">{invitationData.organizationName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Your Email</p>
            <p className="text-lg font-semibold text-gray-900">{invitationData.memberEmail}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Your Role</p>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-200 text-emerald-800 rounded-full text-sm font-semibold">
                {invitationData.role}
              </span>
            </div>
          </div>
        </div>

        {/* What you can do */}
        <div className="mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">As a member, you'll be able to:</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <span className="text-emerald-600">✓</span> View meetings assigned to you
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-600">✓</span> See tasks on the kanban board
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-600">✓</span> Collaborate with your team
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-600">✓</span> Manage your schedule
            </li>
          </ul>
        </div>

        {/* Action Button */}
        {user ? (
          <button
            onClick={handleAcceptInvitation}
            disabled={isAccepting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold transition-colors"
          >
            {isAccepting ? 'Accepting Invitation...' : 'Accept Invitation'}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-center text-gray-600 text-sm">You need to be logged in to accept this invitation</p>
            <button
              onClick={() => navigate('/login', { state: { returnTo: `/accept-invitation?token=${token}` } })}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-semibold transition-colors"
            >
              Login to Accept
            </button>
            <button
              onClick={() => navigate('/register', { state: { returnTo: `/accept-invitation?token=${token}` } })}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 py-3 rounded-lg font-semibold transition-colors"
            >
              Create New Account
            </button>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          This invitation link expires in 7 days
        </p>
      </div>
    </div>
  );
};

export default AcceptInvitationPage;
