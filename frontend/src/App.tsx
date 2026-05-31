import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
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
import TermsPage from './pages/TermsPage'
import PrivacyPage from './pages/PrivacyPage'
import AuthSuccessPage from './pages/AuthSuccessPage'
import VideoRoom from './pages/VideoRoom'
import PostMeetingDashboard from './pages/PostMeetingDashboard'
import JoinMeeting from './pages/JoinMeeting'
import MeetingsPage from './pages/MeetingsPage'
import PostMeetingsList from './pages/PostMeetingsList'
import AcceptInvitationPage from './pages/AcceptInvitationPage'
import TeamsPage from './pages/TeamsPage'
import logo from './assets/logowobg.png'
import wordmark from './assets/intellmeet_wordmark.png'
import { useAuthStore } from './stores/authStore'
import WorkspaceFrame from './workspace/components/WorkspaceFrame'
import DashboardHome from './workspace/pages/DashboardHome'
import WorkspaceSettingsPage from './workspace/pages/WorkspaceSettingsPage'
import SchedulePage from './workspace/pages/SchedulePage'
import { getInitials, isValidEmail, isValidPhone, readWorkspacePreferences, transitionPath } from './workspace/shared'

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
  const isLoading = useAuthStore((state) => state.isLoading)

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f7fbf8_0%,#ffffff_100%)]">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
          <p className="mt-4 text-slate-600">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return <DashboardHome />
}

