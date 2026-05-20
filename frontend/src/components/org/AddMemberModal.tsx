import { useState, type FormEvent } from 'react';
import { apiService } from '../../services/api';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemberAdded: () => void;
  organizationId: string;
}

export function AddMemberModal({ isOpen, onClose, onMemberAdded, organizationId }: AddMemberModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Admin' | 'Member' | 'Viewer'>('Member');
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [invitationLink, setInvitationLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setInvitationLink('');

    if (!organizationId) {
      setError('No organization selected. Please try again.');
      return;
    }
    if (!name.trim()) {
      setError('Member name is required');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Valid email is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiService.addMember(organizationId, email.trim(), role, name.trim());
      
      const data = response.data as { invitationLink?: string; emailSent?: boolean };
      const link = data?.invitationLink || '';
      const emailSent = data?.emailSent;

      if (emailSent) {
        setSuccess('Invitation email sent successfully!');
      } else {
        setSuccess('Invitation created! Share the link below with the member.');
      }
      
      if (link) {
        setInvitationLink(link);
      }

      onMemberAdded();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add member';
      console.error('Add member error:', err);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(invitationLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleClose = () => {
    setName('');
    setEmail('');
    setRole('Member');
    setIsRoleMenuOpen(false);
    setError('');
    setSuccess('');
    setInvitationLink('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-fade-up">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Add Team Member</h2>
          <p className="text-slate-500 mt-1.5 text-sm">Invite a new member to your workspace</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm flex items-start gap-2">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        {/* Invitation Link Box — shown after successful invite */}
        {invitationLink && (
          <div className="mb-4 p-4 rounded-xl bg-blue-50 border border-blue-200">
            <p className="text-xs font-semibold text-blue-800 mb-2">📋 Invitation Link</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={invitationLink}
                className="flex-1 text-xs bg-white border border-blue-200 rounded-lg px-3 py-2 text-blue-900 truncate"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`shrink-0 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  linkCopied
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {linkCopied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-[10px] text-blue-600 mt-2">Share this link with the member so they can join your workspace.</p>
          </div>
        )}

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="member-name" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Full Name
              </label>
              <input
                id="member-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., John Doe"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-slate-900 text-sm placeholder-slate-400 transition-all focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="member-email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                id="member-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-slate-900 text-sm placeholder-slate-400 transition-all focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                disabled={isSubmitting}
              />
            </div>

            {/* Role */}
            <div className="relative">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Role
              </span>
              <button
                type="button"
                onClick={() => setIsRoleMenuOpen((isOpen) => !isOpen)}
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                disabled={isSubmitting}
              >
                <span>{role === 'Viewer' ? 'Viewer (Read-only)' : role}</span>
                <span className="text-slate-400">⌄</span>
              </button>
              {isRoleMenuOpen && (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-2xl border border-emerald-100 bg-white p-4 shadow-xl shadow-emerald-950/10">
                  <div className="flex items-center justify-between border-b border-emerald-50 pb-3">
                    <h3 className="text-sm font-bold text-slate-900">Role</h3>
                    <button
                      type="button"
                      onClick={() => setIsRoleMenuOpen(false)}
                      className="rounded-lg px-2 py-1 text-sm font-bold text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
                      aria-label="Close role menu"
                    >
                      ×
                    </button>
                  </div>
                  <div className="mt-3 space-y-1">
                    {[
                      { value: 'Member' as const, label: 'Member' },
                      { value: 'Admin' as const, label: 'Admin' },
                      { value: 'Viewer' as const, label: 'Viewer (Read-only)' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setRole(option.value)
                          setIsRoleMenuOpen(false)
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-emerald-50"
                      >
                        <span>{option.label}</span>
                        <span
                          className={[
                            'flex h-5 w-5 items-center justify-center rounded-full border',
                            role === option.value ? 'border-emerald-600' : 'border-slate-300',
                          ].join(' ')}
                        >
                          {role === option.value && <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-emerald-50 rounded-xl p-3">
              <div className="flex items-start gap-2.5">
                <svg className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  An invitation link will be generated. If the email fails to deliver, you can copy and share the link manually.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending...
                  </span>
                ) : 'Send Invitation'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-8 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-all"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
