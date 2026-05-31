import { Link } from 'react-router-dom'

export default function TermsPage() {
  const transitionPath = (destination: string) => `/transition?to=${encodeURIComponent(destination)}`

  return (
    <div className="flex flex-col min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_30%),linear-gradient(180deg,#f8fbff_0%,#eef6ff_55%,#ffffff_100%)]">
      {/* Decorative blobs */}
      <div className="fixed top-32 left-12 w-72 h-72 bg-indigo-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-10 right-8 w-80 h-80 bg-violet-200/30 rounded-full blur-3xl pointer-events-none" />

      {/* Main Content Container */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 relative z-10">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-card-lg border border-white/80 p-6 sm:p-10 md:p-12">
          
          {/* Header Actions */}
          <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-6">
            <Link
              to={transitionPath('/signup')}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Sign Up
            </Link>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Last Updated: June 1, 2026
            </span>
          </div>

          {/* Title Section */}
          <div className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Terms of Service
            </h1>
            <p className="mt-3 text-slate-500 leading-relaxed text-base">
              Please read these Terms of Service carefully before using IntellMeet. By accessing or using our platform, you agree to be bound by these terms.
            </p>
          </div>

          {/* Terms Content */}
          <div className="space-y-8 text-slate-600 leading-relaxed text-sm sm:text-base">
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-800">1. Acceptance of Terms</h2>
              <p>
                By creating an account, accessing, or using IntellMeet (the "Service"), you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, you may not access or use the Service. These terms apply to all visitors, users, and others who access or use the Service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-800">2. Description of Service</h2>
              <p>
                IntellMeet is an AI-powered smart meeting and collaboration platform that facilitates video meetings, transcribes audio, aggregates summaries, and provides real-time collaboration tools. We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time without notice.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-800">3. User Accounts</h2>
              <p>
                To access certain features of the Service, you must register for an account. You agree to provide accurate, current, and complete information during registration and to update such information. You are solely responsible for safeguarding your password and for all activities that occur under your account.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-800">4. User Conduct & Acceptable Use</h2>
              <p>
                You agree not to use the Service for any unlawful purpose or in any way that violates these Terms. Prohibited conduct includes, but is not limited to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Harassing, abusing, or harming other users.</li>
                <li>Uploading or transmitting viruses, malware, or other malicious code.</li>
                <li>Attempting to bypass security protocols, rate limiters, or access restrictions.</li>
                <li>Using automated systems (bots, spiders, etc.) to scrape data or spam the Service.</li>
                <li>Recording audio or video of meetings without the explicit consent of all participants.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-800">5. Intellectual Property</h2>
              <p>
                The Service, including its original content, features, functionality, source code, and design, are and will remain the exclusive property of IntellMeet and its licensors. Our trademarks and brand assets may not be used in connection with any product or service without our prior written consent.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-800">6. Limitation of Liability</h2>
              <p>
                In no event shall IntellMeet, its directors, employees, partners, agents, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, arising out of your access to or use of the Service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-800">7. Governing Law & Dispute Resolution</h2>
              <p>
                These Terms shall be governed and construed in accordance with the laws of the jurisdiction in which the company is registered, without regard to its conflict of law provisions. Any dispute arising under these Terms shall be resolved exclusively through binding arbitration.
              </p>
            </section>

            <section className="space-y-3 pb-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">8. Changes to Terms</h2>
              <p>
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
              </p>
            </section>

            {/* Footer contact */}
            <div className="pt-6 text-center text-slate-400 text-xs sm:text-sm">
              If you have any questions about our Terms of Service, please contact us at{' '}
              <a href="mailto:support@intellmeet.com" className="text-indigo-600 hover:underline font-semibold">
                support@intellmeet.com
              </a>.
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
