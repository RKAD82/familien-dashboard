import { useEffect, useState } from 'react'

type ThemePreference = 'light' | 'dark' | 'system'

const storageKey = 'familien-dashboard-theme'
const preferences: { label: string; value: ThemePreference }[] = [
  { label: 'Hell', value: 'light' },
  { label: 'Dunkel', value: 'dark' },
  { label: 'System', value: 'system' },
]

const storedTheme = () => {
  if (typeof window === 'undefined') return 'light'
  try {
    const value = window.localStorage.getItem(storageKey)
    return value === 'light' || value === 'dark' || value === 'system' ? value : 'light'
  } catch {
    return 'light'
  }
}

const resolveTheme = (preference: ThemePreference) => {
  if (preference !== 'system') return preference
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const applyTheme = (preference: ThemePreference) => {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = resolveTheme(preference)
}

export const ThemeToggle = ({ compact = false }: { compact?: boolean }) => {
  const [preference, setPreference] = useState<ThemePreference>(storedTheme)

  useEffect(() => {
    applyTheme(preference)
    try {
      window.localStorage.setItem(storageKey, preference)
    } catch {
      // Theme still works for the current session when storage is unavailable.
    }

    if (preference !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = () => applyTheme('system')
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [preference])

  return (
    <div className={`theme-toggle ${compact ? 'theme-toggle-compact' : ''}`} role="group" aria-label="Darstellung umschalten">
      {preferences.map((entry) => (
        <button
          key={entry.value}
          type="button"
          className={preference === entry.value ? 'is-active' : ''}
          aria-pressed={preference === entry.value}
          onClick={() => setPreference(entry.value)}
        >
          {entry.label}
        </button>
      ))}
    </div>
  )
}
