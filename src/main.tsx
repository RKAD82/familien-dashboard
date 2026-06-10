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
      setInterval(() => {
        void registration.update()
      }, 60 * 60 * 1000)
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
