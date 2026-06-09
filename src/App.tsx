import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { LoginGate } from './components/LoginGate'
import { VisibleRoute } from './components/VisibleRoute'
import { Card } from './components/ui'
import { hasSupabaseConfig } from './config'
import { DemoApp } from './demo/DemoApp'
import { useAuth } from './hooks/useAuth'
import { useFamilyData } from './hooks/useFamilyData'
import { ActivitiesPage } from './pages/ActivitiesPage'
import { CalendarPage } from './pages/CalendarPage'
import { ContactsPage } from './pages/ContactsPage'
import { EmergencyPage } from './pages/EmergencyPage'
import { LinksPage } from './pages/LinksPage'
import { NotesPage } from './pages/NotesPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { RecipesPage } from './pages/RecipesPage'
import { SettingsPage } from './pages/SettingsPage'
import { ShoppingPage } from './pages/ShoppingPage'
import { TasksPage } from './pages/TasksPage'
import { TodayPage } from './pages/TodayPage'
import { WastePage } from './pages/WastePage'
import { WeekPage } from './pages/WeekPage'

const AuthenticatedApp = () => {
  const { membership, user, loading } = useAuth()
  const family = membership?.family ?? null
  const { data, loading: dataLoading, error, actions } = useFamilyData(family, user?.id ?? null)

  if (loading || dataLoading) {
    return <main className="loading-screen">Familien-Dashboard wird geladen...</main>
  }

  if (!family || !data) {
    return (
      <main className="setup-screen">
        <Card title="Keine aktive Familie">
          <p>Der Login funktioniert, aber für diesen Nutzer wurde keine aktive Familienmitgliedschaft gefunden.</p>
        </Card>
      </main>
    )
  }

  if (error) {
    return (
      <main className="setup-screen">
        <Card title="Daten konnten nicht geladen werden">
          <p>{error}</p>
        </Card>
      </main>
    )
  }

  return (
    <Routes>
      <Route element={<AppShell data={data} actions={actions} />}>
        <Route index element={<TodayPage />} />
        <Route path="woche" element={<WeekPage />} />
        <Route path="kalender" element={<CalendarPage />} />
        <Route path="aufgaben" element={<TasksPage />} />
        <Route path="einkauf" element={<ShoppingPage />} />
        <Route path="links" element={<LinksPage />} />
        <Route path="notizen" element={<VisibleRoute navId="notizen"><NotesPage /></VisibleRoute>} />
        <Route path="abfall" element={<VisibleRoute navId="abfall"><WastePage /></VisibleRoute>} />
        <Route path="rezepte" element={<VisibleRoute navId="rezepte"><RecipesPage /></VisibleRoute>} />
        <Route path="aktivitaeten" element={<VisibleRoute navId="aktivitaeten"><ActivitiesPage /></VisibleRoute>} />
        <Route path="meldungen" element={<VisibleRoute navId="meldungen"><NotificationsPage /></VisibleRoute>} />
        <Route path="kontakte" element={<VisibleRoute navId="kontakte"><ContactsPage /></VisibleRoute>} />
        <Route path="notfall" element={<VisibleRoute navId="notfall"><EmergencyPage /></VisibleRoute>} />
        <Route path="einstellungen" element={<VisibleRoute navId="system"><SettingsPage /></VisibleRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export const App = () => {
  if (!hasSupabaseConfig) {
    return <DemoApp />
  }

  return (
    <LoginGate>
      <AuthenticatedApp />
    </LoginGate>
  )
}
