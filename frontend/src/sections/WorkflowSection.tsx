import { SectionHeading } from '../components/ui/SectionHeading'

const workflowSteps = [
  {
    step: '01',
    title: 'Meet live with full team context',
    description: 'Start secure video meetings with messaging, agendas, and collaboration tools already connected.',
  },
  {
    step: '02',
    title: 'Let AI capture the important moments',
    description: 'IntellMeet listens in real time to generate transcripts, summaries, and action items as the meeting happens.',
  },
  {
    step: '03',
    title: 'Track execution after the call ends',
    description: 'Tasks, owners, and analytics stay visible so meetings lead to progress rather than forgotten notes.',
  },
]

export function WorkflowSection() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-[2.5rem] border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_45%,#f8fbff_100%)] px-6 py-12 shadow-[0_18px_60px_rgba(37,99,235,0.08)] sm:px-8 lg:px-12">
        <SectionHeading
          badge="How it works"
          title="A meeting workflow built for clarity, accountability, and speed"
          description="From the first discussion to the final deliverable, every stage is designed to keep distributed teams aligned."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {workflowSteps.map((step) => (
            <article key={step.step} className="rounded-[2rem] border border-white bg-white p-6 shadow-sm">
              <span className="text-sm font-bold tracking-[0.3em] text-blue-600">{step.step}</span>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">{step.title}</h3>
              <p className="mt-4 text-base leading-7 text-slate-600">{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
