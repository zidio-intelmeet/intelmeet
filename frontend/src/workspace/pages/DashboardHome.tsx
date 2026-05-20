import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/auth'
import { apiService, type MeetingData } from '../../services/api'
import { DashboardIcon, SidebarAccountMenu } from '../components/WorkspaceFrame'
import logo from '../../assets/logowobg.png'
import wordmark from '../../assets/intellmeet_wordmark.png'
import MeetingDetailsDrawer from '../components/MeetingDetailsDrawer'
import {
  getInitials,
  dashboardLinks,
  getWorkspaceMeetingsDestination,
  quickActions,
  readDismissedNotificationIds,
  readReadNotificationIds,
  readScheduleTasks,
  readWorkspacePreferences,
  statCards,
  transitionPath,
  writeDismissedNotificationIds,
  writeReadNotificationIds,
  type MeetingFormValues,
  type ScheduleTask,
} from '../shared'
export default function DashboardHome() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [meetings, setMeetings] = useState<MeetingData[]>([])
  const [isMeetingDrawerOpen, setIsMeetingDrawerOpen] = useState(false)
  const [drawerDefaultType, setDrawerDefaultType] = useState('Instant')
  const [pendingInvites, setPendingInvites] = useState<Array<{ _id: string; organizationName: string; invitedByName?: string }>>([])
  const [workspaceCount, setWorkspaceCount] = useState(0)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(readDismissedNotificationIds)
  const [readIds, setReadIds] = useState<Set<string>>(readReadNotificationIds)
  const [scheduleTasks, setScheduleTasks] = useState<ScheduleTask[]>(() => readScheduleTasks())
  const [workspacePreferences, setWorkspacePreferences] = useState(() => readWorkspacePreferences())
  const notificationsRef = useRef<HTMLDivElement>(null)

  const currentUser = user!
  const isAdmin = currentUser.role === 'Admin'
  const firstName = currentUser ? (currentUser.name.split(/\s+/)[0] || currentUser.name) : ''
  const initials = currentUser ? getInitials(currentUser.name, currentUser.email) : ''
  const userEmail = currentUser?.email ?? ''

  useEffect(() => {
    if (!userEmail || isAdmin) return
    const loadPendingInvites = () => {
      apiService.getPendingInvitationsForEmail(userEmail)
        .then((response) => setPendingInvites(response.data || []))
        .catch(() => setPendingInvites([]))
    }

    loadPendingInvites()
    window.addEventListener('intellmeet:local-data-updated', loadPendingInvites as EventListener)
    window.addEventListener('focus', loadPendingInvites)

    return () => {
      window.removeEventListener('intellmeet:local-data-updated', loadPendingInvites as EventListener)
      window.removeEventListener('focus', loadPendingInvites)
    }
  }, [userEmail, isAdmin])

  useEffect(() => {
    if (!userEmail || isAdmin) {
      setWorkspaceCount(0)
      return
    }

    const loadWorkspaceAccess = () => {
      apiService.getOrganizations()
        .then((response) => setWorkspaceCount(response.data?.length || 0))
        .catch(() => setWorkspaceCount(0))
    }

    loadWorkspaceAccess()
    window.addEventListener('intellmeet:local-data-updated', loadWorkspaceAccess as EventListener)
    window.addEventListener('focus', loadWorkspaceAccess)

    return () => {
      window.removeEventListener('intellmeet:local-data-updated', loadWorkspaceAccess as EventListener)
      window.removeEventListener('focus', loadWorkspaceAccess)
    }
  }, [userEmail, isAdmin])

  useEffect(() => {
    const refreshTasks = () => setScheduleTasks(readScheduleTasks())
    const refreshPreferences = () => setWorkspacePreferences(readWorkspacePreferences())
    const refreshMeetings = async () => {
      try {
        const response = await apiService.getMeetings()
        setMeetings(response.data || [])
      } catch {
        setMeetings([])
      }
    }
    const handleWindowFocus = () => { void refreshMeetings() }

    void refreshMeetings()
    window.addEventListener('focus', refreshTasks)
    window.addEventListener('focus', refreshPreferences)
    window.addEventListener('focus', handleWindowFocus)
    return () => {
      window.removeEventListener('focus', refreshTasks)
      window.removeEventListener('focus', refreshPreferences)
      window.removeEventListener('focus', handleWindowFocus)
    }
  }, [])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  if (!currentUser) {
    return null
  }

  const hasWorkspaceAccess = isAdmin || workspaceCount > 0

  function handleOpenMeetingDrawer(defaultType = 'Instant') {
    if (!isAdmin) return
    setDrawerDefaultType(defaultType)
    setIsMeetingDrawerOpen(true)
  }

  async function handleCreateMeeting(values: MeetingFormValues) {
    if (!isAdmin) return
    try {
      const durationMinutes = Number.parseInt(values.duration, 10) || 30
      const hasSchedule = values.status === 'Scheduled' && values.scheduledFor
      const scheduledStartTime = hasSchedule ? new Date(values.scheduledFor).toISOString() : undefined
      const scheduledEndTime = hasSchedule
        ? new Date(new Date(values.scheduledFor).getTime() + durationMinutes * 60 * 1000).toISOString()
        : undefined

      await apiService.createMeeting({
        title: values.title.trim() || 'Untitled Meeting',
        description: values.agenda.trim() || undefined,
        scheduledStartTime,
        scheduledEndTime,
      })

      const response = await apiService.getMeetings()
      setMeetings(response.data || [])
    } catch {
      // keep frontend resilient even if local meeting creation fails
    }
  }

  async function handleStartInstantMeeting() {
    if (!isAdmin) return
    try {
      const response = await apiService.createMeeting({
        title: 'Instant Meeting',
      })
      const meeting = response.data
      const allMeetings = await apiService.getMeetings()
      setMeetings(allMeetings.data || [])
      if (meeting?._id) {
        navigate(`/dashboard/meetings/${meeting._id}/video`)
      }
    } catch {
      // ignore for frontend-only smoothness
    }
  }

  const activeMeetingCount = meetings.filter((meeting) => meeting.status === 'Ongoing').length
  const dashboardStats = statCards.map((card) => {
    if (card.label === 'Total Meetings') {
      return { ...card, value: String(meetings.length), detail: `${meetings.filter((meeting) => meeting.status === 'Completed').length} completed` }
    }
    if (card.label === 'Active Meetings') {
      return { ...card, value: String(activeMeetingCount), detail: `${meetings.filter((meeting) => meeting.status === 'Scheduled').length} scheduled` }
    }
    if (card.label === 'This Week') {
      return { ...card, value: String(meetings.length), detail: 'Total workspace meetings' }
    }
    return card
  })
  const notifications = [
    {
      id: 'welcome',
      title: 'Welcome to workspace',
      detail: `Glad to have you here, ${firstName}.`,
    },
    ...(!isAdmin
      ? pendingInvites.map((invite) => ({
          id: `invite-${invite._id}`,
          title: 'Workspace invite',
          detail: `${invite.organizationName} invited you${invite.invitedByName ? ` via ${invite.invitedByName}` : ''}.`,
        }))
      : []),
    ...(isAdmin
      ? scheduleTasks
          .filter((task) => task.columnId === 'scheduled')
          .map((task) => ({
            id: `done-${task.id}`,
            title: 'Task finished',
            detail: `${task.assigneeName} completed â€œ${task.title}â€.`,
          }))
      : scheduleTasks
          .filter((task) => task.assigneeEmail === currentUser.email)
          .map((task) => ({
            id: `assigned-${task.id}`,
            title: 'New task assigned',
            detail: `â€œ${task.title}â€ was assigned to you.`,
          }))),
    ...(workspacePreferences.meetingReminders
      ? meetings
          .filter((meeting) => meeting.status === 'Scheduled')
          .map((meeting) => ({
            id: `meeting-${meeting._id}`,
            title: 'Meeting reminder',
            detail: `${meeting.title} is scheduled for ${new Date(meeting.scheduledStartTime).toLocaleString()}.`,
          }))
      : []),
  ]

  const visibleNotifications = notifications.filter((n) => !dismissedIds.has(n.id))
  const unreadCount = visibleNotifications.filter((n) => !readIds.has(n.id)).length

  function handleMarkAllRead() {
    const next = new Set(visibleNotifications.map((n) => n.id))
    setReadIds(next)
    writeReadNotificationIds(next)
  }

  function handleDeleteAll() {
    const next = new Set([...dismissedIds, ...visibleNotifications.map((n) => n.id)])
    setDismissedIds(next)
    writeDismissedNotificationIds(next)
  }

  function handleDeleteOne(id: string) {
    const next = new Set([...dismissedIds, id])
    setDismissedIds(next)
    writeDismissedNotificationIds(next)
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
                <button
                  key={item.to}
                  type="button"
                  onClick={() => navigate(item.to === '/meetings' ? getWorkspaceMeetingsDestination() : item.to)}
                  className={[
                    'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-left transition',
                    item.to === '/workspace'
                      ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                      : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700',
                  ].join(' ')}
                >
                  <DashboardIcon path={item.icon} />
                  {item.label}
                </button>
              ))}
            </div>
          </nav>

          <div className="mt-auto hidden border-t border-emerald-100 p-4 lg:block">
            <SidebarAccountMenu name={user.name} email={user.email} initials={initials} avatar={user.avatar} />
          </div>
        </aside>

        <main className="min-w-0 lg:h-screen lg:overflow-y-auto">
          <header className="flex items-center justify-between border-b border-emerald-100 bg-white px-5 py-4 sm:px-8">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Workspace</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Welcome, {firstName} !
              </h1>
            </div>
            <div ref={notificationsRef} className="relative flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setScheduleTasks(readScheduleTasks())
                  setIsNotificationsOpen((isOpen) => !isOpen)
                }}
                className="relative rounded-xl border border-emerald-100 bg-white p-3 text-slate-700 transition hover:bg-emerald-50"
                aria-label="Open notifications"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17H9m6 0a3 3 0 1 1-6 0m6 0h4l-1.5-2V10a5.5 5.5 0 0 0-11 0v5L5 17h4" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              {isNotificationsOpen && (
                <div className="absolute right-0 top-14 z-30 w-80 rounded-2xl border border-emerald-100 bg-white p-3 shadow-xl shadow-emerald-950/10">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-950">Notifications</h2>
                    {visibleNotifications.length > 0 && (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                        >
                          Read all
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteAll}
                          className="text-xs font-medium text-red-500 hover:text-red-600"
                        >
                          Delete all
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                    {visibleNotifications.length === 0 ? (
                      <p className="py-4 text-center text-xs text-slate-400">No notifications</p>
                    ) : (
                      visibleNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`flex items-start gap-2 rounded-xl px-3 py-3 ${readIds.has(notification.id) ? 'bg-slate-50' : 'bg-emerald-50'}`}
                        >
                          {!readIds.has(notification.id) && (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900">{notification.title}</p>
                            <p className="mt-1 text-xs text-slate-500">{notification.detail}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteOne(notification.id)}
                            className="shrink-0 text-slate-300 transition hover:text-red-500"
                            aria-label="Dismiss notification"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleOpenMeetingDrawer()}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
                >
                  + New Meeting
                </button>
              )}
            </div>
          </header>

          <div className="px-5 py-6 sm:px-8 lg:px-10">
            {!hasWorkspaceAccess && !pendingInvites.length ? (
              <section className="rounded-2xl border border-emerald-100 bg-white p-8 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Workspace</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">You’re no longer part of this workspace</h2>
                <p className="mt-2 text-sm text-slate-500">
                  If an admin adds you again, the invite will show up here.
                </p>
              </section>
            ) : (
              <>
            <p className="text-sm font-medium text-slate-500">
              {isAdmin
                ? "Here's what's happening with your admin workspace today."
                : "Here's what's happening in your member workspace today."}
            </p>

            <section className="mt-7 grid gap-4 md:grid-cols-3">
              {dashboardStats.map((card) => (
                <article key={card.label} className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-slate-500">{card.label}</p>
                      <p className="mt-6 text-3xl font-bold text-slate-950">{card.value}</p>
                      <p className="mt-1 text-sm font-medium text-slate-400">{card.detail}</p>
                    </div>
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.tone}`}>
                      <DashboardIcon path={card.icon} />
                    </div>
                  </div>
                </article>
              ))}
            </section>

            {!isAdmin && pendingInvites.length > 0 && (
              <section className="mt-6 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">Pending invitations</h2>
                <div className="mt-4 space-y-3">
                  {pendingInvites.map((invite) => (
                    <div key={invite._id} className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-4">
                      <div>
                        <p className="text-sm font-bold text-slate-950">{invite.organizationName}</p>
                        <p className="mt-1 text-sm text-slate-600">Invited by {invite.invitedByName || 'Admin'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/accept-invitation?token=${invite._id}`)}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                      >
                        View invite
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {isAdmin && (
              <section className="mt-6 grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleOpenMeetingDrawer('Instant')}
                  className="rounded-2xl border border-emerald-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Meetings</p>
                  <h2 className="mt-2 text-lg font-bold text-slate-950">Host meeting</h2>
                  <p className="mt-1 text-sm text-slate-500">Start a meeting and invite participants.</p>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/schedule')}
                  className="rounded-2xl border border-emerald-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Schedule</p>
                  <h2 className="mt-2 text-lg font-bold text-slate-950">Assign tasks</h2>
                  <p className="mt-1 text-sm text-slate-500">Create work and assign it to members.</p>
                </button>
              </section>
            )}

            <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
              <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">{isAdmin ? 'Quick Actions' : 'Member Access'}</h2>
                <div className="mt-5 space-y-3">
                  {(isAdmin ? [
                    ...quickActions,
                    { title: 'Assign Tasks', detail: 'Create tasks for workspace members', tone: 'bg-emerald-50 text-emerald-700', icon: 'M7 4h10M7 12h10M7 20h10M4 4h.01M4 12h.01M4 20h.01' },
                  ] : [
                    { title: 'Join Meetings', detail: 'Enter meetings shared with you', tone: 'bg-emerald-50 text-emerald-700', icon: 'M4 7h11a2 2 0 0 1 2 2v1.5l3-2v7l-3-2V15a2 2 0 0 1-2 2H4z' },
                    { title: 'View Assigned Tasks', detail: 'Work on tasks assigned by admins', tone: 'bg-teal-50 text-teal-700', icon: 'M8 17V7m0 10 8-5-8-5' },
                    { title: 'See Team Updates', detail: 'Stay aligned with your workspace', tone: 'bg-lime-50 text-lime-700', icon: 'M12 5v6M9 8h6M7 20a5 5 0 0 1 10 0M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' },
                  ]).map((action) => (
                    <button
                      type="button"
                      key={action.title}
                      onClick={
                        isAdmin && action.title === 'Start Instant Meeting'
                          ? handleStartInstantMeeting
                          : isAdmin && action.title === 'Assign Tasks'
                              ? () => navigate('/schedule')
                            : !isAdmin && action.title === 'Join Meetings'
                              ? () => navigate(getWorkspaceMeetingsDestination())
                              : !isAdmin && action.title === 'View Assigned Tasks'
                                ? () => navigate('/schedule')
                                : !isAdmin && action.title === 'See Team Updates'
                                  ? () => navigate('/teams')
                                  : undefined
                      }
                      className={`flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-left transition hover:scale-[1.01] ${action.tone}`}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/75">
                        <DashboardIcon path={action.icon} />
                      </span>
                      <span>
                        <span className="block text-sm font-bold text-slate-900">{action.title}</span>
                        <span className="block text-sm font-medium text-slate-500">{action.detail}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">Recent Meetings</h2>
                <div className="mt-5 space-y-3">
                  {meetings.slice(0, 3).map((meeting) => (
                    <article key={meeting._id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{meeting.title}</h3>
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">{meeting.status}</span>
                          <span className="ml-2">Code: {meeting.meetingId}</span>
                        </p>
                        <p className="mt-3 text-xs font-medium text-slate-400">Started: {new Date(meeting.createdAt).toLocaleString()}</p>
                      </div>
                      <Link to={`/dashboard/meetings/${meeting._id}/video`} className="text-2xl text-slate-300 hover:text-emerald-600 transition">›</Link>
                    </article>
                  ))}
                </div>
              </div>
            </section>
              </>
            )}
          </div>
        </main>
            {isAdmin && isMeetingDrawerOpen && (
          <MeetingDetailsDrawer
            defaultType={drawerDefaultType}
            onClose={() => setIsMeetingDrawerOpen(false)}
            onCreate={handleCreateMeeting}
          />
        )}
      </div>
    </div>
  )
}




