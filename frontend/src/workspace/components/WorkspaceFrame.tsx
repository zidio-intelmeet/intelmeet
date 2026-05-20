import { useEffect, type ReactNode, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/auth'
import { useAuthStore } from '../../stores/authStore'
import { apiService } from '../../services/api'
import logo from '../../assets/logowobg.png'
import wordmark from '../../assets/intellmeet_wordmark.png'
import { dashboardLinks, getInitials, getWorkspaceMeetingsDestination, readWorkspacePreferences, syncCompactModeClass, transitionPath } from '../shared'

type SidebarTeam = {
  id: string
  name: string
}

const TEAM_SELECTION_STORAGE_KEY = 'intellmeet-active-team'
const LOCAL_TEAMS_KEY = 'intellmeet-local-teams'
export function DashboardIcon({ path }: { path: string }) {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  )
}

export function SidebarAccountMenu({
  name,
  email,
  initials,
  avatar,
}: {
  name: string
  email: string
  initials: string
  avatar?: string | null
}) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate('/profile')}
      className="flex w-full items-center gap-3 rounded-2xl bg-emerald-50/70 p-3 text-left transition hover:bg-emerald-100/80"
    >
      {avatar ? (
        <img src={avatar} alt={name} className="h-11 w-11 shrink-0 rounded-full object-cover" />
      ) : (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
          {initials}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-900">{name}</p>
        <p className="truncate text-xs text-slate-500">{email}</p>
      </div>
      <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}

export default function WorkspaceFrame({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const isLoading = useAuthStore((state) => state.isLoading)
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarTeams, setSidebarTeams] = useState<SidebarTeam[]>([])
  const [isTeamsDropdownOpen, setIsTeamsDropdownOpen] = useState(false)

  useEffect(() => {
    function applyCompactMode() {
      syncCompactModeClass(readWorkspacePreferences().compactMode)
    }

    applyCompactMode()
    window.addEventListener('storage', applyCompactMode)
    window.addEventListener('intellmeet:preferences-updated', applyCompactMode)

    return () => {
      window.removeEventListener('storage', applyCompactMode)
      window.removeEventListener('intellmeet:preferences-updated', applyCompactMode)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadSidebarTeams() {
      try {
        const response = await apiService.getOrganizations()
        const organization = response.data?.[0]

        if (!organization) {
          if (isMounted) setSidebarTeams([])
          return
        }

        const raw = localStorage.getItem(LOCAL_TEAMS_KEY)
        const parsed = raw ? JSON.parse(raw) as Record<string, SidebarTeam[]> : {}
        const teams = Array.isArray(parsed[organization._id]) ? parsed[organization._id] : []

        if (isMounted) {
          setSidebarTeams(teams)
        }
      } catch {
        if (isMounted) setSidebarTeams([])
      }
    }

    void loadSidebarTeams()
    window.addEventListener('storage', loadSidebarTeams)
    window.addEventListener('intellmeet:local-data-updated', loadSidebarTeams as EventListener)
    window.addEventListener('focus', loadSidebarTeams)

    return () => {
      isMounted = false
      window.removeEventListener('storage', loadSidebarTeams)
      window.removeEventListener('intellmeet:local-data-updated', loadSidebarTeams as EventListener)
      window.removeEventListener('focus', loadSidebarTeams)
    }
  }, [location.pathname])

  useEffect(() => {
    if (location.pathname !== '/teams') {
      setIsTeamsDropdownOpen(false)
    }
  }, [location.pathname])

  // Wait for auth check to complete before showing anything
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7fbf8]">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const initials = getInitials(user.name, user.email)

  function handleSidebarTeamSelect(teamId: string | null) {
    try {
      if (teamId) {
        localStorage.setItem(TEAM_SELECTION_STORAGE_KEY, teamId)
      } else {
        localStorage.removeItem(TEAM_SELECTION_STORAGE_KEY)
      }
    } catch {
      // ignore local persistence issues in frontend-only mode
    }

    navigate('/teams')
  }

  return (
    <div className="min-h-screen bg-[#f7fbf8] text-slate-900 lg:h-screen lg:overflow-hidden">
      <div className="grid min-h-screen lg:h-screen lg:min-h-0 lg:grid-cols-[18rem_1fr]">
        <aside className="flex border-b border-emerald-100 bg-white lg:h-screen lg:min-h-0 lg:flex-col lg:border-b-0 lg:border-r">
          <div className="flex w-full items-center justify-between gap-4 px-5 py-4 lg:block lg:px-6">
            <Link to={transitionPath('/')} className="intellmeet-logo-link flex items-end gap-0">
              <img src={logo} alt="IntellMeet logo" className="h-12 w-12 scale-150 object-contain sm:h-14 sm:w-14" />
              <img src={wordmark} alt="IntellMeet" className="mb-px h-11 w-47 object-contain" />
            </Link>
            <div className="flex items-center gap-0 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                {initials}
              </div>
            </div>
          </div>

          <nav className="hidden flex-1 overflow-y-auto px-3 py-3 lg:block">
            <div className="space-y-1">
              {dashboardLinks.map((item) => (
                item.to === '/teams' ? (
                  <div key={item.to} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/teams')
                        setIsTeamsDropdownOpen((current) => !current)
                      }}
                      className={[
                        'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-left transition',
                        location.pathname === item.to
                          ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                          : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700',
                      ].join(' ')}
                    >
                      <DashboardIcon path={item.icon} />
                      <span className="flex-1">{item.label}</span>
                      <svg className={`h-4 w-4 shrink-0 transition ${isTeamsDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isTeamsDropdownOpen && (
                      <div className="ml-4 space-y-1 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-2">
                        {sidebarTeams.length > 0 ? (
                          sidebarTeams.map((team) => (
                            <button
                              key={team.id}
                              type="button"
                              onClick={() => handleSidebarTeamSelect(team.id)}
                              className="block w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-emerald-700"
                            >
                              {team.name}
                            </button>
                          ))
                        ) : (
                          <p className="px-3 py-2 text-xs font-medium text-slate-400">No teams yet</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() => navigate(item.to === '/meetings' ? getWorkspaceMeetingsDestination() : item.to)}
                    className={[
                      'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-left transition',
                      location.pathname === item.to
                        ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                        : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700',
                    ].join(' ')}
                  >
                    <DashboardIcon path={item.icon} />
                    {item.label}
                  </button>
                )
              ))}
            </div>
          </nav>

          <div className="mt-auto hidden border-t border-emerald-100 p-4 lg:block">
            <SidebarAccountMenu name={user.name} email={user.email} initials={initials} avatar={user.avatar} />
          </div>
        </aside>

        <main className="min-w-0 lg:h-screen lg:overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}



