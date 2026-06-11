import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import { AuthProvider } from './hooks/useAuth'
import { markPwaUpdateAvailable } from './lib/pwaUpdate'
import './styles.css'

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    markPwaUpdateAvailable()
  },
  onNeedReload() {
    markPwaUpdateAvailable()
  },
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      const checkForUpdate = () => {
        void registration.update()
      }

      setInterval(() => {
        checkForUpdate()
      }, 60 * 60 * 1000)

      window.addEventListener('focus', checkForUpdate)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          checkForUpdate()
        }
      })
    }
  },
})

if (typeof window !== 'undefined') {
  window.familienDashboardUpdateSW = updateSW
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)
