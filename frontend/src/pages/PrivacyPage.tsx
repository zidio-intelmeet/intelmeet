import { Link } from 'react-router-dom'

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <p className="mt-3 text-slate-500 leading-relaxed text-base">
              At IntellMeet, your privacy is our top priority. This Privacy Policy details how we collect, use, disclose, and protect your information when you use our platform.
            </p>
          </div>

          {/* Privacy Content */}
          <div className="space-y-8 text-slate-600 leading-relaxed text-sm sm:text-base">
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-800">1. Information We Collect</h2>
              <p>
                We collect information to provide, maintain, and improve our services. This includes:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account Information:</strong> Name, email address, password, profile picture, and contact details.</li>
                <li><strong>Meeting Content & Data:</strong> Audio recordings, auto-generated transcripts, chat messages, shared documents, and meeting metadata (duration, participants).</li>
                <li><strong>Technical Information:</strong> IP address, device details, operating system, browser type, and platform usage metrics.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-800">2. How We Use Your Information</h2>
              <p>
                We use the collected information for various business purposes, such as:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Providing core meeting functionality, video/audio routing, and connection management.</li>
                <li>Generating AI summaries, transcripts, and action items using machine learning models.</li>
                <li>Personalizing and improving the user experience, layout settings, and performance features.</li>
                <li>Communicating with you regarding updates, security alerts, and platform announcements.</li>
                <li>Ensuring security and compliance with legal obligations.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-800">3. Data Sharing and Disclosure</h2>
              <p>
                We do not sell your personal data. We may share information under the following limited circumstances:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>With your consent:</strong> When you direct us to share information (e.g., inviting external participants).</li>
                <li><strong>With Service Providers:</strong> Trusted third-party vendors who assist in hosting, streaming infrastructure, or AI processing (subject to confidentiality contracts).</li>
                <li><strong>For legal reasons:</strong> To comply with applicable laws, regulations, subpoena, or government requests.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-800">4. Data Security & Storage</h2>
              <p>
                We implement robust security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. We utilize end-to-end encryption for video/audio streams where supported, and standard data encryption at rest. While we strive to protect your data, no method of transmission or electronic storage is 100% secure.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-800">5. Your Choices & Privacy Rights</h2>
              <p>
                Depending on your location, you may have certain rights regarding your personal information, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>The right to access the personal data we hold about you.</li>
                <li>The right to request correction or deletion of your data.</li>
                <li>The right to object to or restrict processing of certain information.</li>
                <li>The right to export your data or delete your account.</li>
              </ul>
              <p>To exercise these rights, please contact our support team.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-800">6. Third-Party Integrations</h2>
              <p>
                Our Service may contain links or connections to third-party services (such as Google Sign-in, Calendar services, or project management tools). We are not responsible for the privacy practices or contents of those third-party services.
              </p>
            </section>

            <section className="space-y-3 pb-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">7. Changes to this Policy</h2>
              <p>
                We may update our Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
              </p>
            </section>

            {/* Footer contact */}
            <div className="pt-6 text-center text-slate-400 text-xs sm:text-sm">
              If you have questions or concerns about this Privacy Policy, please contact us at{' '}
              <a href="mailto:privacy@intellmeet.com" className="text-indigo-600 hover:underline font-semibold">
                privacy@intellmeet.com
              </a>.
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
