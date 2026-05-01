import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import heroImage from '../assets/hero.png'
import { useAuth } from '../context/auth'

const heroStats = [
  { label: 'Follow-up time reduced', value: '40-60%' },
  { label: 'Productivity uplift', value: '25-40%' },
  { label: 'Concurrent participants', value: '5,000' },
]

export function HeroSection() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [meetingCode, setMeetingCode] = useState('')
  const [meetingError, setMeetingError] = useState('')
  const [meetingMessage, setMeetingMessage] = useState('')
  const [hostMessage, setHostMessage] = useState('')

  function handleJoinMeeting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedCode = meetingCode.trim()

    setHostMessage('')
    setMeetingMessage('')

    if (!trimmedCode) {
      setMeetingError('Enter a meeting code or link to join.')
      return
    }

    setMeetingError('')
    setMeetingMessage(`Ready to join "${trimmedCode}".`)
  }

  function handleHostMeeting() {
    setMeetingMessage('')
    setMeetingError('')

    if (!user) {
      setHostMessage('Login is pending. Please log in before hosting a meeting.')
      return
    }

    navigate('/meetings')
  }

  return (
    <section className="px-4 pb-20 pt-8 sm:px-6 lg:px-8 lg:pb-24 lg:pt-10">
      <div className="mx-auto grid max-w-7xl items-start gap-14 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="max-w-2xl">
          <span className="inline-flex rounded-full border border-blue-200 bg-white px-4 py-1 text-sm font-semibold text-blue-700 shadow-sm">
            AI-powered collaboration for enterprise teams
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            SMART MEETINGS.
            <br />
            BETTER CONNECTIONS.
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            IntellMeet combines secure video meetings, real-time collaboration, AI summaries, smart action
            items, chat, and analytics so remote and hybrid teams can move faster with less meeting fatigue.
          </p>

          <div className="mt-6 rounded-3xl border border-white/80 bg-white/90 p-4 shadow-[0_20px_60px_rgba(37,99,235,0.13)] backdrop-blur">
            <form onSubmit={handleJoinMeeting} className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              <input
                type="text"
                value={meetingCode}
                onChange={(event) => {
                  setMeetingCode(event.target.value)
                  setMeetingError('')
                  setMeetingMessage('')
                  setHostMessage('')
                }}
                placeholder="Enter meeting code or link"
                className={`min-h-12 rounded-full border bg-white px-5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${meetingError ? 'border-rose-300' : 'border-blue-100'}`}
                aria-invalid={Boolean(meetingError)}
              />
              <button
                type="submit"
                className="min-h-12 rounded-full bg-blue-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
              >
                Join Meeting
              </button>
              <button
                type="button"
                onClick={handleHostMeeting}
                className="min-h-12 rounded-full border border-slate-200 bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Host Meeting
              </button>
            </form>

            {(meetingError || meetingMessage || hostMessage) && (
              <p className={`mt-3 text-sm font-medium ${meetingError || hostMessage ? 'text-rose-600' : 'text-emerald-600'}`}>
                {meetingError || meetingMessage || hostMessage}
              </p>
            )}
          </div>

          <div className="mt-17 max-w-md">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Why use IntellMeet?</p>
          </div>

          <div className="mt-3 grid max-w-md gap-4">
            {heroStats.map((stat) => (
              <div key={stat.label} className="flex items-center justify-between gap-4 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-lg shadow-blue-100/40 backdrop-blur">
                <p className="text-2xl font-bold text-slate-950">{stat.value}</p>
                <p className="text-right text-sm text-slate-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-4 top-8 h-28 w-28 rounded-full bg-cyan-300/30 blur-3xl" />
          <div className="absolute -right-6 bottom-8 h-36 w-36 rounded-full bg-blue-400/25 blur-3xl" />

          <div className="relative overflow-hidden rounded-4xl border border-blue-100 bg-white p-4 shadow-[0_30px_90px_rgba(37,99,235,0.18)]">
            <div className="mb-4 flex items-center justify-between rounded-2xl bg-blue-100 px-4 py-3 text-slate-900">
              <div>
                <p className="text-sm font-semibold">Live Strategy Sync</p>
                <p className="text-xs text-slate-600">AI summary, transcript, tasks, and chat in one place</p>
              </div>
              <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                Live
              </span>
            </div>

            <div className="overflow-hidden rounded-3xl bg-[linear-gradient(180deg,#eff6ff_0%,#dbeafe_100%)]">
              <img src={heroImage} alt="IntellMeet collaboration dashboard preview" className="h-full w-full object-cover" />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-blue-50 p-4">
                <p className="text-sm font-semibold text-blue-800">AI Meeting Intelligence</p>
                <p className="mt-2 text-sm text-slate-600">Transcription, summaries, and action items generated instantly.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">Enterprise-ready reliability</p>
                <p className="mt-2 text-sm text-slate-600">Built for zero-downtime releases and business-critical meetings.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
