import logo from '../../assets/logo.png'

export function Navbar() {
  return (
    <header className="px-4 pt-6 sm:px-6 lg:px-8">
      <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-blue-100/80 bg-white/85 px-5 py-3 shadow-[0_20px_60px_rgba(37,99,235,0.12)] backdrop-blur md:px-7">
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
          <button className="rounded-full border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50">
            Sign Up
          </button>
          <button className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700">
            Login
          </button>
        </div>
      </nav>
    </header>
  )
}
