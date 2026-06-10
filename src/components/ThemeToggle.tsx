import { useEffect, useState } from 'react'
import { applyTheme, storedTheme, themePreferences, themeStorageKey, type ThemePreference } from '../lib/theme'

export const ThemeToggle = ({ compact = false }: { compact?: boolean }) => {
  const [preference, setPreference] = useState<ThemePreference>(storedTheme)

  useEffect(() => {
    applyTheme(preference)
    try {
      window.localStorage.setItem(themeStorageKey, preference)
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
      {themePreferences.map((entry) => (
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
