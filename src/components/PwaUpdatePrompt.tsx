import { useEffect, useState } from 'react'
import { pwaUpdateEventName } from '../lib/pwaUpdate'

export const PwaUpdatePrompt = () => {
  const [available, setAvailable] = useState(() =>
    typeof window !== 'undefined' ? Boolean(window.familienDashboardUpdateAvailable) : false,
  )

  useEffect(() => {
    const listener = () => setAvailable(true)
    window.addEventListener(pwaUpdateEventName, listener)
    return () => window.removeEventListener(pwaUpdateEventName, listener)
  }, [])

  if (!available) return null

  return (
    <div className="pwa-update-banner" role="status">
      <span>Neue Version verfügbar.</span>
      <button type="button" onClick={() => void window.familienDashboardUpdateSW?.(true)}>
        Jetzt aktualisieren
      </button>
    </div>
  )
}
