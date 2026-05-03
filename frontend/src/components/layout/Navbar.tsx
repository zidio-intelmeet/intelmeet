import { Link, useLocation } from 'react-router-dom'
import logo from '../../assets/logowobg.png'
import wordmark from '../../assets/intellmeet_wordmark.png'
import { useAuth } from '../../context/auth'

function getInitials(name: string, email: string) {
  const source = name.trim() || email.split('@')[0] || 'User'
  const initials = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return initials || 'U'
}

export function Navbar() {
  const location = useLocation()
  const { user } = useAuth()

  const isLogin = location.pathname === '/login'
  const isSignup = location.pathname === '/signup'
  const initials = user ? getInitials(user.name, user.email) : ''

  return (
    <header className="px-4 pt-6 sm:px-6 lg:px-8">
      <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-blue-100/80 bg-white px-5 py-3 shadow-[0_20px_60px_rgba(37,99,235,0.12)] md:px-7">
        <Link to="/" className="flex items-end gap-0">
          <img
            src={logo}
            alt="IntellMeet logo"
            className="h-12 w-12 scale-150 object-contain sm:h-14 sm:w-14"
          />
          <img src={wordmark} alt="IntellMeet" className="mb-px h-11 w-47 object-contain" />
        </Link>
        {user ? (
          <Link
            to="/workspace"
            className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-blue-100 bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
            aria-label="Go to workspace"
            title="Go to workspace"
          >
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </Link>
        ) : (
          <div className="flex items-center gap-3">

          {/* Sign Up button */}
          <Link
            to="/signup"
            className={[
              'rounded-full px-4 py-2 text-sm font-semibold transition',
              isSignup
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700'
                : 'border border-blue-200 text-blue-700 hover:border-blue-300 hover:bg-blue-50' 
            ].join(' ')}
          >
            Sign Up
          </Link>

          {/* Login button */}
          <Link
            to="/login"
            className={[
              'rounded-full px-4 py-2 text-sm font-semibold transition',
              isLogin
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700' 
                : 'border border-blue-200 text-blue-700 hover:border-blue-300 hover:bg-blue-50' 
            ].join(' ')}
          >
            Login
          </Link>

          </div>
        )}
      </nav>
    </header>
  )
}
