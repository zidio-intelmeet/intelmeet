import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import logo from '../../assets/logowobg.png'
import { useAuth } from '../../context/auth'

const accountLinks = [
  { label: 'Profile', to: '/profile' },
  { label: 'Meetings', to: '/meetings', description: 'Host or join meeting' },
  { label: 'Schedule', to: '/schedule', description: 'Tasks and scheduled meetings' },
  { label: 'Settings', to: '/settings', description: 'Edit personal information' },
]

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
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const isLogin = location.pathname === '/login'
  const isSignup = location.pathname === '/signup'
  const initials = user ? getInitials(user.name, user.email) : ''

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsAccountOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleLogout() {
    logout()
    setIsAccountOpen(false)
    navigate('/')
  }

  return (
    <header className="px-4 pt-6 sm:px-6 lg:px-8">
      <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-blue-100/80 bg-white px-5 py-3 shadow-[0_20px_60px_rgba(37,99,235,0.12)] md:px-7">
        <Link to="/" className="flex items-center gap-3">
          <img
            src={logo}
            alt="IntellMeet logo"
            className="h-12 w-12 scale-150 object-contain sm:h-14 sm:w-14"
          />
          <div>
            <p className="text-lg font-semibold tracking-tight text-slate-900">IntellMeet</p>
            <p className="hidden text-xs text-slate-500 sm:block">Intelligent meetings for modern teams</p>
          </div>
        </Link>
        {user ? (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsAccountOpen((isOpen) => !isOpen)}
              className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-blue-100 bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
              aria-label="Open account menu"
              aria-expanded={isAccountOpen}
            >
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </button>

            {isAccountOpen && (
              <div className="absolute right-0 top-14 z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15">
                <div className="border-b border-slate-100 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-sm font-bold text-white">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                </div>

                <div className="py-2">
                  {accountLinks.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setIsAccountOpen(false)}
                      className="block px-5 py-3 text-sm text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                    >
                      <span className="block font-semibold">{item.label}</span>
                      {item.description && <span className="block text-xs text-slate-500">{item.description}</span>}
                    </Link>
                  ))}
                </div>

                <div className="border-t border-slate-100 p-2">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
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
