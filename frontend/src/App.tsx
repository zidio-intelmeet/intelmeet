import { Navbar } from './components/layout/Navbar'
import { CtaSection } from './sections/CtaSection'
import { FeaturesSection } from './sections/FeaturesSection'
import { HeroSection } from './sections/HeroSection'
import { MetricsSection } from './sections/MetricsSection'
import { WorkflowSection } from './sections/WorkflowSection'

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-900">
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
    </div>
  )
}

export default App
