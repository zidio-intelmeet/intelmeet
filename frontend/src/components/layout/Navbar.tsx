import { Link, useLocation } from 'react-router-dom'  
import logo from '../../assets/logo.png'

export function Navbar() {
  const location = useLocation()  

  const isLogin = location.pathname === '/login'
  const isSignup = location.pathname === '/signup'

  return (
    <header className="px-4 pt-6 sm:px-6 lg:px-8">
      <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-blue-100/80 bg-white px-5 py-3 shadow-[0_20px_60px_rgba(37,99,235,0.12)] md:px-7">
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="IntellMeet logo"
            className="h-12 w-12 scale-250 object-contain sm:h-14 sm:w-14"
          />
          <div>
            <p className="text-lg font-semibold tracking-tight text-slate-900">IntellMeet</p>
            <p className="hidden text-xs text-slate-500 sm:block">Intelligent meetings for modern teams</p>
          </div>
        </div>
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
      </nav>
    </header>
  )
}