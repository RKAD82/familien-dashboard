import {
  Bell,
  CalendarDays,
  CheckSquare,
  ChefHat,
  Home,
  Link as LinkIcon,
  ListChecks,
  LogOut,
  Map,
  Menu,
  Recycle,
  Settings,
  StickyNote,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { FamilyActions } from '../routes/context'
import type { DashboardData } from '../types'
import { Button } from './ui'

const navigation = [
  { path: '/', label: 'Heute', icon: Home },
  { path: '/woche', label: 'Woche', icon: CalendarDays },
  { path: '/kalender', label: 'Kalender', icon: CalendarDays },
  { path: '/aufgaben', label: 'Aufgaben', icon: CheckSquare },
  { path: '/einkauf', label: 'Einkauf', icon: ListChecks },
  { path: '/links', label: 'Links', icon: LinkIcon },
  { path: '/notizen', label: 'Notizen', icon: StickyNote },
  { path: '/abfall', label: 'Abfall', icon: Recycle },
  { path: '/rezepte', label: 'Rezepte', icon: ChefHat },
  { path: '/aktivitaeten', label: 'Aktivitäten', icon: Map },
  { path: '/meldungen', label: 'Meldungen', icon: Bell },
  { path: '/einstellungen', label: 'System', icon: Settings },
]

export const AppShell = ({
  data,
  actions,
  modeLabel,
}: {
  data: DashboardData
  actions: FamilyActions
  modeLabel?: string
}) => {
  const { profile, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const unread = data.notificationDeliveries.filter((delivery) => delivery.status !== 'read').length

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">FD</div>
          <div>
            <strong>{data.family.name}</strong>
            <span>{profile?.display_name ?? 'Familie'}</span>
          </div>
        </div>
        <nav className="nav-list">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <NavLink key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>
                <Icon size={18} />
                <span>{item.label}</span>
                {item.path === '/meldungen' && unread > 0 && <em>{unread}</em>}
              </NavLink>
            )
          })}
        </nav>
        <Button variant="ghost" onClick={signOut}>
          <LogOut size={18} />
          Abmelden
        </Button>
      </aside>
      <header className="mobile-topbar">
        <Button variant="ghost" aria-label="Navigation öffnen" onClick={() => setMobileOpen((value) => !value)}>
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
        <strong>{data.family.name}</strong>
        <NavLink to="/meldungen" className="mobile-bell" aria-label="Meldungen">
          <Bell size={20} />
          {unread > 0 && <em>{unread}</em>}
        </NavLink>
      </header>
      <main className="main-content">
        {modeLabel && <div className="demo-banner">{modeLabel}</div>}
        <Outlet context={{ data, actions }} />
      </main>
      <nav className="bottom-nav">
        {navigation.slice(0, 5).map((item) => {
          const Icon = item.icon
          return (
            <NavLink key={item.path} to={item.path}>
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
