import { useState, type FormEvent } from 'react'
import { readWorkspacePreferences, type MeetingFormValues } from '../shared'
export default function MeetingDetailsDrawer({
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
  const [duration, setDuration] = useState(() => readWorkspacePreferences().defaultMeetingDuration)
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
              className="mt-2 w-full rounded-xl border border-emerald-100 px-3 py-2 text-xs outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Type</span>
              <select
                value={meetingType}
                onChange={(event) => setMeetingType(event.target.value)}
                className="mt-2 w-full rounded-xl border border-emerald-100 px-3 py-2 text-xs outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
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
                className="mt-2 w-full rounded-xl border border-emerald-100 px-3 py-2 text-xs outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
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
              className="mt-2 w-full rounded-xl border border-emerald-100 px-3 py-2 text-xs outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Participants</span>
            <input
              value={participants}
              onChange={(event) => setParticipants(event.target.value)}
              placeholder="teammate@company.com, client@company.com"
              className="mt-2 w-full rounded-xl border border-emerald-100 px-3 py-2 text-xs outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Agenda</span>
            <textarea
              value={agenda}
              onChange={(event) => setAgenda(event.target.value)}
              rows={4}
              placeholder="Add topics, goals, or preparation notes"
              className="mt-2 w-full resize-none rounded-xl border border-emerald-100 px-3 py-2 text-xs outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
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


