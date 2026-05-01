import { useState, type DragEvent, type FormEvent } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
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
  details: string
  columnId: ScheduleColumnId
}

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
  const [tasks, setTasks] = useState<ScheduleTask[]>([])
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDetails, setTaskDetails] = useState('')
  const [targetColumn, setTargetColumn] = useState<ScheduleColumnId>('todo')

  function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!taskTitle.trim()) {
      return
    }

    setTasks((currentTasks) => [
      ...currentTasks,
      {
        id: crypto.randomUUID(),
        title: taskTitle.trim(),
        details: taskDetails.trim(),
        columnId: targetColumn,
      },
    ])
    setTaskTitle('')
    setTaskDetails('')
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(244,114,182,0.18),transparent_28%),linear-gradient(180deg,#fffaf0_0%,#f2fbf4_48%,#ffffff_100%)]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-amber-100 bg-white/78 p-6 shadow-[0_24px_70px_rgba(120,113,108,0.13)] backdrop-blur sm:p-8">
          <div className="flex flex-col gap-4 border-b border-amber-100 pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Schedule</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-950">Kanban Board</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                Create your own tasks, then drag and drop them into the column where they belong.
              </p>
            </div>
          </div>

          <form onSubmit={handleAddTask} className="mt-6 grid gap-3 rounded-2xl border border-stone-200/70 bg-white/85 p-4 sm:grid-cols-[1fr_1fr_auto]">
            <input
              type="text"
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              placeholder="Write a task or meeting title"
              className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
            <input
              type="text"
              value={taskDetails}
              onChange={(event) => setTaskDetails(event.target.value)}
              placeholder="Add time, note, or detail"
              className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
            <div className="flex gap-2">
              <select
                value={targetColumn}
                onChange={(event) => setTargetColumn(event.target.value as ScheduleColumnId)}
                className="min-w-36 rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm font-medium text-stone-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              >
                {scheduleColumns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.title}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-stone-900/15 transition hover:bg-stone-800"
              >
                Add
              </button>
            </div>
          </form>

          <div className="mt-7 grid gap-5 lg:grid-cols-3">
            {scheduleColumns.map((column) => (
              <div
                key={column.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleDrop(event, column.id)}
                className="min-h-96 rounded-2xl border border-stone-200/70 bg-stone-50/80 p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${column.accent}`} />
                    <h2 className="text-sm font-bold uppercase tracking-wide text-stone-800">{column.title}</h2>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-stone-500 shadow-sm">
                    {tasks.filter((task) => task.columnId === column.id).length}
                  </span>
                </div>

                <div className="min-h-72 space-y-3 rounded-xl border border-dashed border-stone-200 p-2">
                  {tasks.filter((task) => task.columnId === column.id).length === 0 && (
                    <div className="flex min-h-32 items-center justify-center rounded-xl bg-white/60 px-4 text-center text-sm font-medium text-stone-400">
                      Drop tasks here
                    </div>
                  )}

                  {tasks
                    .filter((task) => task.columnId === column.id)
                    .map((task) => (
                    <article
                      key={task.id}
                      draggable
                      onDragStart={(event) => handleDragStart(event, task.id)}
                      className="cursor-grab rounded-2xl border border-white bg-white p-4 shadow-[0_14px_35px_rgba(120,113,108,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(120,113,108,0.16)] active:cursor-grabbing"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          Task
                        </span>
                        <span className="text-xs font-medium text-stone-400">Drag me</span>
                      </div>
                      <h3 className="text-base font-bold text-stone-950">{task.title}</h3>
                      {task.details && <p className="mt-2 text-sm leading-6 text-stone-500">{task.details}</p>}
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
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

function SettingsPage() {
  const { user, updateProfile } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [address, setAddress] = useState(user?.address ?? '')
  const [about, setAbout] = useState(user?.about ?? '')
  const [savedMessage, setSavedMessage] = useState('')
  const [errors, setErrors] = useState<SettingsErrors>({})

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()
    const trimmedAddress = address.trim()
    const trimmedAbout = about.trim()
    const nextErrors: SettingsErrors = {}

    if (!trimmedName) {
      nextErrors.name = 'Full name is required.'
    } else if (trimmedName.length < 2) {
      nextErrors.name = 'Full name must be at least 2 characters.'
    }

    if (!trimmedEmail) {
      nextErrors.email = 'Email ID is required.'
    } else if (!isValidEmail(trimmedEmail)) {
      nextErrors.email = 'Enter a valid email ID.'
    }

    if (trimmedPhone && !isValidPhone(trimmedPhone)) {
      nextErrors.phone = 'Enter a valid contact number.'
    }

    if (trimmedAddress.length > 120) {
      nextErrors.address = 'Address must be 120 characters or less.'
    }

    if (trimmedAbout.length > 300) {
      nextErrors.about = 'About must be 300 characters or less.'
    }

    setErrors(nextErrors)
    setSavedMessage('')

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    updateProfile({
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      address: trimmedAddress,
      about: trimmedAbout,
    })
    setSavedMessage('Profile updated successfully.')
  }

  if (!user) {
    return (
      <AccountPage
        title="Settings"
        description="Log in to edit your profile information."
      />
    )
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)]">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-blue-100 bg-white p-6 shadow-[0_20px_60px_rgba(37,99,235,0.10)] sm:p-8"
        >
          <div className="flex flex-col gap-3 border-b border-blue-50 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Settings</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Edit Profile</h1>
              <p className="mt-2 text-sm text-slate-600">Update the personal information shown on your profile.</p>
            </div>
            <Link to="/profile" className="text-sm font-semibold text-blue-600 hover:text-blue-800">
              View Profile
            </Link>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Full name</span>
              <input
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  setErrors((currentErrors) => ({ ...currentErrors, name: undefined }))
                  setSavedMessage('')
                }}
                aria-invalid={Boolean(errors.name)}
                className={`mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${errors.name ? 'border-rose-300' : 'border-slate-200'}`}
              />
              {errors.name && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.name}</p>}
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Email ID</span>
              <input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setErrors((currentErrors) => ({ ...currentErrors, email: undefined }))
                  setSavedMessage('')
                }}
                aria-invalid={Boolean(errors.email)}
                className={`mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${errors.email ? 'border-rose-300' : 'border-slate-200'}`}
              />
              {errors.email && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.email}</p>}
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Contact number</span>
              <input
                type="tel"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value)
                  setErrors((currentErrors) => ({ ...currentErrors, phone: undefined }))
                  setSavedMessage('')
                }}
                placeholder="+91 98765 43210"
                aria-invalid={Boolean(errors.phone)}
                className={`mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${errors.phone ? 'border-rose-300' : 'border-slate-200'}`}
              />
              {errors.phone && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.phone}</p>}
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Address</span>
              <input
                type="text"
                value={address}
                onChange={(event) => {
                  setAddress(event.target.value)
                  setErrors((currentErrors) => ({ ...currentErrors, address: undefined }))
                  setSavedMessage('')
                }}
                placeholder="City, state, country"
                aria-invalid={Boolean(errors.address)}
                className={`mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${errors.address ? 'border-rose-300' : 'border-slate-200'}`}
              />
              {errors.address && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.address}</p>}
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-semibold text-slate-700">About</span>
              <textarea
                value={about}
                onChange={(event) => {
                  setAbout(event.target.value)
                  setErrors((currentErrors) => ({ ...currentErrors, about: undefined }))
                  setSavedMessage('')
                }}
                rows={5}
                placeholder="Write a short introduction about yourself"
                aria-invalid={Boolean(errors.about)}
                className={`mt-2 w-full resize-none rounded-xl border bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${errors.about ? 'border-rose-300' : 'border-slate-200'}`}
              />
              <div className="mt-1.5 flex items-center justify-between gap-3">
                {errors.about ? (
                  <p className="text-xs font-medium text-rose-600">{errors.about}</p>
                ) : (
                  <span />
                )}
                <p className="text-xs text-slate-400">{about.length}/300</p>
              </div>
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
            >
              Save Changes
            </button>
            {savedMessage && <p className="text-sm font-medium text-emerald-600">{savedMessage}</p>}
          </div>
        </form>
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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/meetings" element={<AccountPage title="Meetings" description="Host a new meeting or join an existing IntellMeet session from here." />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/recordings" element={<AccountPage title="Recordings" description="Access meeting recordings, notes, and summaries shared by the admin." />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
