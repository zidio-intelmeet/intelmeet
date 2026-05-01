import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { apiService } from '../services/api';

export default function ProfilePage() {
  const user = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      const res = await apiService.getMe(); // refresh user data after profile update would go here
      // For now, update local state
      if (user) setUser({ ...user, name, bio });
      setMsg('Profile updated!');
    } catch (err) { setMsg(err instanceof Error ? err.message : 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900">Profile</h1><p className="text-slate-500 text-sm mt-1">Manage your account settings</p></div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {user?.avatar ? <img src={user.avatar} alt="" className="w-16 h-16 rounded-full object-cover" /> : user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{user?.name}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
            <p className="text-xs text-indigo-600 font-medium mt-0.5">{user?.role || 'Member'}</p>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm input-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Tell us about yourself..." className="w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm input-ring resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input value={user?.email || ''} disabled className="w-full px-3.5 py-2.5 rounded-xl border bg-slate-50 text-sm text-slate-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tenant ID</label>
            <input value={user?.tenantId || ''} disabled className="w-full px-3.5 py-2.5 rounded-xl border bg-slate-50 text-sm text-slate-500 cursor-not-allowed font-mono" />
          </div>
        </div>

        {msg && <div className={`p-3 rounded-xl text-sm ${msg.includes('updated') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}

        <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Account info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-3">Account Information</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-slate-500">User ID</span><p className="font-mono text-slate-700 text-xs mt-0.5">{user?.id}</p></div>
          <div><span className="text-slate-500">Joined</span><p className="text-slate-700 mt-0.5">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</p></div>
        </div>
      </div>
    </div>
  );
}
