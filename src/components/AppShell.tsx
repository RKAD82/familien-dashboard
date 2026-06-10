import { Bell, CalendarDays, CloudSun, LogOut, Menu, UserRound, X } from 'lucide-react'
import { useEffect, useState, type CSSProperties } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { addDays, formatDay, formatLongDate, startOfWeek, toDateKey } from '../lib/date'
import { memberAvatarColor, memberInitials } from '../lib/assignments'
import { isNavItemVisible, mobileNavItemIds, navigationItems } from '../navigation'
import { useAuth } from '../hooks/useAuth'
import type { FamilyActions } from '../routes/context'
import type { DashboardData, FamilyMembership, NavItemId } from '../types'
import { Button } from './ui'
import { ThemeToggle } from './ThemeToggle'

const weatherLabels: Record<number, string> = {
  0: 'Klar',
  1: 'Leicht bewölkt',
  2: 'Bewölkt',
  3: 'Bedeckt',
  45: 'Nebel',
  48: 'Nebel',
  51: 'Nieselregen',
  53: 'Nieselregen',
  55: 'Nieselregen',
  61: 'Regen',
  63: 'Regen',
  65: 'Starker Regen',
  71: 'Schnee',
  73: 'Schnee',
  75: 'Starker Schnee',
  80: 'Schauer',
  81: 'Schauer',
  82: 'Starke Schauer',
  95: 'Gewitter',
}

const navigationGroups: { label: string; ids: NavItemId[] }[] = [
  { label: 'Zeit', ids: ['heute', 'woche', 'kalender'] },
  { label: 'Tun', ids: ['aufgaben', 'einkauf', 'links', 'notizen', 'abfall', 'rezepte'] },
  { label: 'Familie', ids: ['aktivitaeten', 'meldungen', 'kontakte', 'notfall', 'system'] },
]

const usePulheimWeather = () => {
  const [weather, setWeather] = useState<{ temperature: number; label: string } | null>(null)

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    const load = async () => {
      try {
        const response = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=50.9997&longitude=6.8063&current=temperature_2m,weather_code&timezone=Europe%2FBerlin',
          { signal: controller.signal },
        )
        if (!response.ok) return
        const payload = (await response.json()) as { current?: { temperature_2m?: number; weather_code?: number } }
        if (!active || typeof payload.current?.temperature_2m !== 'number') return
        setWeather({
          temperature: Math.round(payload.current.temperature_2m),
          label: weatherLabels[payload.current.weather_code ?? 0] ?? 'Aktuell',
        })
      } catch {
        if (active) setWeather(null)
      }
    }

    void load()

    return () => {
      active = false
      controller.abort()
    }
  }, [])

  return weather
}

const PhotoAvatar = ({ member, large = false }: { member?: FamilyMembership | null; large?: boolean }) => {
  const name = member?.display_name ?? 'Familie'
  return (
    <span
      className={`photo-avatar ${large ? 'photo-avatar-large' : ''}`}
      style={{ '--avatar-color': memberAvatarColor(member) } as CSSProperties}
      title={name}
    >
      {memberInitials(member) || <UserRound size={large ? 22 : 14} />}
    </span>
  )
}

const WeekRail = () => {
  const location = useLocation()
  const start = startOfWeek()
  const today = toDateKey(new Date())
  const selectedDay = new URLSearchParams(location.search).get('tag') ?? today
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index))

  return (
    <section className="week-rail" aria-label="Wochenübersicht">
      <div className="week-rail-header">
        <h2>Woche</h2>
        <div>
          <Button variant="ghost">Diese Woche</Button>
          <Button variant="ghost" aria-label="Kalender öffnen">
            <CalendarDays size={17} />
          </Button>
        </div>
      </div>
      <div className="week-rail-days">
        {days.map((day) => {
          const key = toDateKey(day)
          const [weekday, date] = formatDay(day).split(', ')
          return (
            <NavLink
              key={key}
              to={`/woche?tag=${key}`}
              className={`${key === today ? 'today' : ''} ${key === selectedDay ? 'selected' : ''}`}
            >
              <span>{weekday}</span>
              <strong>{date?.slice(0, 2) ?? day.getDate()}</strong>
              <small>{date?.slice(3) ?? ''}</small>
            </NavLink>
          )
        })}
      </div>
    </section>
  )
}

