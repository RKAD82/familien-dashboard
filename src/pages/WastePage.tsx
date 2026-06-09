import { useMemo, useState } from 'react'
import { Recycle, Search } from 'lucide-react'
import { formatDay } from '../lib/date'
import { getUpcomingWasteEvents, getWasteEventsForMonth, searchWasteSorting, wasteLabels } from '../lib/waste'
import { useFamilyRoute } from '../routes/context'
import { Card, EmptyState, Tag, TextInput } from '../components/ui'
import { WasteIcon } from '../components/WasteIcon'

export const WastePage = () => {
  const { data } = useFamilyRoute()
  const [query, setQuery] = useState('')
  const now = new Date()
  const monthEvents = getWasteEventsForMonth(data.wasteEvents, now.getFullYear(), now.getMonth() + 1)
  const nextEvents = getUpcomingWasteEvents(data.wasteEvents, now, 5)
  const sortingResults = useMemo(() => searchWasteSorting(data.wasteSortingItems, query), [data.wasteSortingItems, query])
  const district = data.wasteDistricts[0]

  return (
    <div className="page-grid">
      <section className="page-title span-2">
        <div>
          <h1>Abfall</h1>
          <p>Brauweiler/Freimersdorf 2026, Seed aus manuell übernommenem Pulheimer Abfallkalender.</p>
        </div>
      </section>

      <Card title="Nächste Abholungen">
        <div className="waste-list">
          {nextEvents.map((event) => (
            <article key={event.id}>
              <WasteIcon type={event.waste_type} />
              <div>
                <strong>{event.title}</strong>
                <span>{formatDay(`${event.date}T06:00:00Z`)}</span>
              </div>
            </article>
          ))}
        </div>
      </Card>

      <Card title="Quelle und Gebiet">
        <div className="source-box">
          <Recycle size={24} />
          <strong>{district?.district_name ?? 'Brauweiler/Freimersdorf'}</strong>
          <span>{district?.source_label ?? 'Seed noch nicht geladen'}</span>
          <small>Quelle zuletzt geprüft: {district?.source_checked_at ?? 'offen'}</small>
          <Tag tone="warn">vor Produktivbetrieb gegen Original prüfen</Tag>
        </div>
      </Card>

      <Card title="Diesen Monat" className="span-2">
        {monthEvents.length ? (
          <div className="month-list">
            {monthEvents.map((event) => (
              <article key={event.id}>
                <WasteIcon type={event.waste_type} />
                <strong>{event.date.slice(8, 10)}.</strong>
                <span>{wasteLabels[event.waste_type]}</span>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Keine Termine" body="Für den aktuellen Monat sind keine Abfalltermine geladen." />
        )}
      </Card>

      <Card title="Trennhilfe" className="span-3">
        <div className="search-row">
          <Search size={18} />
          <TextInput placeholder="z.B. Batterien, Pizzakarton, Katzenstreu" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="sorting-results">
          {sortingResults.map((item) => (
            <article key={item.id}>
              <div>
                <strong>{item.term}</strong>
                <span>{item.description}</span>
                {item.warning && <small>{item.warning}</small>}
              </div>
              <Tag tone={item.allowed ? 'good' : 'warn'}>{item.category_name}</Tag>
            </article>
          ))}
        </div>
      </Card>
    </div>
  )
}
