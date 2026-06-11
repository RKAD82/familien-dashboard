import { useEffect, useState } from 'react'
import { pwaUpdateEventName } from '../lib/pwaUpdate'

export const PwaUpdatePrompt = () => {
  const [available, setAvailable] = useState(() =>
    typeof window !== 'undefined' ? Boolean(window.familienDashboardUpdateAvailable) : false,
  )
  const [reloading, setReloading] = useState(false)

  useEffect(() => {
    const listener = () => setAvailable(true)
    window.addEventListener(pwaUpdateEventName, listener)
    return () => window.removeEventListener(pwaUpdateEventName, listener)
  }, [])

  if (!available) return null

  const reloadApp = async () => {
    setReloading(true)
    await window.familienDashboardUpdateSW?.(true)
    window.location.reload()
  }

  return (
    <div className="pwa-update-banner" role="status" aria-live="polite">
      <span>Neue Version verfügbar - neu laden.</span>
      <button type="button" onClick={() => void reloadApp()} disabled={reloading}>
        {reloading ? 'Wird geladen...' : 'Neu laden'}
      </button>
    </div>
  )
}
