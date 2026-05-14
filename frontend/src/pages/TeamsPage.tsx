import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { AddMemberModal } from '../components/org/AddMemberModal';
import { useAuth } from '../context/auth';

interface Member {
  userId: { _id: string; name: string; email: string };
  role: string;
  status: string;
  joinedAt: string;
}

interface Invitation {
  _id: string;
  email: string;
  role: string;
  status: string;
  invitedAt: string;
}

interface Organization {
  _id: string;
  name: string;
  members: Member[];
  invitations: Invitation[];
}

export default function TeamsPage() {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleCreateOrganization = async () => {
    try {
      setIsCreatingOrg(true);
      const orgName = `${user?.name}'s Organization`;
      await apiService.createOrganization(orgName);
      // Refresh organizations
      const response = await apiService.getOrganizations();
      if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
        setOrganization(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to create organization:', error);
      alert('Failed to create organization');
    } finally {
      setIsCreatingOrg(false);
    }
  };

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        setIsLoading(true);
        const response = await apiService.getOrganizations();
        console.log('Organizations response:', response);
        
        if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
          console.log('Setting organization:', response.data[0]);
          setOrganization(response.data[0]);
        } else {
          console.log('No organizations found');
        }
      } catch (error) {
        console.error('Failed to fetch organization:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganization();
  }, []);

  const handleMemberAdded = async () => {
    // Refresh organization data
    try {
      const orgs = await apiService.getOrganizations();
      if (orgs.data && orgs.data.length > 0) {
        setOrganization(orgs.data[0]);
      }
    } catch (error) {
      console.error('Failed to refresh organization:', error);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (index: number) => {
    const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
    return colors[index % colors.length];
  };

  const filteredMembers = organization?.members?.filter(member => 
    member.userId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.userId?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredInvitations = organization?.invitations?.filter(inv =>
    inv.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const recentMembers = filteredMembers.slice(0, 3);

  const currentUserOrgRole = organization?.members?.find(m => m.userId?._id === user?.id)?.role;
  const isAdmin = user?.role === 'Admin' || currentUserOrgRole === 'Admin';
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block">
            <svg className="w-12 h-12 text-emerald-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="mt-4 text-gray-600">Loading team members...</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">No Organization Yet</h1>
          <p className="text-slate-600 max-w-md mx-auto">
            Create an organization to start collaborating with your team members. You'll be able to add members, manage permissions, and coordinate meetings.
          </p>
        </div>

        {/* Create Organization Box */}
        <div className="bg-white border-2 border-emerald-200 rounded-2xl p-8 text-center">
          <div className="inline-block mb-4">
            <svg className="w-12 h-12 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Create Your First Organization</h2>
          <p className="text-slate-600 mb-6">
            Set up a workspace for your team to collaborate together.
          </p>
          <button
            onClick={handleCreateOrganization}
            disabled={isCreatingOrg}
            className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isCreatingOrg ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating...
              </span>
            ) : (
              'Create Organization'
            )}
          </button>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-xl p-6">
            <div className="text-2xl font-bold text-emerald-600 mb-2">👥</div>
            <h3 className="font-semibold text-slate-900 mb-1">Add Members</h3>
            <p className="text-sm text-slate-600">Invite team members to your workspace</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-6">
            <div className="text-2xl font-bold text-blue-600 mb-2">📋</div>
            <h3 className="font-semibold text-slate-900 mb-1">Manage Roles</h3>
            <p className="text-sm text-slate-600">Set permissions for different roles</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-6">
            <div className="text-2xl font-bold text-purple-600 mb-2">🤝</div>
            <h3 className="font-semibold text-slate-900 mb-1">Collaborate</h3>
            <p className="text-sm text-slate-600">Work together on meetings and tasks</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl px-8 py-6 flex items-center justify-between mb-6">
        <div>
          <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">
            Workspace
          </p>
          <h1 className="text-2xl font-bold text-slate-900">
            Team Members {organization && `(${organization.members?.length || 0})`}
          </h1>
        </div>

        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-semibold transition-colors"
          >
            Add Member
          </button>
        )}
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Side */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              Quick Actions
            </h2>

            <div className="space-y-3">
              {isAdmin ? (
                <>
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="w-full text-left bg-emerald-50 hover:bg-emerald-100 rounded-xl p-4 transition-colors"
                  >
                    <p className="font-semibold text-gray-900">Add Member</p>
                    <p className="text-sm text-gray-500">
                      Invite people to workspace
                    </p>
                  </button>

                  <button className="w-full text-left hover:bg-gray-50 rounded-xl p-4 transition-colors cursor-not-allowed opacity-50">
                    <p className="font-semibold text-gray-900">Manage Roles</p>
                    <p className="text-sm text-gray-500">
                      Update member permissions
                    </p>
                  </button>

                  <button className="w-full text-left hover:bg-yellow-50 rounded-xl p-4 transition-colors cursor-not-allowed opacity-50">
                    <p className="font-semibold text-gray-900">Send Invite</p>
                    <p className="text-sm text-gray-500">
                      Grow your workspace
                    </p>
                  </button>
                </>
              ) : (
                <div className="p-4 text-center text-gray-500 text-sm">
                  Only Admins can manage the workspace.
                </div>
              )}
            </div>
          </div>

          {/* Recent Members */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              Recent Members
            </h2>

            <div className="space-y-4">
              {recentMembers.length > 0 ? (
                recentMembers.map((member, idx) => (
                  <div key={member.userId._id} className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${getAvatarColor(idx)} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                      {getInitials(member.userId.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{member.userId.name}</p>
                      <p className="text-sm text-gray-500">{member.role}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No members yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="col-span-2 bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {/* Search */}
          <div className="p-6 border-b border-gray-100">
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
            />
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-4 bg-gray-50 px-6 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-500">Member</p>
            <p className="text-sm font-semibold text-gray-500">Email</p>
            <p className="text-sm font-semibold text-gray-500">Role</p>
            <p className="text-sm font-semibold text-gray-500">Joined</p>
          </div>

          {/* Member Rows */}
          {filteredMembers.length > 0 || filteredInvitations.length > 0 ? (
            <>
              {filteredMembers.map((member, idx) => (
                <div key={member.userId._id} className="grid grid-cols-4 items-center px-6 py-5 border-b border-gray-100 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${getAvatarColor(idx)} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                      {getInitials(member.userId.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{member.userId.name}</p>
                      <p className="text-sm text-gray-400">Joined {new Date(member.joinedAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}</p>
                    </div>
                  </div>

                  <p className="text-gray-600">{member.userId.email}</p>

                  <span className={`${member.role === 'Admin' ? 'bg-blue-50 text-blue-700' : member.role === 'Member' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-700'} px-3 py-1 rounded-lg text-sm font-semibold w-fit`}>
                    {member.role}
                  </span>

                  <span className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-sm font-semibold w-fit">
                    Active
                  </span>
                </div>
              ))}
              {filteredInvitations.map((inv, idx) => (
                <div key={inv._id} className="grid grid-cols-4 items-center px-6 py-5 border-b border-gray-100 hover:bg-gray-50 opacity-60">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                      {inv.email.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 italic">Pending Invite</p>
                      <p className="text-sm text-gray-400">Invited {new Date(inv.invitedAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}</p>
                    </div>
                  </div>

                  <p className="text-gray-600">{inv.email}</p>

                  <span className={`${inv.role === 'Admin' ? 'bg-blue-50 text-blue-700' : inv.role === 'Member' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-700'} px-3 py-1 rounded-lg text-sm font-semibold w-fit`}>
                    {inv.role}
                  </span>

                  <span className="bg-yellow-50 text-yellow-700 px-3 py-1 rounded-lg text-sm font-semibold w-fit border border-yellow-200">
                    {inv.status}
                  </span>
                </div>
              ))}
            </>
          ) : (
            <div className="px-6 py-8 text-center text-gray-500">
              <p>No members found matching your search</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      <AddMemberModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onMemberAdded={handleMemberAdded}
        organizationId={organization?._id || ''}
      />
    </div>
  );
}