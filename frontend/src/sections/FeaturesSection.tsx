import { SectionHeading } from '../components/ui/SectionHeading'

const features = [
  {
    title: 'Smart meeting intelligence',
    description: 'Capture transcripts, speaker insights, concise summaries, and next steps automatically after every session.',
  },
  {
    title: 'Seamless video collaboration',
    description: 'Run stable meetings with shared context, real-time chat, and collaborative workflows in one unified experience.',
  },
  {
    title: 'Actionable task management',
    description: 'Convert discussion points into assigned tasks, deadlines, and project visibility without leaving the meeting.',
  },
  {
    title: 'Analytics for productivity',
    description: 'Track engagement, follow-through, and operational trends to improve how teams communicate and execute.',
  },
]

export function FeaturesSection() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          badge="Core capabilities"
          title="Everything enterprises need to make meetings useful again"
          description="IntellMeet is designed to reduce wasted time, turn conversations into execution, and support the demands of large distributed organizations."
        />

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className="group rounded-4xl border border-blue-100 bg-white p-7 shadow-[0_16px_50px_rgba(37,99,235,0.08)] transition hover:-translate-y-1 hover:shadow-[0_22px_70px_rgba(37,99,235,0.14)]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white">
                0{index + 1}
              </div>
              <h3 className="mt-6 text-2xl font-semibold tracking-tight text-slate-950">{feature.title}</h3>
              <p className="mt-4 text-base leading-7 text-slate-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
