import { useState } from 'react'
import { CalendarDays, ExternalLink, MapPin, RefreshCw, Ticket, Users } from 'lucide-react'
import { Button, Card, EmptyState, Tag } from '../components/ui'
import { formatLongDate, formatTime } from '../lib/date'
import { useFamilyRoute } from '../routes/context'
import type { ActivityAgentRun } from '../types'

const formatActivityWindow = (startsAt: string | null, endsAt: string | null) => {
  if (!startsAt) {
    return 'Termin flexibel / Quelle prüfen'
  }

  const date = formatLongDate(startsAt)
  const start = formatTime(startsAt)
  const end = endsAt ? formatTime(endsAt) : null

  return end ? `${date}, ${start}-${end} Uhr` : `${date}, ${start} Uhr`
}

const formatRunLabel = (run: ActivityAgentRun | undefined) => {
  if (!run) {
    return 'Noch kein Aktualisierungslauf gespeichert.'
  }

  const finished = run.finished_at ? new Date(run.finished_at) : new Date(run.started_at)
  return `${finished.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}: ${run.items_saved} gespeichert, ${run.items_found} aktiv.`
}

export const ActivitiesPage = () => {
  const { data, actions } = useFamilyRoute()
  const [refreshing, setRefreshing] = useState(false)
  const activeActivities = data.activitySuggestions.filter((activity) => activity.status !== 'archived')
  const archivedActivities = data.activitySuggestions.filter((activity) => activity.status === 'archived')
  const activityRuns = data.activityAgentRuns.filter((run) => run.run_type === 'activities')
  const lastRun = activityRuns[0]

  const runActivities = async () => {
    setRefreshing(true)
    try {
      await actions.refreshActivities()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="page-stack">
      <section className="page-title">
        <div>
          <h1>Aktivitäten</h1>
          <p>Vorschläge aus gespeicherten Quellen. Aktualisieren startet den Quellenlauf und archiviert abgelaufene Einträge.</p>
        </div>
        <Button variant="secondary" disabled={refreshing} onClick={() => void runActivities()}>
          <RefreshCw size={18} />
          {refreshing ? 'Läuft...' : 'Aktualisieren'}
        </Button>
      </section>

      <Card title="Letzter Lauf">
        <div className="compact-list">
          <article>
            <strong>{lastRun?.status === 'ok' ? 'Aktualisierung erfolgreich' : lastRun?.status === 'error' ? 'Fehler im Lauf' : 'Aktivitäten-Agent'}</strong>
            <span>{formatRunLabel(lastRun)}</span>
          </article>
        </div>
      </Card>

      <div className="activity-grid">
        {activeActivities.map((activity) => (
          <Card key={activity.id}>
            <article className="activity-card">
              <div className="activity-card-topline">
                <div className="activity-card-tags">
                  <Tag>{activity.category}</Tag>
                  <Tag tone="info">{activity.distance_label}</Tag>
                </div>
              </div>
              <div>
                <h2>{activity.title}</h2>
                <p>{activity.description}</p>
              </div>
              <div className="activity-details">
                <span className="activity-detail">
                  <CalendarDays size={16} />
                  {formatActivityWindow(activity.starts_at, activity.ends_at)}
                </span>
                <span className="activity-detail">
                  <MapPin size={15} />
                  {activity.location_name}
                  {activity.location_address ? ` · ${activity.location_address}` : ''}
                </span>
                <span className="activity-detail">
                  <Ticket size={16} />
                  {activity.price_label}
                </span>
                <span className="activity-detail">
                  <Users size={16} />
                  {activity.age_label}
                </span>
              </div>
              {activity.url && (
                <a className="button button-secondary activity-link" href={activity.url} target="_blank" rel="noreferrer">
                  <ExternalLink size={16} />
                  Zur Veranstaltungsseite
                </a>
              )}
              <Button variant="ghost" onClick={() => void actions.archiveActivity(activity.id, true)}>
                Archivieren
              </Button>
            </article>
          </Card>
        ))}
        {!activeActivities.length && (
          <EmptyState title="Keine Vorschläge" body="Seed-Daten oder Agentenlauf müssen Vorschläge speichern." />
        )}
      </div>
      {archivedActivities.length > 0 && (
        <Card title="Archiv">
          <div className="compact-list">
            {archivedActivities.map((activity) => (
              <article key={activity.id}>
                <strong>{activity.title}</strong>
                <button type="button" onClick={() => void actions.archiveActivity(activity.id, false)}>Zurückholen</button>
              </article>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
