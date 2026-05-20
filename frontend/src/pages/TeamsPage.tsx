import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { AddMemberModal } from '../components/org/AddMemberModal';
import { useAuth } from '../context/auth';
import { useNavigate } from 'react-router-dom';

interface Member {
  userId: { _id: string; name: string; email: string; avatar?: string | null };
  role: string;
  status?: string;
  joinedAt: string;
}

interface Invitation {
  _id: string;
  email: string;
  role: string;
  status: string;
  invitedAt: string;
  invitedByName?: string;
  invitedMemberName?: string;
}

interface Organization {
  _id: string;
  name: string;
  members: Member[];
  invitations: Invitation[];
}

interface TeamBucket {
  id: string;
  name: string;
  memberIds: string[];
}

const LOCAL_TEAMS_KEY = 'intellmeet-local-teams';
const TEAM_SELECTION_STORAGE_KEY = 'intellmeet-active-team';

function readStoredTeams(orgId: string): TeamBucket[] {
  try {
    const raw = localStorage.getItem(LOCAL_TEAMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, TeamBucket[]>;
    return Array.isArray(parsed[orgId]) ? parsed[orgId] : [];
  } catch {
    return [];
  }
}

function writeStoredTeams(orgId: string, teams: TeamBucket[]) {
  try {
    const raw = localStorage.getItem(LOCAL_TEAMS_KEY);
    const parsed = raw ? JSON.parse(raw) as Record<string, TeamBucket[]> : {};
    parsed[orgId] = teams;
    localStorage.setItem(LOCAL_TEAMS_KEY, JSON.stringify(parsed));
  } catch {
    // ignore local persistence issues in frontend-only mode
  }
}

export default function TeamsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false);
  const [organizationDraftName, setOrganizationDraftName] = useState('');
  const [organizationDraftError, setOrganizationDraftError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [teamName, setTeamName] = useState('');
  const [isEditingTeamName, setIsEditingTeamName] = useState(false);
  const [teams, setTeams] = useState<TeamBucket[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [pendingInvites, setPendingInvites] = useState<Array<Invitation & { organizationId: string; organizationName: string }>>([]);

  const refreshOrganization = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getOrganizations();
      if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
        setOrganization(response.data[0]);
        setTeamName(response.data[0].name);
        const storedTeams = readStoredTeams(response.data[0]._id);
        setTeams(storedTeams);
        const selectedTeamId = localStorage.getItem(TEAM_SELECTION_STORAGE_KEY);
        setActiveTeamId((current) => current ?? selectedTeamId ?? null);
      } else {
        setOrganization(null);
        setTeams([]);
        setActiveTeamId(null);
      }
    } catch (error) {
      console.error('Failed to fetch organization:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrganization = async (name?: string) => {
    try {
      setIsCreatingOrg(true);
      const orgName = name?.trim() || `${user?.name}'s Organization`;
      await apiService.createOrganization(orgName);
      // Refresh organizations
      const response = await apiService.getOrganizations();
      if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
        setOrganization(response.data[0]);
        setTeamName(response.data[0].name);
      }
      setIsCreateOrgModalOpen(false);
      setOrganizationDraftError('');
    } catch (error) {
      console.error('Failed to create organization:', error);
      setOrganizationDraftError('Failed to create organization. Please try again.');
    } finally {
      setIsCreatingOrg(false);
    }
  };

  const openCreateOrganizationModal = () => {
    setOrganizationDraftName(`${user?.name || 'My'} Organization`);
    setOrganizationDraftError('');
    setIsCreateOrgModalOpen(true);
  };

  const closeCreateOrganizationModal = () => {
    if (isCreatingOrg) return;
    setIsCreateOrgModalOpen(false);
    setOrganizationDraftError('');
  };

  const submitCreateOrganization = () => {
    const trimmedName = organizationDraftName.trim();
    if (!trimmedName) {
      setOrganizationDraftError('Organization name is required.');
      return;
    }
    void handleCreateOrganization(trimmedName);
  };

  useEffect(() => {
    void refreshOrganization();
  }, []);

  useEffect(() => {
    const handleLocalUpdate = () => { void refreshOrganization(); };
    window.addEventListener('intellmeet:local-data-updated', handleLocalUpdate as EventListener);
    window.addEventListener('focus', handleLocalUpdate);
    return () => {
      window.removeEventListener('intellmeet:local-data-updated', handleLocalUpdate as EventListener);
      window.removeEventListener('focus', handleLocalUpdate);
    };
  }, []);

  useEffect(() => {
    if (!user?.email || user.role === 'Admin') {
      setPendingInvites([]);
      return;
    }

    const loadPendingInvites = () => {
      apiService.getPendingInvitationsForEmail(user.email)
        .then((response) => setPendingInvites(response.data || []))
        .catch(() => setPendingInvites([]));
    };

    loadPendingInvites();
    window.addEventListener('intellmeet:local-data-updated', loadPendingInvites as EventListener);
    window.addEventListener('focus', loadPendingInvites);

    return () => {
      window.removeEventListener('intellmeet:local-data-updated', loadPendingInvites as EventListener);
      window.removeEventListener('focus', loadPendingInvites);
    };
  }, [user?.email, user?.role]);

  const handleMemberAdded = async () => {
    await refreshOrganization();
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

  const activeTeam = teams.find((team) => team.id === activeTeamId) || null;
  const activeTeamMembers = activeTeam
    ? filteredMembers.filter((member) => activeTeam.memberIds.includes(member.userId._id))
    : filteredMembers;

  const currentUserOrgRole = organization?.members?.find(m => m.userId?._id === user?.id)?.role;
  const isAdmin = user?.role === 'Admin' || currentUserOrgRole === 'Admin';
  const isAcceptedMember = organization?.members?.some((member) => member.userId.email.toLowerCase() === user?.email?.toLowerCase()) ?? false;
  const shouldShowPendingInviteState = !isAdmin && pendingInvites.length > 0 && !isAcceptedMember;

  const handleSaveTeamName = async () => {
    if (!organization || !teamName.trim()) return;
    const response = await apiService.updateOrganizationName(organization._id, teamName.trim());
    if (response.data) {
      setOrganization(response.data);
      setTeamName(response.data.name);
      setIsEditingTeamName(false);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!organization) return;
    await apiService.deleteOrganization(organization._id);
    try {
      localStorage.removeItem('intellmeet-local-teams');
    } catch {
      // ignore local persistence issues in frontend-only mode
    }
    setOrganization(null);
    setTeams([]);
    setActiveTeamId(null);
    setTeamName('');
    setNewTeamName('');
    setIsEditingTeamName(false);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!organization) return;
    const response = await apiService.removeMember(organization._id, memberId);
    if (response.data) {
      setOrganization(response.data as Organization);
    }
  };

  const handleCreateTeam = () => {
    if (!organization || !newTeamName.trim()) return;
    const nextTeams = [
      ...teams,
      { id: crypto.randomUUID(), name: newTeamName.trim(), memberIds: [] },
    ];
    setTeams(nextTeams);
    setActiveTeamId(nextTeams[nextTeams.length - 1].id);
    setNewTeamName('');
    writeStoredTeams(organization._id, nextTeams);
  };

  const handleDeleteTeam = (teamId: string) => {
    if (!organization) return;
    const nextTeams = teams.filter((team) => team.id !== teamId);
    setTeams(nextTeams);
    setActiveTeamId((current) => {
      if (current !== teamId) return current;
      return nextTeams[0]?.id ?? null;
    });
    writeStoredTeams(organization._id, nextTeams);
  };

  const handleToggleMemberInTeam = (memberId: string) => {
    if (!organization || !activeTeamId) return;
    const nextTeams = teams.map((team) => {
      if (team.id !== activeTeamId) return team;
      const exists = team.memberIds.includes(memberId);
      return {
        ...team,
        memberIds: exists
          ? team.memberIds.filter((id) => id !== memberId)
          : [...team.memberIds, memberId],
      };
    });
    setTeams(nextTeams);
    writeStoredTeams(organization._id, nextTeams);
  };

  const getMemberTeams = (memberId: string) =>
    teams.filter((team) => team.memberIds.includes(memberId));

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
          <h1 className="text-3xl font-bold text-slate-900">No Teams Yet</h1>
        </div>

        {/* Create Workspace Box */}
        {isAdmin ? (
        <div className="bg-white border-2 border-emerald-200 rounded-2xl p-8 text-center">
          <div className="inline-block mb-4">
            <svg className="w-12 h-12 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Create Your Team Workspace</h2>
          <button
            onClick={openCreateOrganizationModal}
            disabled={isCreatingOrg}
            className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Create Workspace
          </button>
        </div>
        ) : pendingInvites.length > 0 ? (
          <div className="space-y-4">
            {pendingInvites.map((invite) => (
              <div key={invite._id} className="bg-white border-2 border-emerald-200 rounded-2xl p-8">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Pending invite</p>
                <h2 className="mt-2 text-xl font-bold text-slate-900">{invite.organizationName}</h2>
                <p className="mt-1 text-sm text-slate-500">Invited by {invite.invitedByName || 'Admin'}</p>
                <button
                  type="button"
                  onClick={() => navigate(`/accept-invitation?token=${invite._id}`)}
                  className="mt-5 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  Accept Invite
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {isCreateOrgModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4" onClick={closeCreateOrganizationModal}>
            <div
              className="w-full max-w-lg rounded-3xl border border-emerald-100 bg-white p-6 shadow-2xl shadow-emerald-950/10"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-emerald-100 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Create Workspace</p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">Start your teams workspace</h2>
                </div>
                <button
                  type="button"
                  onClick={closeCreateOrganizationModal}
                  className="rounded-xl px-3 py-2 text-lg font-bold text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
                  aria-label="Close create organization modal"
                >
                  x
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Workspace name</span>
                  <input
                    value={organizationDraftName}
                    onChange={(event) => {
                      setOrganizationDraftName(event.target.value);
                      setOrganizationDraftError('');
                    }}
                    placeholder="e.g. IntellMeet, Product Lab, Design House"
                    className="mt-2 w-full rounded-xl border border-emerald-100 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    autoFocus
                  />
                </label>

                {organizationDraftError && (
                  <p className="text-sm font-semibold text-rose-600">{organizationDraftError}</p>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeCreateOrganizationModal}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submitCreateOrganization}
                    disabled={isCreatingOrg}
                    className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCreatingOrg ? 'Creating...' : 'Create Workspace'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (shouldShowPendingInviteState) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-5 py-10 sm:px-8">
        {pendingInvites.map((invite) => (
          <div key={invite._id} className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Pending invite</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">{invite.organizationName}</h1>
            <p className="mt-2 text-sm text-slate-500">Invited by {invite.invitedByName || 'Admin'}</p>
            <button
              type="button"
              onClick={() => navigate(`/accept-invitation?token=${invite._id}`)}
              className="mt-5 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Accept Invite
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <header className="flex items-center justify-between border-b border-emerald-100 bg-white px-5 py-5 sm:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Workspace</p>
          {isEditingTeamName ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                className="rounded-xl border border-emerald-200 px-3 py-2 text-lg font-bold text-slate-900 outline-none focus:border-emerald-400"
              />
              <button onClick={handleSaveTeamName} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Save</button>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{organization.name}</h1>
              </div>
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditingTeamName(true)}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
              aria-label="Edit workspace"
              title="Edit workspace"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h4l10.5-10.5a2.121 2.121 0 10-3-3L5.5 17v3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6.5l4 4" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => { void handleDeleteOrganization(); }}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
              aria-label="Delete workspace"
              title="Delete workspace"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v6" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 11v6" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 7l1 11a2 2 0 002 2h6a2 2 0 002-2l1-11" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" />
              </svg>
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-semibold transition-colors"
            >
              Add Member
            </button>
          </div>
        )}
      </header>

      <section className="px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-2xl border border-emerald-100 bg-white p-6">
        {isAdmin && (
          <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Create New Team</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                value={newTeamName}
                onChange={(event) => setNewTeamName(event.target.value)}
                placeholder="e.g. Product, Design, Ops"
                className="flex-1 rounded-xl border border-emerald-100 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />
              <button
                type="button"
                onClick={handleCreateTeam}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Create Team
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{organization.name}</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">Teams</h2>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setActiveTeamId(null)}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${activeTeamId === null ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-emerald-100 bg-white text-slate-700 hover:bg-emerald-50'}`}
          >
            All Members ({filteredMembers.length})
          </button>
          {teams.map((team) => (
            <div
              key={team.id}
              className={`flex items-center overflow-hidden rounded-xl border transition ${activeTeamId === team.id ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-emerald-100 bg-white text-slate-700'}`}
            >
              <button
                type="button"
                onClick={() => setActiveTeamId(team.id)}
                className={`px-4 py-2 text-sm font-semibold transition ${activeTeamId === team.id ? 'hover:bg-emerald-700' : 'hover:bg-emerald-50'}`}
              >
                {team.name} ({team.memberIds.length})
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleDeleteTeam(team.id)}
                  className={`border-l px-3 py-2 text-sm font-bold transition ${activeTeamId === team.id ? 'border-emerald-500 hover:bg-emerald-700' : 'border-emerald-100 text-rose-600 hover:bg-rose-50'}`}
                  aria-label={`Delete ${team.name}`}
                >
                  x
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Side */}
        <div className="space-y-6">
          {/* Recent Members */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              {activeTeam ? `${activeTeam.name} Members` : 'Workspace Members'}
            </h2>

            <div className="space-y-4">
              {activeTeamMembers.length > 0 ? (
                activeTeamMembers.slice(0, 4).map((member, idx) => (
                  <div key={member.userId._id} className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${getAvatarColor(idx)} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                      {getInitials(member.userId.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{member.userId.name}</p>
                      <p className="text-sm text-gray-500">
                        {getMemberTeams(member.userId._id).map((team) => team.name).join(', ') || member.role}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">{activeTeam ? 'No members in this team yet' : 'No members have joined this workspace yet'}</p>
              )}
            </div>
          </div>

          {isAdmin && (organization?.invitations?.filter((invite) => invite.status === 'Pending').length ?? 0) > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-5">Pending Invites</h2>
              <div className="space-y-3">
                {organization?.invitations
                  ?.filter((invite) => invite.status === 'Pending')
                  .map((invite) => (
                    <div key={invite._id} className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3">
                      <p className="font-semibold text-gray-900">{invite.invitedMemberName || invite.email}</p>
                      <p className="text-sm text-gray-500">{invite.email}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {isAdmin && activeTeam && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-5">Assign Members to {activeTeam.name}</h2>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {organization.members.map((member, idx) => {
                  const isAssigned = activeTeam.memberIds.includes(member.userId._id);
                  return (
                    <label key={member.userId._id} className="flex items-center justify-between gap-3 rounded-xl border border-emerald-100 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${getAvatarColor(idx)} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                          {getInitials(member.userId.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{member.userId.name}</p>
                          <p className="text-sm text-gray-500">{member.userId.email}</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => handleToggleMemberInTeam(member.userId._id)}
                        className="h-5 w-5 rounded border-emerald-200 text-emerald-600 focus:ring-emerald-500"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Side */}
        <div id="team-members-table" className="col-span-2 bg-white border border-gray-200 rounded-2xl overflow-hidden">
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
          <div className={`grid ${isAdmin ? 'grid-cols-[1.5fr_1.35fr_1fr_0.85fr_0.8fr]' : 'grid-cols-[1.7fr_1.5fr_1fr_0.9fr]'} gap-4 bg-gray-50 px-6 py-3 border-b border-gray-100`}>
            <p className="text-sm font-semibold text-gray-500">Member</p>
            <p className="text-sm font-semibold text-gray-500">Email</p>
            <p className="text-sm font-semibold text-gray-500">Role</p>
            <p className="text-sm font-semibold text-gray-500">Joined</p>
            {isAdmin && <p className="text-sm font-semibold text-gray-500">Action</p>}
          </div>

          {/* Member Rows */}
          {activeTeamMembers.length > 0 ? (
            <>
              {activeTeamMembers.map((member) => (
                <div key={member.userId._id} className={`grid ${isAdmin ? 'grid-cols-[1.5fr_1.35fr_1fr_0.85fr_0.8fr]' : 'grid-cols-[1.7fr_1.5fr_1fr_0.9fr]'} gap-4 items-center px-6 py-5 border-b border-gray-100 hover:bg-gray-50`}>
                  <div className="min-w-0">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{member.userId.name}</p>
                      <p className="text-sm text-gray-400">Joined {new Date(member.joinedAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}</p>
                    </div>
                  </div>

                  <p className="truncate text-gray-600">{member.userId.email}</p>

                  <div className="min-w-0 space-y-2">
                    <span className={`${member.role === 'Admin' ? 'bg-blue-50 text-blue-700' : member.role === 'Member' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-700'} px-3 py-1 rounded-lg text-sm font-semibold w-fit`}>
                      {member.role}
                    </span>
                    <p className="truncate text-xs text-slate-400">
                      {getMemberTeams(member.userId._id).map((team) => team.name).join(', ') || 'No team assigned'}
                    </p>
                  </div>

                  <span className="text-sm font-medium text-slate-500">
                    {new Date(member.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.userId._id)}
                      disabled={member.userId._id === user?.id}
                      className="w-fit rounded-lg border border-rose-100 bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </>
          ) : (
            <div className="px-6 py-8 text-center text-gray-500">
              <p>{activeTeam ? 'No members assigned to this team yet' : 'No members have joined this workspace yet'}</p>
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
      </section>
    </>
  );
}
