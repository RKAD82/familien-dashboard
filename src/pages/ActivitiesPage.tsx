import { CalendarDays, ExternalLink, MapPin, RefreshCw, Ticket, Users } from 'lucide-react'
import { Button, Card, EmptyState, Tag } from '../components/ui'
import { formatLongDate, formatTime } from '../lib/date'
import { useFamilyRoute } from '../routes/context'

const formatActivityWindow = (startsAt: string | null, endsAt: string | null) => {
  if (!startsAt) {
    return 'Termin flexibel / Quelle prüfen'
  }

  const date = formatLongDate(startsAt)
  const start = formatTime(startsAt)
  const end = endsAt ? formatTime(endsAt) : null

  return end ? `${date}, ${start}-${end} Uhr` : `${date}, ${start} Uhr`
}

export const ActivitiesPage = () => {
  const { data, actions } = useFamilyRoute()

  return (
    <div className="page-stack">
      <section className="page-title">
        <div>
          <h1>Aktivitäten</h1>
          <p>Konkrete Vorschläge für Pulheim, Köln und Umgebung mit Termin, Preis, Ort und Quelle.</p>
        </div>
        <Button variant="secondary" onClick={() => void actions.refresh()}>
          <RefreshCw size={18} />
          Aktualisieren
        </Button>
      </section>

      <div className="activity-grid">
        {data.activitySuggestions.map((activity) => (
          <Card key={activity.id}>
            <article className="activity-card">
              <div className="activity-card-topline">
                <div className="score" aria-label={`Passung ${activity.family_score} von 100`}>
                  <strong>{activity.family_score}</strong>
                  <span>Passung</span>
                </div>
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
            </article>
          </Card>
        ))}
        {!data.activitySuggestions.length && (
          <EmptyState title="Keine Vorschläge" body="Seed-Daten oder Agentenlauf müssen Vorschläge speichern." />
        )}
      </div>
    </div>
  )
}
