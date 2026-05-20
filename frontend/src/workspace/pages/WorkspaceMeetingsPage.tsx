import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/auth'
import { useAuthStore } from '../../stores/authStore'
import MeetingDetailsDrawer from '../components/MeetingDetailsDrawer'
import WorkspaceFrame from '../components/WorkspaceFrame'
import { createMeeting, readMeetings, writeMeetings, type MeetingFormValues } from '../shared'
export default function WorkspaceMeetingsPage() {
  const { user } = useAuth()
  const isLoading = useAuthStore((state) => state.isLoading)
  const [meetings, setMeetings] = useState(() => readMeetings())
  const navigate = useNavigate()
  const [isMeetingDrawerOpen, setIsMeetingDrawerOpen] = useState(false)
  const [drawerDefaultType, setDrawerDefaultType] = useState('Instant')

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