export const AppShell = ({
  data,
  actions,
  modeLabel,
}: {
  data: DashboardData
  actions: FamilyActions
  modeLabel?: string
}) => {
  const { signOut, user, membership } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const weather = usePulheimWeather()
  const unread = data.notificationDeliveries.filter((delivery) => delivery.status !== 'read').length
  const activeMembers = data.memberships.filter((entry) => entry.active)
  const currentMembership =
    activeMembers.find((entry) => entry.user_id === user?.id) ?? membership ?? activeMembers[0] ?? null
  const visibleNavigation = navigationItems.filter((item) => isNavItemVisible(currentMembership, item))
  const mobileNavigation = mobileNavItemIds
    .map((id) => visibleNavigation.find((item) => item.id === id))
    .filter((item): item is (typeof visibleNavigation)[number] => Boolean(item))
  const showWeekRail = location.pathname !== '/'

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark-soft">K</span>
          <div>
            <strong>Familie Klein</strong>
            <span>{data.family.name}</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Hauptnavigation">
          {navigationGroups.map((group) => {
            const items = group.ids
              .map((id) => visibleNavigation.find((item) => item.id === id))
              .filter((item): item is (typeof visibleNavigation)[number] => Boolean(item))
            if (!items.length) return null

            return (
              <section key={group.label} className="nav-section" aria-label={group.label}>
                <div className="nav-section-title">{group.label}</div>
                {items.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>
                      <Icon size={18} />
                      <span>{item.label}</span>
                      {item.path === '/meldungen' && unread > 0 && <em>{unread}</em>}
                    </NavLink>
                  )
                })}
              </section>
            )
          })}
        </nav>

        <div className="sidebar-status-card">
          <div className="sidebar-weather-row">
            <CloudSun size={26} />
            <div>
              <strong>{weather ? `${weather.temperature}°` : '--°'}</strong>
              <span>{weather?.label ?? 'Wetter lädt'} · Pulheim</span>
            </div>
          </div>
          <div className="sidebar-user-row">
            <PhotoAvatar member={currentMembership} />
            <div>
              <strong>{currentMembership?.display_name ?? 'Familie'}</strong>
              <span>{currentMembership ? 'angemeldet' : 'Demoansicht'}</span>
            </div>
          </div>
        </div>

        <Button variant="ghost" onClick={signOut}>
          <LogOut size={18} />
          Abmelden
        </Button>
      </aside>

      <header className="mobile-topbar">
        <Button variant="ghost" aria-label="Navigation öffnen" onClick={() => setMobileOpen((value) => !value)}>
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
        <strong>Familien-Dashboard</strong>
        <NavLink to="/meldungen" className="mobile-bell" aria-label="Meldungen">
          <Bell size={20} />
          {unread > 0 && <em>{unread}</em>}
        </NavLink>
      </header>

      <main className="main-content">
        {modeLabel && <div className="demo-banner">{modeLabel}</div>}
        <div className="app-topline">
          <div className="topline-date">{formatLongDate(new Date())}</div>
          <div className="topline-actions">
            <ThemeToggle compact />
            <NavLink to="/meldungen" className="topline-icon" aria-label="Meldungen">
              <Bell size={19} />
              {unread > 0 && <em>{unread}</em>}
            </NavLink>
            <PhotoAvatar member={currentMembership} />
            {currentMembership && (
              <div className="topline-user">
                <strong>{currentMembership.display_name}</strong>
                <span>{currentMembership.role === 'admin' ? 'Admin' : currentMembership.email ?? 'angemeldet'}</span>
              </div>
            )}
          </div>
        </div>
        {showWeekRail && <WeekRail />}
        <Outlet context={{ data, actions }} />
      </main>

      <nav className="bottom-nav">
        {mobileNavigation.map((item) => {
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
