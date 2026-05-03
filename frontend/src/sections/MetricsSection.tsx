const metrics = [
  {
    value: '99.95%',
    label: 'target uptime SLA',
    description: 'Dependable meeting infrastructure for client calls, internal syncs, and company-wide town halls.',
  },
  {
    value: '500-5,000',
    label: 'concurrent attendees',
    description: 'Scale from small cross-functional teams to large enterprise events without sacrificing experience.',
  },
  {
    value: '0',
    label: 'downtime deployments',
    description: 'Release new intelligence features while live sessions continue uninterrupted.',
  },
]

export function MetricsSection() {
  return (
    <section className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-5 rounded-4xl border border-blue-100 bg-slate-950 px-6 py-8 text-white shadow-[0_25px_80px_rgba(15,23,42,0.28)] lg:grid-cols-3 lg:px-10">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-4xl font-bold text-white">{metric.value}</p>
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">{metric.label}</p>
            <p className="mt-4 text-sm leading-7 text-slate-300">{metric.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
