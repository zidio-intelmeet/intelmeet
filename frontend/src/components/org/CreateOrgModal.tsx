import { useState, type FormEvent } from 'react';
import { apiService } from '../../services/api';

interface CreateOrgModalProps {
  isOpen: boolean;
  onCreated: () => void;
}

export function CreateOrgModal({ isOpen, onCreated }: CreateOrgModalProps) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Organization name is required'); return; }
    if (name.trim().length < 2) { setError('Name must be at least 2 characters'); return; }

    setIsSubmitting(true);
    try {
      await apiService.createOrganization(name.trim());
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-fade-up">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Create Your Organization</h2>
          <p className="text-slate-500 mt-1.5 text-sm">Set up your workspace to start collaborating with your team</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="org-name" className="block text-sm font-semibold text-slate-700 mb-1.5">Organization Name</label>
            <input
              id="org-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Acme Corp, My Team"
              className="w-full px-4 py-3 rounded-xl border bg-white text-slate-900 text-sm placeholder-slate-400 transition-all input-ring"
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          <div className="bg-indigo-50 rounded-xl p-3">
            <div className="flex items-start gap-2.5">
              <svg className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-indigo-700 leading-relaxed">
                You'll be the <strong>Admin</strong> of this organization. You can invite team members after setup.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating...
              </span>
            ) : 'Create Organization'}
          </button>
        </form>
      </div>
    </div>
  );
}
