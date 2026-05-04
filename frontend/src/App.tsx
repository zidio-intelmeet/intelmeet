import { useState, useEffect, type DragEvent, type FormEvent, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Navbar } from './components/layout/Navbar'
import { CtaSection } from './sections/CtaSection'
import { FeaturesSection } from './sections/FeaturesSection'
import { HeroSection } from './sections/HeroSection'
import { MetricsSection } from './sections/MetricsSection'
import { WorkflowSection } from './sections/WorkflowSection'
import { AuthProvider } from './context/AuthProvider'
import { useAuth } from './context/auth'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import MeetingRoom from './pages/MeetingRoom' 

// ⚠️ Make sure these paths point to your actual files!
import { useAuthStore } from './stores/authStore' 
import { apiService } from './services/api'
import logo from './assets/logowobg.png'
import TeamsPage from './pages/TeamsPage'
import wordmark from './assets/intellmeet_wordmark.png'

const dashboardLinks = [
  { label: 'Dashboard', to: '/workspace', icon: 'M3 11.5 12 4l9 7.5M5 10v9h5v-5h4v5h5v-9' },
  { label: 'Teams', to: '/teams', icon: 'M17 20h5v-1a4 4 0 00-5-3.87M17 20H7m10 0v-1c0-.653-.084-1.287-.24-1.89M7 20H2v-1a4 4 0 015-3.87M7 20v-1c0-.653.084-1.287.24-1.89m0 0a5.002 5.002 0 019.52 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { label: 'Meetings', to: '/meetings', icon: 'M4 7h11a2 2 0 0 1 2 2v1.5l3-2v7l-3-2V15a2 2 0 0 1-2 2H4z' },
  { label: 'Schedule', to: '/schedule', icon: 'M7 3v4M17 3v4M4 9h16M5 5h14v15H5z' },
  { label: 'Settings', to: '/settings', icon: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 12h2M18 12h2M12 4v2M12 18v2' },
]

const statCards = [
  { label: 'Total Meetings', value: '0', detail: '0 completed', tone: 'bg-emerald-50 text-emerald-700', icon: 'M4 7h11a2 2 0 0 1 2 2v1.5l3-2v7l-3-2V15a2 2 0 0 1-2 2H4z' },
  { label: 'Active Meetings', value: '0', detail: '0 scheduled', tone: 'bg-teal-50 text-teal-700', icon: 'M8 17V7m0 10 8-5-8-5' },
  { label: 'This Week', value: '0', detail: 'Upcoming meetings', tone: 'bg-green-50 text-green-700', icon: 'M7 3v4M17 3v4M4 9h16M5 5h14v15H5z' },
]

const quickActions = [
  { title: 'Start Instant Meeting', detail: 'Begin a meeting right now', tone: 'bg-emerald-50 text-emerald-700', icon: 'M12 5v14M5 12h14' },
  { title: 'Schedule Meeting', detail: 'Plan a meeting for later', tone: 'bg-teal-50 text-teal-700', icon: 'M7 3v4M17 3v4M4 9h16M5 5h14v15H5z' },
  { title: 'Invite Team Members', detail: 'Grow your workspace', tone: 'bg-lime-50 text-lime-700', icon: 'M12 5v6M9 8h6M7 20a5 5 0 0 1 10 0M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' },
]

type StoredMeeting = {
  id: string
  title: string
  code: string
  host: string
  status: 'Live' | 'Ended' | 'Scheduled'
  createdAt: string
  recording: string
  type: string
  scheduledFor: string
  duration: string
  agenda: string
  participants: string
}

const LEGACY_MEETINGS_STORAGE_KEY = 'intellmeet-meetings'
const MEETINGS_STORAGE_KEY = 'intellmeet-meetings-v2'

const seedMeetings: StoredMeeting[] = []

function readMeetings() {
  try {
    localStorage.removeItem(LEGACY_MEETINGS_STORAGE_KEY)
    const storedMeetings = localStorage.getItem(MEETINGS_STORAGE_KEY)
    return storedMeetings ? (JSON.parse(storedMeetings) as StoredMeeting[]) : seedMeetings
  } catch {
    localStorage.removeItem(MEETINGS_STORAGE_KEY)
    return seedMeetings
  }
}

function writeMeetings(meetings: StoredMeeting[]) {
  localStorage.setItem(MEETINGS_STORAGE_KEY, JSON.stringify(meetings))
}

type MeetingFormValues = {
  title: string
  type: string
  scheduledFor: string
  duration: string
  agenda: string
  participants: string
  recording: string
  status: StoredMeeting['status']
}

function createMeeting(host: string, values?: Partial<MeetingFormValues>) {
  const code = Math.random().toString(36).slice(2, 10)
  const meeting: StoredMeeting = {
    id: crypto.randomUUID(),
    title: values?.title?.trim() || 'Instant Meeting',
    code,
    host,
    status: values?.status ?? 'Live',
    createdAt: new Date().toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    recording: values?.recording ?? 'Recording will appear here after the meeting ends',
    type: values?.type ?? 'Instant',
    scheduledFor: values?.scheduledFor ?? 'Starts now',
    duration: values?.duration ?? '30 minutes',
    agenda: values?.agenda?.trim() || 'No agenda added',
    participants: values?.participants?.trim() || 'No participants added',
  }
  const meetings = [meeting, ...readMeetings()]
  writeMeetings(meetings)
  return meeting
}

function HomePage() {
  return (
    <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#eef6ff_55%,#ffffff_100%)]">
      <div className="absolute inset-x-0 top-0 z-0 h-136 bg-[linear-gradient(135deg,rgba(37,99,235,0.12),transparent_40%,rgba(14,165,233,0.12))]" />
      <div className="relative z-10">
        <Navbar />
        <main>
          <HeroSection />
          <MetricsSection />
          <FeaturesSection />
          <WorkflowSection />
          <CtaSection />
        </main>
      </div>
    </div>
  )
}

function WorkspacePage() {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <DashboardHome />
}

function DashboardIcon({ path }: { path: string }) {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  )
}

function WorkspaceFrame({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const initials = getInitials(user.name, user.email)

  return (
    <div className="min-h-screen bg-[#f7fbf8] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[20rem_1fr]">
        <aside className="flex border-b border-emerald-100 bg-white lg:min-h-screen lg:flex-col lg:border-b-0 lg:border-r">
          <div className="flex w-full items-center justify-between gap-4 px-5 py-4 lg:block lg:px-6">
            <Link to="/" className="flex items-end gap-0">
              <img src={logo} alt="IntellMeet logo" className="h-12 w-12 scale-150 object-contain sm:h-14 sm:w-14" />
              <img src={wordmark} alt="IntellMeet" className="mb-px h-11 w-47 object-contain" />
            </Link>
            <div className="flex items-center gap-0 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                {initials}
              </div>
            </div>
          </div>

          <nav className="hidden flex-1 px-3 py-3 lg:block">
            <div className="space-y-1">
              {dashboardLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={[
                    'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition',
                    location.pathname === item.to
                      ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                      : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700',
                  ].join(' ')}
                >
                  <DashboardIcon path={item.icon} />
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          <div className="mt-auto hidden border-t border-emerald-100 p-4 lg:block">
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-50/70 p-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{user.name}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  )
}

function DashboardHome() {
  const { user } = useAuth()
  const [meetings, setMeetings] = useState(() => readMeetings())
  const [isMeetingDrawerOpen, setIsMeetingDrawerOpen] = useState(false)
  const [drawerDefaultType, setDrawerDefaultType] = useState('Instant')

  if (!user) {
    return null
  }

  const currentUser = user
  const firstName = currentUser.name.split(/\s+/)[0] || currentUser.name
  const initials = getInitials(currentUser.name, currentUser.email)

  function handleOpenMeetingDrawer(defaultType = 'Instant') {
    setDrawerDefaultType(defaultType)
    setIsMeetingDrawerOpen(true)
  }

  function handleCreateMeeting(values: MeetingFormValues) {
    const meeting = createMeeting(currentUser.name, {
      ...values,
      scheduledFor: values.scheduledFor || (values.status === 'Live' ? 'Starts now' : 'Not selected'),
    })
    setMeetings((currentMeetings) => [meeting, ...currentMeetings])
  }

  const activeMeetingCount = meetings.filter((meeting) => meeting.status === 'Live').length
  const dashboardStats = statCards.map((card) => {
    if (card.label === 'Total Meetings') {
      return { ...card, value: String(meetings.length), detail: `${meetings.filter((meeting) => meeting.status === 'Ended').length} completed` }
    }
    if (card.label === 'Active Meetings') {
      return { ...card, value: String(activeMeetingCount), detail: `${meetings.filter((meeting) => meeting.status === 'Scheduled').length} scheduled` }
    }
    if (card.label === 'This Week') {
      return { ...card, value: String(meetings.length), detail: 'Total workspace meetings' }
    }
    return card
  })

  return (
    <div className="min-h-screen bg-[#f7fbf8] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[20rem_1fr]">
        <aside className="flex border-b border-emerald-100 bg-white lg:min-h-screen lg:flex-col lg:border-b-0 lg:border-r">
          <div className="flex w-full items-center justify-between gap-4 px-5 py-4 lg:block lg:px-6">
            <Link to="/" className="flex items-end gap-0">
              <img src={logo} alt="IntellMeet logo" className="h-12 w-12 scale-150 object-contain sm:h-14 sm:w-14" />
              <img src={wordmark} alt="IntellMeet" className="mb-px h-11 w-47 object-contain" />
            </Link>
            <div className="flex items-center gap-0 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                {initials}
              </div>
            </div>
          </div>

          <nav className="hidden flex-1 px-3 py-3 lg:block">
            <div className="space-y-1">
              {dashboardLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={[
                    'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition',
                    item.to === '/workspace'
                      ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                      : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700',
                  ].join(' ')}
                >
                  <DashboardIcon path={item.icon} />
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          <div className="mt-auto hidden border-t border-emerald-100 p-4 lg:block">
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-50/70 p-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{user.name}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <header className="flex items-center justify-between border-b border-emerald-100 bg-white px-5 py-4 sm:px-8">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Workspace</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Welcome, {firstName} !
              </h1>
            </div>
            <button
              type="button"
              onClick={() => handleOpenMeetingDrawer()}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
            >
              + New Meeting
            </button>
          </header>

          <div className="px-5 py-6 sm:px-8 lg:px-10">
            <p className="text-sm font-medium text-slate-500">Here's what's happening with your workspace today.</p>

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

            <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
              <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-slate-950">Quick Actions</h2>
                <div className="mt-5 space-y-3">
                  {quickActions.map((action) => (
                    <button
                      type="button"
                      key={action.title}
                      onClick={
                        action.title === 'Start Instant Meeting'
                          ? () => handleOpenMeetingDrawer('Instant')
                          : action.title === 'Schedule Meeting'
                            ? () => handleOpenMeetingDrawer('Scheduled')
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
                    <article key={meeting.code} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{meeting.title}</h3>
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">{meeting.status}</span>
                          <span className="ml-2">Code: {meeting.code}</span>
                        </p>
                        <p className="mt-3 text-xs font-medium text-slate-400">Started: {meeting.createdAt}</p>
                      </div>
                      <Link to={`/meeting/${meeting.code}`} className="text-2xl text-slate-300 hover:text-emerald-600 transition">›</Link>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </main>
        {isMeetingDrawerOpen && (
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

function MeetingDetailsDrawer({
  defaultType = 'Instant',
  onClose,
  onCreate,
}: {
  defaultType?: string
  onClose: () => void
  onCreate: (values: MeetingFormValues) => void
}) {
  const [meetingTitle, setMeetingTitle] = useState('')
  const [meetingType, setMeetingType] = useState(defaultType)
  const [scheduledFor, setScheduledFor] = useState('')
  const [duration, setDuration] = useState('30 minutes')
  const [agenda, setAgenda] = useState('')
  const [participants, setParticipants] = useState('')
  const [recordMeeting, setRecordMeeting] = useState(true)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    onCreate({
      title: meetingTitle,
      type: meetingType,
      scheduledFor,
      duration,
      agenda,
      participants,
      status: meetingType === 'Scheduled' ? 'Scheduled' : 'Live',
      recording: recordMeeting ? 'Recording enabled' : 'Recording disabled',
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/25" onClick={onClose}>
      <aside
        className="h-full w-full max-w-md overflow-y-auto border-l border-emerald-100 bg-white p-6 shadow-2xl shadow-emerald-950/10"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-emerald-100 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">New Meeting</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">Meeting details</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-lg font-bold text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
            aria-label="Close meeting details"
          >
            x
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Meeting title</span>
            <input
              value={meetingTitle}
              onChange={(event) => setMeetingTitle(event.target.value)}
              placeholder="Weekly product sync"
              className="mt-2 w-full rounded-xl border border-emerald-100 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Type</span>
              <select
                value={meetingType}
                onChange={(event) => setMeetingType(event.target.value)}
                className="mt-2 w-full rounded-xl border border-emerald-100 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              >
                <option>Instant</option>
                <option>Scheduled</option>
                <option>Team Sync</option>
                <option>Client Meeting</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Duration</span>
              <select
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                className="mt-2 w-full rounded-xl border border-emerald-100 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              >
                <option>15 minutes</option>
                <option>30 minutes</option>
                <option>45 minutes</option>
                <option>60 minutes</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Date and time</span>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(event) => setScheduledFor(event.target.value)}
              className="mt-2 w-full rounded-xl border border-emerald-100 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Participants</span>
            <input
              value={participants}
              onChange={(event) => setParticipants(event.target.value)}
              placeholder="teammate@company.com, client@company.com"
              className="mt-2 w-full rounded-xl border border-emerald-100 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Agenda</span>
            <textarea
              value={agenda}
              onChange={(event) => setAgenda(event.target.value)}
              rows={4}
              placeholder="Add topics, goals, or preparation notes"
              className="mt-2 w-full resize-none rounded-xl border border-emerald-100 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
          </label>

          <label className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
            <span>
              <span className="block text-sm font-semibold text-slate-800">Record meeting</span>
              <span className="block text-xs font-medium text-slate-500">Store recording status with this meeting.</span>
            </span>
            <input
              type="checkbox"
              checked={recordMeeting}
              onChange={(event) => setRecordMeeting(event.target.checked)}
              className="h-5 w-5 rounded border-emerald-200 text-emerald-600 focus:ring-emerald-500"
            />
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
            >
              Create Meeting
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </aside>
    </div>
  )
}

function WorkspaceMeetingsPage() {
  const { user } = useAuth()
  const [meetings, setMeetings] = useState(() => readMeetings())
  const navigate = useNavigate()
  const [isMeetingDrawerOpen, setIsMeetingDrawerOpen] = useState(false)
  const [drawerDefaultType, setDrawerDefaultType] = useState('Instant')

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const currentUser = user

  function handleOpenMeetingDrawer(defaultType = 'Instant') {
    setDrawerDefaultType(defaultType)
    setIsMeetingDrawerOpen(true)
  }

  function handleCreateMeeting(values: MeetingFormValues) {
    const meeting = createMeeting(currentUser.name, {
      ...values,
      scheduledFor: values.scheduledFor || (values.status === 'Live' ? 'Starts now' : 'Not selected'),
    })
    setMeetings((currentMeetings) => [meeting, ...currentMeetings])
  }

  function handleDeleteMeeting(meetingId: string) {
    setMeetings((currentMeetings) => {
      const nextMeetings = currentMeetings.filter((meeting) => meeting.id !== meetingId)
      writeMeetings(nextMeetings)
      return nextMeetings
    })
  }

  return (
    <WorkspaceFrame>
      <>
        <header className="flex items-center justify-between border-b border-emerald-100 bg-white px-5 py-5 sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Meetings</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Meeting Details</h1>
          </div>
          <button
            type="button"
            onClick={() => handleOpenMeetingDrawer()}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
          >
            + New Meeting
          </button>
        </header>

        <section className="px-5 py-6 sm:px-8 lg:px-10">
          <div className="grid gap-4">
            {meetings.length === 0 && (
              <div className="rounded-2xl border border-dashed border-emerald-200 bg-white p-8 text-center">
                <p className="text-sm font-semibold text-slate-500">No meeting records yet.</p>
              </div>
            )}

            {meetings.map((meeting) => (
              <article key={meeting.id} className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-950">{meeting.title}</h2>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        {meeting.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-500">Hosted by {meeting.host}</p>
                  </div>
                  <div className="grid gap-3 text-sm sm:grid-cols-3 lg:min-w-136">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-bold uppercase text-slate-400">Code</p>
                      <p className="mt-1 font-bold text-slate-800">{meeting.code}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-bold uppercase text-slate-400">Started</p>
                      <p className="mt-1 font-bold text-slate-800">{meeting.createdAt}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-bold uppercase text-slate-400">Recording</p>
                      <p className="mt-1 font-bold text-slate-800">{meeting.recording}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-bold uppercase text-slate-400">Type</p>
                      <p className="mt-1 font-bold text-slate-800">{meeting.type}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-bold uppercase text-slate-400">When</p>
                      <p className="mt-1 font-bold text-slate-800">{meeting.scheduledFor}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-bold uppercase text-slate-400">Duration</p>
                      <p className="mt-1 font-bold text-slate-800">{meeting.duration}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 sm:col-span-3">
                      <p className="text-xs font-bold uppercase text-slate-400">Agenda</p>
                      <p className="mt-1 font-bold text-slate-800">{meeting.agenda}</p>
                      <p className="mt-2 text-xs font-semibold text-slate-400">Participants: {meeting.participants}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 self-start lg:self-center">
                    <button
                      type="button"
                      onClick={() => navigate(`/meeting/${meeting.code}`)}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
                    >
                      Join Room
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMeeting(meeting.id)}
                      className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-bold text-rose-600 transition hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
        {isMeetingDrawerOpen && (
          <MeetingDetailsDrawer
            defaultType={drawerDefaultType}
            onClose={() => setIsMeetingDrawerOpen(false)}
            onCreate={handleCreateMeeting}
          />
        )}
      </>
    </WorkspaceFrame>
  )
}

function WorkspaceSettingsPage() {
  const { user, updateProfile, logout } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [address, setAddress] = useState(user?.address ?? '')
  const [about, setAbout] = useState(user?.about ?? '')
  const [savedMessage, setSavedMessage] = useState('')
  const [errors, setErrors] = useState<SettingsErrors>({})

  if (!user) {
    return <Navigate to="/login" replace />
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()
    const trimmedAddress = address.trim()
    const trimmedAbout = about.trim()
    const nextErrors: SettingsErrors = {}

    if (!trimmedName) nextErrors.name = 'Full name is required.'
    if (!trimmedEmail) nextErrors.email = 'Email ID is required.'
    else if (!isValidEmail(trimmedEmail)) nextErrors.email = 'Enter a valid email ID.'
    if (trimmedPhone && !isValidPhone(trimmedPhone)) nextErrors.phone = 'Enter a valid contact number.'
    if (trimmedAddress.length > 120) nextErrors.address = 'Address must be 120 characters or less.'
    if (trimmedAbout.length > 300) nextErrors.about = 'About must be 300 characters or less.'

    setErrors(nextErrors)
    setSavedMessage('')

    if (Object.keys(nextErrors).length > 0) return

    updateProfile({
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      address: trimmedAddress,
      about: trimmedAbout,
    })
    setSavedMessage('Profile updated successfully.')
  }

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <WorkspaceFrame>
      <>
        <header className="border-b border-emerald-100 bg-white px-5 py-5 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Settings</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Edit Profile</h1>
        </header>

        <section className="px-5 py-6 sm:px-8 lg:px-10">
          <form onSubmit={handleSubmit} className="max-w-4xl rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Full name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} className={`mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 ${errors.name ? 'border-rose-300' : 'border-slate-200'}`} />
                {errors.name && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.name}</p>}
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Email ID</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={`mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 ${errors.email ? 'border-rose-300' : 'border-slate-200'}`} />
                {errors.email && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.email}</p>}
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Contact number</span>
                <input value={phone} onChange={(event) => setPhone(event.target.value)} className={`mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 ${errors.phone ? 'border-rose-300' : 'border-slate-200'}`} />
                {errors.phone && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.phone}</p>}
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Address</span>
                <input value={address} onChange={(event) => setAddress(event.target.value)} className={`mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 ${errors.address ? 'border-rose-300' : 'border-slate-200'}`} />
                {errors.address && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.address}</p>}
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-semibold text-slate-700">About</span>
                <textarea value={about} onChange={(event) => setAbout(event.target.value)} rows={5} className={`mt-2 w-full resize-none rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 ${errors.about ? 'border-rose-300' : 'border-slate-200'}`} />
                {errors.about && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.about}</p>}
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700">
                Save Changes
              </button>
              <button type="button" onClick={handleLogout} className="rounded-xl border border-rose-200 px-5 py-3 text-sm font-bold text-rose-600 transition hover:bg-rose-50">
                Logout
              </button>
              {savedMessage && <p className="text-sm font-semibold text-emerald-600">{savedMessage}</p>}
            </div>
          </form>
        </section>
      </>
    </WorkspaceFrame>
  )
}

function AccountPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)]">
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-blue-100 bg-white p-8 shadow-[0_20px_60px_rgba(37,99,235,0.10)]">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">IntellMeet</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  )
}

const scheduleColumns = [
  { id: 'todo', title: 'To Do', accent: 'bg-amber-500' },
  { id: 'progress', title: 'In Progress', accent: 'bg-emerald-500' },
  { id: 'scheduled', title: 'Done', accent: 'bg-rose-500' },
]

type ScheduleColumnId = (typeof scheduleColumns)[number]['id']

type ScheduleTask = {
  id: string
  title: string
  note: string
  dueAt: string
  columnId: ScheduleColumnId
  createdAt: number
}

type ScheduleSortOrder = 'newest' | 'earliest'

type SettingsErrors = {
  name?: string
  email?: string
  phone?: string
  address?: string
  about?: string
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidPhone(phone: string) {
  return /^[+]?[\d\s()-]{7,20}$/.test(phone)
}

function getInitials(name: string, email: string) {
  const source = name.trim() || email.split('@')[0] || 'User'

  return (
    source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U'
  )
}

function SchedulePage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<ScheduleTask[]>([])
  const [taskTitle, setTaskTitle] = useState('')
  const [taskNote, setTaskNote] = useState('')
  const [taskDueAt, setTaskDueAt] = useState('')
  const [targetColumn, setTargetColumn] = useState<ScheduleColumnId>('todo')
  const [sortOrders, setSortOrders] = useState<Record<ScheduleColumnId, ScheduleSortOrder>>({
    todo: 'newest',
    progress: 'newest',
    scheduled: 'newest',
  })
  const [sortMenuColumn, setSortMenuColumn] = useState<ScheduleColumnId | null>(null)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!taskTitle.trim()) {
      return
    }

    setTasks((currentTasks) => [
      {
        id: crypto.randomUUID(),
        title: taskTitle.trim(),
        note: taskNote.trim(),
        dueAt: taskDueAt,
        columnId: targetColumn,
        createdAt: Date.now(),
      },
      ...currentTasks,
    ])
    setTaskTitle('')
    setTaskNote('')
    setTaskDueAt('')
    setTargetColumn('todo')
  }

  function handleDragStart(event: DragEvent<HTMLElement>, taskId: string) {
    event.dataTransfer.setData('text/plain', taskId)
    event.dataTransfer.effectAllowed = 'move'
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, columnId: ScheduleColumnId) {
    event.preventDefault()
    const taskId = event.dataTransfer.getData('text/plain')

    setTasks((currentTasks) =>
      currentTasks.map((task) => (task.id === taskId ? { ...task, columnId } : task)),
    )
  }

  function getColumnTasks(columnId: ScheduleColumnId) {
    return tasks
      .filter((task) => task.columnId === columnId)
      .toSorted((firstTask, secondTask) =>
        sortOrders[columnId] === 'newest'
          ? secondTask.createdAt - firstTask.createdAt
          : firstTask.createdAt - secondTask.createdAt,
      )
  }

  function updateSortOrder(columnId: ScheduleColumnId, order: ScheduleSortOrder) {
    setSortOrders((currentOrders) => ({ ...currentOrders, [columnId]: order }))
    setSortMenuColumn(null)
  }

  return (
    <WorkspaceFrame>
      <>
        <header className="border-b border-emerald-100 bg-white px-5 py-5 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Schedule</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Kanban Board</h1>
        </header>

        <section className="px-5 py-6 sm:px-8 lg:px-10">
          <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-4 border-b border-emerald-100 pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Create your own tasks, then drag and drop them into the column where they belong.
              </p>
            </div>
          </div>

          <form onSubmit={handleAddTask} className="mt-6 grid gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 xl:grid-cols-[1.1fr_1fr_1.1fr_auto_auto]">
            <label className="block">
              <span className="text-xs font-bold uppercase text-emerald-700">Task</span>
              <input
                type="text"
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Write a task or meeting title"
                className="mt-1.5 w-full rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-emerald-700">Date and time</span>
              <input
                type="datetime-local"
                value={taskDueAt}
                onChange={(event) => setTaskDueAt(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-emerald-700">Note / detail</span>
              <input
                type="text"
                value={taskNote}
                onChange={(event) => setTaskNote(event.target.value)}
                placeholder="Add notes or details"
                className="mt-1.5 w-full rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-emerald-700">List</span>
              <select
                value={targetColumn}
                onChange={(event) => setTargetColumn(event.target.value as ScheduleColumnId)}
                className="mt-1.5 w-full min-w-36 rounded-xl border border-emerald-100 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              >
                {scheduleColumns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
              >
                Add
              </button>
            </div>
          </form>

          <div className="mt-7 grid gap-5 lg:grid-cols-3">
            {scheduleColumns.map((column) => (
              <div key={column.id} className="relative min-h-96 rounded-2xl border border-emerald-100 bg-slate-50 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${column.accent}`} />
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">{column.title}</h2>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 shadow-sm">
                    {getColumnTasks(column.id).length}
                  </span>
                </div>

                <div className="mb-3 flex items-center justify-between rounded-xl border border-emerald-100 bg-white px-3 py-2">
                  <p className="text-xs font-semibold text-slate-500">
                    Sort by <span className="font-bold text-slate-800">{sortOrders[column.id] === 'newest' ? 'Newest' : 'Earliest'}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setSortMenuColumn(column.id)}
                    className="rounded-lg p-2 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700"
                    aria-label={`Sort ${column.title} tasks`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v10m0 0 3-3m-3 3-3-3M16 17V7m0 0 3 3m-3-3-3 3" />
                    </svg>
                  </button>
                </div>

                {sortMenuColumn === column.id && (
                  <div className="absolute left-4 right-4 top-30 z-20 rounded-2xl border border-emerald-100 bg-white p-4 shadow-xl shadow-emerald-950/10">
                    <div className="flex items-center justify-between border-b border-emerald-50 pb-3">
                      <h3 className="text-sm font-bold text-slate-900">Sort {column.title}</h3>
                      <button
                        type="button"
                        onClick={() => setSortMenuColumn(null)}
                        className="rounded-lg px-2 py-1 text-sm font-bold text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
                        aria-label="Close sort menu"
                      >
                        Ã—
                      </button>
                    </div>
                    <div className="mt-3 space-y-1">
                      {[
                        { value: 'newest' as const, label: 'Date created: Newest' },
                        { value: 'earliest' as const, label: 'Date created: Earliest' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateSortOrder(column.id, option.value)}
                          className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-emerald-50"
                        >
                          <span>{option.label}</span>
                          <span
                            className={[
                              'flex h-5 w-5 items-center justify-center rounded-full border',
                              sortOrders[column.id] === option.value ? 'border-emerald-600' : 'border-slate-300',
                            ].join(' ')}
                          >
                            {sortOrders[column.id] === option.value && <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(event, column.id)}
                  className="max-h-112 min-h-72 space-y-3 overflow-y-auto rounded-xl border border-dashed border-emerald-100 p-2 pr-3"
                >
                  {getColumnTasks(column.id).length === 0 && (
                    <div className="flex min-h-32 items-center justify-center rounded-xl bg-white px-4 text-center text-sm font-medium text-slate-400">
                      Drop tasks here
                    </div>
                  )}

                  {getColumnTasks(column.id).map((task) => (
                    <article
                      key={task.id}
                      draggable
                      onDragStart={(event) => handleDragStart(event, task.id)}
                      className="cursor-grab rounded-2xl border border-emerald-50 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          Task
                        </span>
                        <span className="text-xs font-medium text-slate-400">Drag me</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-950">{task.title}</h3>
                      {task.dueAt && (
                        <p className="mt-2 text-xs font-bold uppercase tracking-wide text-emerald-700">
                          {new Date(task.dueAt).toLocaleString([], {
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                      {task.note && <p className="mt-2 text-sm leading-6 text-slate-500">{task.note}</p>}
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
          </div>
        </section>
      </>
    </WorkspaceFrame>
  )
}

function ProfilePage() {
  const { user } = useAuth()

  if (!user) {
    return (
      <AccountPage
        title="Profile"
        description="Log in to view your full name, email address, contact number, address, and about details."
      />
    )
  }

  const profileFields = [
    { label: 'Full name', value: user.name },
    { label: 'Email ID', value: user.email },
    { label: 'Contact number', value: user.phone || 'Not added yet' },
    { label: 'Address', value: user.address || 'Not added yet' },
    { label: 'About', value: user.about || 'Not added yet' },
  ]

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)]">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-[0_20px_60px_rgba(37,99,235,0.10)]">
          <div className="border-b border-blue-50 bg-blue-50/60 px-6 py-7 sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                  {user.avatar ? <img src={user.avatar} alt={user.name} className="h-full w-full rounded-full object-cover" /> : getInitials(user.name, user.email)}
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Profile</p>
                  <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{user.name}</h1>
                  <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                </div>
              </div>
              <Link
                to="/settings"
                className="rounded-full bg-blue-600 px-5 py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
              >
                Edit Profile
              </Link>
            </div>
          </div>

          <dl className="grid gap-0 sm:grid-cols-2">
            {profileFields.map((field) => (
              <div key={field.label} className="border-b border-blue-50 px-6 py-5 sm:px-8">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{field.label}</dt>
                <dd className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-800">{field.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </main>
    </div>
  )
}

function Layout() {
  const location = useLocation()
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup'

  return (
    <>
      {isAuthPage && <Navbar />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />

        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/teams" element={<WorkspaceFrame><TeamsPage /></WorkspaceFrame>} />
        <Route path="/meetings" element={<WorkspaceMeetingsPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/settings" element={<WorkspaceSettingsPage />} />
        
        <Route path="/meeting/:meetingId" element={<MeetingRoom />} />
      </Routes>
    </>
  )
}
function AuthInitializer({ children }: { children: React.ReactNode }) {
  const setAuth = useAuthStore(s => s.setAuth)
  const logout = useAuthStore(s => s.logout)

  useEffect(() => {
    const initAuth = async () => {
      try {
        const refreshRes = await apiService.refreshToken()
        const accessToken = refreshRes.data?.accessToken
        
        if (accessToken) {
          apiService.setAccessToken(accessToken)
          const meRes = await apiService.getMe()
          if (meRes.data) {
            setAuth(meRes.data, accessToken)
            return
          }
        }
      } catch (error) {
        // 🤫 Silent failure: If no token is found, we just stay logged out.
        console.log("No active session found. Please log in.");
      }
      logout()
    }
    initAuth()
  }, [setAuth, logout])

  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthInitializer>
          <Layout />
        </AuthInitializer>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App