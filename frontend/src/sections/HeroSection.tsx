import heroImage from '../assets/hero.png'

const heroStats = [
  { label: 'Follow-up time reduced', value: '40-60%' },
  { label: 'Productivity uplift', value: '25-40%' },
  { label: 'Concurrent participants', value: '5,000' },
]

export function HeroSection() {
  return (
    <section className="px-4 pb-20 pt-12 sm:px-6 lg:px-8 lg:pb-24 lg:pt-16">
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="max-w-2xl">
          <span className="inline-flex rounded-full border border-blue-200 bg-white px-4 py-1 text-sm font-semibold text-blue-700 shadow-sm">
            AI-powered collaboration for enterprise teams
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            SMART MEETINGS.
            <br />
            BETTER CONNECTIONS.
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            IntellMeet combines secure video meetings, real-time collaboration, AI summaries, smart action
            items, chat, and analytics so remote and hybrid teams can move faster with less meeting fatigue.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {heroStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-lg shadow-blue-100/40 backdrop-blur">
                <p className="text-2xl font-bold text-slate-950">{stat.value}</p>
                <p className="mt-1 text-sm text-slate-600">{stat.label}</p>
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
