export const THEME_STORAGE_KEY = 'intellmeet-theme-mode'
export const THEME_CHANGE_EVENT = 'intellmeet-theme-change'

export type ThemeMode = 'light' | 'dark'

export function readThemeMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function applyThemeMode(mode: ThemeMode) {
  document.documentElement.classList.toggle('dark', mode === 'dark')
  document.documentElement.classList.toggle('intellmeet-dark', mode === 'dark')

  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode)
  } catch {
    // ignore local storage issues in frontend-only mode
  }

  window.dispatchEvent(new CustomEvent<ThemeMode>(THEME_CHANGE_EVENT, { detail: mode }))
}

export function toggleThemeMode() {
  const nextMode = readThemeMode() === 'dark' ? 'light' : 'dark'
  applyThemeMode(nextMode)
  return nextMode
}
