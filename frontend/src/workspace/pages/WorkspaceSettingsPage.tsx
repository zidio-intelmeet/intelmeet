import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/auth'
import { useAuthStore } from '../../stores/authStore'
import WorkspaceFrame from '../components/WorkspaceFrame'
import {
  readWorkspacePreferences,
  syncCompactModeClass,
  writeWorkspacePreferences,
} from '../shared'

type SettingsOptionId =
  | 'notifications'
  | 'meeting-defaults'
  | 'workspace-view'
  | 'task-updates'
  | 'audio-video'
  | 'privacy-access'

export default function WorkspaceSettingsPage() {
  const { user } = useAuth()
  const isLoading = useAuthStore((state) => state.isLoading)
  const initialPreferences = readWorkspacePreferences()
  const [emailNotifications, setEmailNotifications] = useState(initialPreferences.emailNotifications)
  const [meetingReminders, setMeetingReminders] = useState(initialPreferences.meetingReminders)
  const [compactMode, setCompactMode] = useState(initialPreferences.compactMode)
  const [defaultMeetingDuration, setDefaultMeetingDuration] = useState(initialPreferences.defaultMeetingDuration)
  const [taskCompletionAlerts, setTaskCompletionAlerts] = useState(initialPreferences.taskCompletionAlerts)
  const [autoJoinMic, setAutoJoinMic] = useState(initialPreferences.autoJoinMic)
  const [autoJoinCamera, setAutoJoinCamera] = useState(initialPreferences.autoJoinCamera)
  const [blurProfileDetails, setBlurProfileDetails] = useState(initialPreferences.blurProfileDetails)
  const [rememberWorkspaceDrafts] = useState(initialPreferences.rememberWorkspaceDrafts)
  const [isDurationMenuOpen, setIsDurationMenuOpen] = useState(false)
  const [activeSettingsOption, setActiveSettingsOption] = useState<SettingsOptionId | null>(null)

  useEffect(() => {
    writeWorkspacePreferences({
      emailNotifications,
      meetingReminders,
      compactMode,
      defaultMeetingDuration,
      taskCompletionAlerts,
      autoJoinMic,
      autoJoinCamera,
      blurProfileDetails,
      rememberWorkspaceDrafts,
    })
    syncCompactModeClass(compactMode)
    window.dispatchEvent(new Event('intellmeet:preferences-updated'))
  }, [
    autoJoinCamera,
    autoJoinMic,
    blurProfileDetails,
    compactMode,
    defaultMeetingDuration,
    emailNotifications,
    meetingReminders,
    rememberWorkspaceDrafts,
    taskCompletionAlerts,
  ])

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

  function toggleSettingsOption(option: SettingsOptionId) {
    setIsDurationMenuOpen(false)
    setActiveSettingsOption((current) => (current === option ? null : option))
  }

  const settingsOptions: { id: SettingsOptionId; title: string; detail: string }[] = [
    { id: 'notifications', title: 'Notifications', detail: 'Control email alerts and reminders.' },
    { id: 'meeting-defaults', title: 'Meeting defaults', detail: 'Choose how new meetings begin.' },
    { id: 'workspace-view', title: 'Workspace view', detail: 'Tune how dense the interface feels.' },
    { id: 'task-updates', title: 'Task updates', detail: 'Decide how task completion notices appear.' },
    { id: 'audio-video', title: 'Audio & video', detail: 'Set your join-ready meeting behavior.' },
    { id: 'privacy-access', title: 'Privacy & access', detail: 'Adjust how personal identity is shown.' },
  ]

  function renderExpandedContent() {
    switch (activeSettingsOption) {
      case 'notifications':
        return (
          <section className="space-y-4">
            {[
              { label: 'Email notifications', detail: 'Receive important workspace updates.', value: emailNotifications, onChange: setEmailNotifications },
              { label: 'Meeting reminders', detail: 'Get nudged before scheduled meetings.', value: meetingReminders, onChange: setMeetingReminders },
            ].map((setting) => (
              <label key={setting.label} className="flex items-center justify-between gap-4 rounded-xl border border-emerald-50 bg-emerald-50/40 px-4 py-3">
                <span>
                  <span className="block text-sm font-semibold text-slate-800">{setting.label}</span>
                  <span className="block text-xs text-slate-500">{setting.detail}</span>
                </span>
                <input
                  type="checkbox"
                  checked={setting.value}
                  onChange={(event) => setting.onChange(event.target.checked)}
                  className="h-5 w-5 rounded border-emerald-200 text-emerald-600 focus:ring-emerald-500"
                />
              </label>
            ))}
          </section>
        )
      case 'meeting-defaults':
        return (
          <section className="space-y-4">
            <div className="relative block">
              <span className="text-sm font-semibold text-slate-700">Default duration</span>
              <button
                type="button"
                onClick={() => setIsDurationMenuOpen((isOpen) => !isOpen)}
                className="mt-2 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition hover:border-emerald-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              >
                <span>{defaultMeetingDuration}</span>
                <span className="text-slate-400">v</span>
              </button>
              {isDurationMenuOpen && (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-2xl border border-emerald-100 bg-white p-3 shadow-xl shadow-emerald-950/10">
                  <div className="flex items-center justify-between border-b border-emerald-50 pb-2">
                    <h3 className="text-sm font-bold text-slate-900">Default duration</h3>
                    <button
                      type="button"
                      onClick={() => setIsDurationMenuOpen(false)}
                      className="rounded-lg px-2 py-1 text-sm font-bold text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
                      aria-label="Close duration menu"
                    >
                      x
                    </button>
                  </div>
                  <div className="mt-2 space-y-0.5">
                    {['15 minutes', '30 minutes', '45 minutes', '60 minutes'].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setDefaultMeetingDuration(option)
                          setIsDurationMenuOpen(false)
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-emerald-50"
                      >
                        <span>{option}</span>
                        <span className={['flex h-5 w-5 items-center justify-center rounded-full border', defaultMeetingDuration === option ? 'border-emerald-600' : 'border-slate-300'].join(' ')}>
                          {defaultMeetingDuration === option && <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )
      case 'workspace-view':
        return (
          <section className="space-y-4">
            <label className="flex items-center justify-between gap-4 rounded-xl border border-emerald-50 bg-emerald-50/40 px-4 py-3">
              <span>
                <span className="block text-sm font-semibold text-slate-800">Compact mode</span>
                <span className="block text-xs text-slate-500">Use tighter spacing across the full workspace, including dashboard, meetings, teams, schedule, and settings.</span>
              </span>
              <input
                type="checkbox"
                checked={compactMode}
                onChange={(event) => setCompactMode(event.target.checked)}
                className="h-5 w-5 rounded border-emerald-200 text-emerald-600 focus:ring-emerald-500"
              />
            </label>
          </section>
        )
      case 'task-updates':
        return (
          <section className="space-y-4">
            <label className="flex items-center justify-between gap-4 rounded-xl border border-emerald-50 bg-emerald-50/40 px-4 py-3">
              <span>
                <span className="block text-sm font-semibold text-slate-800">Task completion alerts</span>
                <span className="block text-xs text-slate-500">Show workspace notices when tasks move to done.</span>
              </span>
              <input
                type="checkbox"
                checked={taskCompletionAlerts}
                onChange={(event) => setTaskCompletionAlerts(event.target.checked)}
                className="h-5 w-5 rounded border-emerald-200 text-emerald-600 focus:ring-emerald-500"
              />
            </label>
          </section>
        )
      case 'audio-video':
        return (
          <section className="space-y-4">
            {[
              {
                label: 'Join with microphone on',
                detail: 'Default your future meeting entry to an active mic.',
                value: autoJoinMic,
                onChange: setAutoJoinMic,
              },
              {
                label: 'Join with camera on',
                detail: 'Default your future meeting entry to an active camera.',
                value: autoJoinCamera,
                onChange: setAutoJoinCamera,
              },
            ].map((setting) => (
              <label key={setting.label} className="flex items-center justify-between gap-4 rounded-xl border border-emerald-50 bg-emerald-50/40 px-4 py-3">
                <span>
                  <span className="block text-sm font-semibold text-slate-800">{setting.label}</span>
                  <span className="block text-xs text-slate-500">{setting.detail}</span>
                </span>
                <input
                  type="checkbox"
                  checked={setting.value}
                  onChange={(event) => setting.onChange(event.target.checked)}
                  className="h-5 w-5 rounded border-emerald-200 text-emerald-600 focus:ring-emerald-500"
                />
              </label>
            ))}
          </section>
        )
      case 'privacy-access':
        return (
          <section className="space-y-4">
            <label className="flex items-center justify-between gap-4 rounded-xl border border-emerald-50 bg-emerald-50/40 px-4 py-3">
              <span>
                <span className="block text-sm font-semibold text-slate-800">Blur personal details on cards</span>
                <span className="block text-xs text-slate-500">Keep your sidebar identity card visually quieter on shared screens.</span>
              </span>
              <input
                type="checkbox"
                checked={blurProfileDetails}
                onChange={(event) => setBlurProfileDetails(event.target.checked)}
                className="h-5 w-5 rounded border-emerald-200 text-emerald-600 focus:ring-emerald-500"
              />
            </label>
          </section>
        )
      default:
        return null
    }
  }

  return (
    <WorkspaceFrame>
      <>
        <header className="border-b border-emerald-100 bg-white px-5 py-5 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Settings</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Workspace Settings</h1>
        </header>

        <section className="px-5 py-6 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-4xl space-y-3">
            {settingsOptions.map((item) => (
              <section key={item.id} className="rounded-2xl border border-emerald-100 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => toggleSettingsOption(item.id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-emerald-50/50"
                >
                  <span className="min-w-0">
                    <span className="block text-base font-bold text-slate-950">{item.title}</span>
                    <span className="mt-1 block text-sm text-slate-500">{item.detail}</span>
                  </span>
                  <svg
                    className={`h-5 w-5 shrink-0 text-slate-400 transition ${activeSettingsOption === item.id ? 'rotate-180 text-emerald-700' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {activeSettingsOption === item.id && (
                  <div className="border-t border-emerald-100 px-5 py-5">
                    {renderExpandedContent()}
                  </div>
                )}
              </section>
            ))}
          </div>
        </section>
      </>
    </WorkspaceFrame>
  )
}