function ProfilePage() {
  const { user, updateProfile, logout } = useAuth()
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [address, setAddress] = useState(user?.address ?? '')
  const [about, setAbout] = useState(user?.about ?? '')
  const [avatar, setAvatar] = useState<string | null>(user?.avatar ?? null)
  const [savedMessage, setSavedMessage] = useState('')
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string; address?: string; about?: string }>({})

  useEffect(() => {
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
    setPhone(user?.phone ?? '')
    setAddress(user?.address ?? '')
    setAbout(user?.about ?? '')
    setAvatar(user?.avatar ?? null)
    setSavedMessage('')
    setErrors({})
    setIsEditing(false)
  }, [user])

  if (!user) {
    return <Navigate to="/login" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: { name?: string; email?: string; phone?: string; address?: string; about?: string } = {}
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()
    const trimmedAddress = address.trim()
    const trimmedAbout = about.trim()

    if (!trimmedName) nextErrors.name = 'Full name is required.'
    if (!trimmedEmail) nextErrors.email = 'Email is required.'
    else if (!isValidEmail(trimmedEmail)) nextErrors.email = 'Enter a valid email address.'
    if (trimmedPhone && !isValidPhone(trimmedPhone)) nextErrors.phone = 'Enter a valid phone number.'
    if (trimmedAddress.length > 120) nextErrors.address = 'Address should stay within 120 characters.'
    if (trimmedAbout.length > 300) nextErrors.about = 'About should stay within 300 characters.'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    await updateProfile({
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      address: trimmedAddress,
      about: trimmedAbout,
      avatar,
    })
    setSavedMessage('Profile updated.')
    setIsEditing(false)
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setAvatar(typeof reader.result === 'string' ? reader.result : null)
      setSavedMessage('')
    }
    reader.readAsDataURL(file)
  }

  function handleRemovePhoto() {
    setAvatar(null)
    setSavedMessage('')
  }

  const currentProfileFields = [
    { label: 'Full name', value: user.name },
    { label: 'Email ID', value: user.email },
    { label: 'Contact number', value: user.phone || 'Not added yet' },
    { label: 'Address', value: user.address || 'Not added yet' },
    { label: 'About', value: user.about || 'Not added yet' },
  ]

  return (
    <>
      <header className="border-b border-emerald-100 bg-white px-5 py-5 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Profile</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Your Profile</h1>
      </header>

      <section className="px-5 py-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
            <div className="border-b border-emerald-100 bg-emerald-50/60 px-6 py-7 sm:px-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-emerald-600 text-lg font-bold text-white">
                    {user.avatar ? <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" /> : getInitials(user.name, user.email)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Current profile</p>
                    <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{user.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {savedMessage && (
                    <p className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
                      {savedMessage}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing((current) => !current)
                      setSavedMessage('')
                      setErrors({})
                      setName(user.name)
                      setEmail(user.email)
                      setPhone(user.phone ?? '')
                      setAddress(user.address ?? '')
                      setAbout(user.about ?? '')
                      setAvatar(user.avatar ?? null)
                    }}
                    className="rounded-full bg-emerald-600 px-5 py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
                  >
                    {isEditing ? 'Close Edit' : 'Edit Profile'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await logout()
                      navigate(transitionPath('/'), { replace: true })
                    }}
                    className="rounded-full border border-emerald-200 bg-white px-5 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>

            <dl className="grid gap-0 sm:grid-cols-2">
              {currentProfileFields.map((field) => (
                <div key={field.label} className="border-b border-emerald-50 px-6 py-5 sm:px-8">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{field.label}</dt>
                  <dd className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-800">{field.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {isEditing && (
            <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-emerald-100 bg-white px-6 py-6 shadow-sm sm:px-8 sm:py-8">
              <section className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Edit photo</p>
                    <div className="mt-4 flex h-18 w-18 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-600 text-lg font-bold text-white">
                      {avatar ? <img src={avatar} alt={name || user.name} className="h-full w-full object-cover" /> : getInitials(name || user.name, email || user.email)}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-3 sm:max-w-xs">
                    <label className="inline-flex cursor-pointer items-center rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700">
                      Select file
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    </label>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-100 bg-white text-slate-400 transition hover:border-emerald-200 hover:text-emerald-700"
                      aria-label="Remove profile photo"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 3h6m-9 4h12m-1 0-.8 11.2A2 2 0 0114.2 20H9.8a2 2 0 01-1.99-1.8L7 7m3 4v5m4-5v5" />
                      </svg>
                    </button>
                  </div>
                </div>
              </section>

              <section className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Full name</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value)
                      setSavedMessage('')
                    }}
                    className="mt-2 w-full rounded-2xl border border-emerald-100 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                  />
                  {errors.name && <span className="mt-2 block text-xs font-medium text-rose-500">{errors.name}</span>}
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email ID</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      setSavedMessage('')
                    }}
                    className="mt-2 w-full rounded-2xl border border-emerald-100 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                  />
                  {errors.email && <span className="mt-2 block text-xs font-medium text-rose-500">{errors.email}</span>}
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Contact number</span>
                  <input
                    type="text"
                    value={phone}
                    onChange={(event) => {
                      setPhone(event.target.value)
                      setSavedMessage('')
                    }}
                    className="mt-2 w-full rounded-2xl border border-emerald-100 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                  />
                  {errors.phone && <span className="mt-2 block text-xs font-medium text-rose-500">{errors.phone}</span>}
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Address</span>
                  <input
                    type="text"
                    value={address}
                    onChange={(event) => {
                      setAddress(event.target.value)
                      setSavedMessage('')
                    }}
                    className="mt-2 w-full rounded-2xl border border-emerald-100 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                  />
                  {errors.address && <span className="mt-2 block text-xs font-medium text-rose-500">{errors.address}</span>}
                </label>
              </section>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">About</span>
                <textarea
                  rows={5}
                  value={about}
                  onChange={(event) => {
                    setAbout(event.target.value)
                    setSavedMessage('')
                  }}
                  className="mt-2 w-full rounded-2xl border border-emerald-100 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                />
                {errors.about && <span className="mt-2 block text-xs font-medium text-rose-500">{errors.about}</span>}
              </label>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false)
                    setErrors({})
                    setSavedMessage('')
                    setName(user.name)
                    setEmail(user.email)
                    setPhone(user.phone ?? '')
                    setAddress(user.address ?? '')
                    setAbout(user.about ?? '')
                    setAvatar(user.avatar ?? null)
                  }}
                  className="rounded-full border border-emerald-200 bg-white px-5 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-emerald-600 px-5 py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
                >
                  Save Profile
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </>
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
        <Route path="/transition" element={<TransitionPage />} />
        <Route path="/auth/success" element={<AuthSuccessPage />} />
        <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/profile" element={<WorkspaceFrame><ProfilePage /></WorkspaceFrame>} />
        <Route path="/teams" element={<WorkspaceFrame><TeamsPage /></WorkspaceFrame>} />
        <Route path="/meetings" element={<WorkspaceFrame><MeetingsPage /></WorkspaceFrame>} />
        <Route path="/post-meetings" element={<WorkspaceFrame><PostMeetingsList /></WorkspaceFrame>} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/settings" element={<WorkspaceSettingsPage />} />
        <Route path="/meeting/:meetingId" element={<VideoRoom />} />
        <Route path="/dashboard/meetings/:meetingId/video" element={<VideoRoom />} />
        <Route path="/dashboard/meetings/:meetingId/review" element={<PostMeetingDashboard />} />
        <Route path="/meetings/:code/join" element={<JoinMeeting />} />
      </Routes>
    </>
  )
}

function App() {
  useEffect(() => {
    document.documentElement.classList.toggle('intellmeet-compact', readWorkspacePreferences().compactMode)
  }, [])

  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout />
      </AuthProvider>
    </BrowserRouter>
  )
}

function TransitionPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const destination = searchParams.get('to') || '/'

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      navigate(destination, { replace: true })
    }, 2400)

    return () => window.clearTimeout(timeout)
  }, [destination, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f7fbf8_0%,#ffffff_100%)] px-4">
      <div className="w-full max-w-sm rounded-4xl border border-emerald-100 bg-white px-8 py-9 text-center shadow-[0_24px_80px_rgba(5,150,105,0.12)]">
        <div className="flex items-end justify-center gap-0">
          <img src={logo} alt="IntellMeet logo" className="h-14 w-14 scale-150 object-contain" />
          <img src={wordmark} alt="IntellMeet" className="mb-px h-11 w-48 object-contain" />
        </div>
        <p className="mt-7 text-sm font-bold tracking-wide text-slate-700">Waiting with you</p>
        <div className="mt-5 overflow-hidden rounded-full bg-emerald-50 px-2 py-2">
          <div className="relative h-2">
            <span className="intellmeet-wait-dots absolute left-0 top-0 flex h-2 items-center gap-2">
              <span />
              <span />
              <span />
              <span />
              <span />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App




