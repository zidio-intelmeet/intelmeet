import { useEffect, useState } from 'react'
import { applyThemeMode, readThemeMode, THEME_CHANGE_EVENT, type ThemeMode } from '../../utils/theme'

export function ThemeToggleButton({
  className = '',
  showLabel = true,
}: {
  className?: string
  showLabel?: boolean
}) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readThemeMode())

  useEffect(() => {
    function handleThemeChange(event: Event) {
      const customEvent = event as CustomEvent<ThemeMode>
      setThemeMode(customEvent.detail || readThemeMode())
    }

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange)
    return () => window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange)
  }, [])

  const isDark = themeMode === 'dark'

  return (
    <button
      type="button"
      onClick={() => {
        const nextMode: ThemeMode = isDark ? 'light' : 'dark'
        setThemeMode(nextMode)
        applyThemeMode(nextMode)
      }}
      className={[
        'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition',
        'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50',
        'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-emerald-500 dark:hover:bg-slate-800',
        className,
      ].join(' ')}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3c0 .42.03.84.08 1.25A7 7 0 0020.75 12c.41.05.83.08 1.25.08z" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25M12 18.75V21M4.97 4.97l1.59 1.59M17.44 17.44l1.59 1.59M3 12h2.25M18.75 12H21M4.97 19.03l1.59-1.59M17.44 6.56l1.59-1.59M15.75 12A3.75 3.75 0 1112 8.25 3.75 3.75 0 0115.75 12z" />
        </svg>
      )}
      {showLabel && <span>{isDark ? 'Dark mode' : 'Light mode'}</span>}
    </button>
  )
}
