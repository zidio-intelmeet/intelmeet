export function CtaSection() {
  return (
    <section className="px-4 pb-24 pt-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 rounded-[2.5rem] bg-blue-600 px-6 py-10 text-white shadow-[0_24px_70px_rgba(37,99,235,0.28)] sm:px-8 lg:flex-row lg:items-center lg:px-12">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">Built for modern enterprise teams</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Make every meeting searchable, actionable, and worth the time.
          </h2>
          <p className="mt-4 text-base leading-7 text-blue-50">
            Launch IntellMeet for your teams and replace scattered meeting tools with one intelligent collaboration platform.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button className="rounded-full bg-white px-6 py-3 text-base font-semibold text-blue-700 transition hover:bg-blue-50">
            Create Workspace
          </button>
          <button className="rounded-full border border-white/40 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10">
            Talk to Sales
          </button>
        </div>
      </div>
    </section>
  )
}
