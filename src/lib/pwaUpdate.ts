export const pwaUpdateEventName = 'familien-dashboard-update-available'

declare global {
  interface Window {
    familienDashboardUpdateAvailable?: boolean
    familienDashboardUpdateSW?: (reloadPage?: boolean) => Promise<void>
  }
}

export const markPwaUpdateAvailable = () => {
  if (typeof window === 'undefined') return
  window.familienDashboardUpdateAvailable = true
  window.dispatchEvent(new Event(pwaUpdateEventName))
}
