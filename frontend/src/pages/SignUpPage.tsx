import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth'
import { apiService } from '../services/api';
type SignUpErrors = {
  firstName?: string
  lastName?: string
  email?: string
  password?: string
  confirmPassword?: string
  role?: string
  terms?: string
  form?: string
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isStrongPassword(password: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)
}

export default function SignUpPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<'Admin' | 'Member'>('Member')
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [errors, setErrors] = useState<SignUpErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const transitionPath = (destination: string) => `/transition?to=${encodeURIComponent(destination)}`

  const handleGoogleLogin = () => {
  // 🚀 This actually redirects the user to your backend Google Auth route!
  apiService.googleLogin();
};

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrors({})
    const trimmedFirstName = firstName.trim()
    const trimmedLastName = lastName.trim()
    const trimmedEmail = email.trim()
    const nextErrors: SignUpErrors = {}

    if (!trimmedFirstName) {
      nextErrors.firstName = 'First name is required.'
    } else if (trimmedFirstName.length < 2) {
      nextErrors.firstName = 'First name must be at least 2 characters.'
    }

    if (trimmedLastName && trimmedLastName.length < 2) {
      nextErrors.lastName = 'Last name must be at least 2 characters.'
    }

    if (!trimmedEmail) {
      nextErrors.email = 'Work email is required.'
    } else if (!isValidEmail(trimmedEmail)) {
      nextErrors.email = 'Enter a valid work email.'
    }

    if (!password) {
      nextErrors.password = 'Password is required.'
    } else if (!isStrongPassword(password)) {
      nextErrors.password = 'Use 8+ characters with uppercase, lowercase, and a number.'
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Confirm your password.'
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Passwords do not match.'
    }

    if (!acceptedTerms) {
      nextErrors.terms = 'Please accept the terms and privacy policy.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setIsSubmitting(false)
      return
    }

    // Call real backend registration
    const fullName = `${trimmedFirstName} ${trimmedLastName}`.trim()
    register(fullName, trimmedEmail, password, role)
      .then(() => {
        setPassword('')
        setConfirmPassword('')
        navigate(transitionPath('/login'))
      })
      .catch((error) => {
        setErrors({ form: error instanceof Error ? error.message : 'Registration failed. Please try again.' })
      })
      .finally(() => {
        setIsSubmitting(false)
      })
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-96px)] px-4 py-8 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="fixed top-32 left-12 w-56 h-56 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-10 right-8 w-64 h-64 bg-violet-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-2/3 right-1/3 w-36 h-36 bg-blue-100/40 rounded-full blur-2xl pointer-events-none" />

      <div className="w-full max-w-md animate-fade-up relative z-10">
        <div className="bg-white/85 backdrop-blur-xl rounded-3xl shadow-card-lg p-8 border border-white/70">

          {/* Back Button */}
          <Link
            to={transitionPath('/')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors mb-6"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>

          {/* Card Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Create account</h1>
            <p className="text-slate-500 mt-1.5 text-sm">Join thousands of teams on IntellMeet</p>
          </div>

          <form  className="space-y-4" noValidate onSubmit={handleSubmit}>

            {/* Role */}
            <div className="relative">
              <label htmlFor="signup-role" className="block text-sm font-semibold text-slate-700 mb-1.5">Account type</label>
              <button
                id="signup-role"
                type="button"
                onClick={() => setIsRoleMenuOpen((isOpen) => !isOpen)}
                className="flex w-full items-center justify-between rounded-xl border bg-white/70 px-3.5 py-3 text-sm font-medium text-slate-900 transition-all input-ring"
                disabled={isSubmitting}
              >
                <span>{role}</span>
                <span className="text-slate-400">⌄</span>
              </button>
              {isRoleMenuOpen && (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-2xl border border-indigo-100 bg-white p-3 shadow-xl shadow-indigo-950/10">
                  <div className="flex items-center justify-between border-b border-indigo-50 pb-2">
                    <h3 className="text-sm font-bold text-slate-900">Account type</h3>
                    <button
                      type="button"
                      onClick={() => setIsRoleMenuOpen(false)}
                      className="rounded-lg px-2 py-1 text-sm font-bold text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-700"
                      aria-label="Close account type menu"
                    >
                      ×
                    </button>
                  </div>
                  <div className="mt-2 space-y-0.5">
                    {(['Member', 'Admin'] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setRole(option)
                          setIsRoleMenuOpen(false)
                          setErrors((currentErrors) => ({ ...currentErrors, role: undefined }))
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-indigo-50"
                      >
                        <span>{option}</span>
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${role === option ? 'border-indigo-600' : 'border-slate-300'}`}>
                          {role === option && <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <p className="mt-1.5 text-xs text-slate-500">Choose once during signup. Login will remember it later.</p>
              {errors.role && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.role}</p>}
            </div>

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="signup-first" className="block text-sm font-semibold text-slate-700 mb-1.5">First name</label>
                <input
                  id="signup-first"
                  type="text"
                  value={firstName}
                  onChange={(event) => {
                    setFirstName(event.target.value)
                    setErrors((currentErrors) => ({ ...currentErrors, firstName: undefined }))
                  }}
                  placeholder="Jane"
                  aria-invalid={Boolean(errors.firstName)}
                  className={`w-full px-3.5 py-3 rounded-xl border bg-white/70 text-slate-900 text-sm placeholder-slate-400 transition-all input-ring ${errors.firstName ? 'border-rose-300' : ''}`}
                />
                {errors.firstName && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.firstName}</p>}
              </div>
              <div>
                <label htmlFor="signup-last" className="block text-sm font-semibold text-slate-700 mb-1.5">Last name</label>
                <input
                  id="signup-last"
                  type="text"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Doe"
                  className="w-full px-3.5 py-3 rounded-xl border bg-white/70 text-slate-900 text-sm placeholder-slate-400 transition-all input-ring"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="signup-email" className="block text-sm font-semibold text-slate-700 mb-1.5">Work email</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </span>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setErrors((currentErrors) => ({ ...currentErrors, email: undefined }))
                  }}
                  placeholder="you@company.com"
                  aria-invalid={Boolean(errors.email)}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-white/70 text-slate-900 text-sm placeholder-slate-400 transition-all input-ring ${errors.email ? 'border-rose-300' : ''}`}
                />
              </div>
              {errors.email && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="signup-password" className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setErrors((currentErrors) => ({ ...currentErrors, password: undefined }))
                  }}
                  placeholder="Min. 8 characters"
                  aria-invalid={Boolean(errors.password)}
                  className={`w-full pl-10 pr-11 py-3 rounded-xl border bg-white/70 text-slate-900 text-sm placeholder-slate-400 transition-all input-ring ${errors.password ? 'border-rose-300' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((isVisible) => !isVisible)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"} />
                  </svg>
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="signup-confirm" className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value)
                    setErrors((currentErrors) => ({ ...currentErrors, confirmPassword: undefined }))
                  }}
                  placeholder="Re-enter password"
                  aria-invalid={Boolean(errors.confirmPassword)}
                  className={`w-full pl-10 pr-11 py-3 rounded-xl border bg-white/70 text-slate-900 text-sm placeholder-slate-400 transition-all input-ring ${errors.confirmPassword ? 'border-rose-300' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((isVisible) => !isVisible)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={"M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"} />
                  </svg>
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.confirmPassword}</p>}
            </div>

            {/* Terms */}
            <div>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => {
                    setAcceptedTerms(event.target.checked)
                    setErrors((currentErrors) => ({ ...currentErrors, terms: undefined }))
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  disabled={isSubmitting}
                />
                <span className="text-sm text-slate-600 leading-relaxed">
                  I agree to the{' '}
                  <button type="button" className="font-semibold text-indigo-600 hover:underline">Terms of Service</button>
                  {' '}and{' '}
                  <button type="button" className="font-semibold text-indigo-600 hover:underline">Privacy Policy</button>
                </span>
              </label>
              {errors.terms && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.terms}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 active:scale-[0.98] transition-all duration-200 shadow-md hover:shadow-indigo-300/50 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Create My Account'
              )}
            </button>
            {errors.form && <p className="text-center text-sm font-semibold text-rose-600">{errors.form}</p>}

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium">or sign up with</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Google Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 bg-white/70 text-slate-700 text-sm font-medium hover:bg-white hover:shadow-sm transition-all duration-200 disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to={transitionPath('/login')} className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
