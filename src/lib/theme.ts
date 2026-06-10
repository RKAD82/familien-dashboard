export type ThemePreference = 'light' | 'dark' | 'system'

export const themeStorageKey = 'familien-dashboard-theme'

export const themePreferences: { label: string; value: ThemePreference }[] = [
  { label: 'Hell', value: 'light' },
  { label: 'Dunkel', value: 'dark' },
  { label: 'Auto', value: 'system' },
]

export const storedTheme = () => {
  if (typeof window === 'undefined') return 'light'
  try {
    const value = window.localStorage.getItem(themeStorageKey)
    return value === 'light' || value === 'dark' || value === 'system' ? value : 'light'
  } catch {
    return 'light'
  }
}

export const resolveTheme = (preference: ThemePreference) => {
  if (preference !== 'system') return preference
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const applyTheme = (preference: ThemePreference) => {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = resolveTheme(preference)
}
