import { Flame, Plus, ShieldCheck, TrendingDown, Umbrella, Wifi, Zap } from 'lucide-react'
import { Button, Card, EmptyState, Tag } from '../components/ui'

const contractAreas = [
  { icon: Umbrella, title: 'Versicherungen', body: 'Police, Beitrag, Laufzeit, Ansprechpartner und Schadenkontakt.' },
  { icon: Zap, title: 'Strom & Energie', body: 'Tarif, Verbrauch, Abschlag, Preisbindung und nächster Prüftermin.' },
  { icon: Wifi, title: 'Internet & Mobilfunk', body: 'Leistung, Laufzeit, Kosten, Kündigungsfrist und Hotline.' },
]

export const InsurancePage = () => (
  <div className="page-grid house-page">
    <section className="page-title span-3">
      <div>
        <h1>Versicherungen</h1>
        <p>Verträge, Versorger, Ansprechpartner, Laufzeiten, Kosten und Prüftermine.</p>
      </div>
      <div className="page-actions">
        <Tag tone="warn">Tarifprüfung später</Tag>
        <Button disabled>
          <Plus size={17} />
          Vertrag
        </Button>
      </div>
    </section>

    <Card title="Vertragsübersicht" className="span-2 house-primary-card">
      <EmptyState title="Noch keine Verträge erfasst" body="Hier sollen Anbieter, Kontakt, Leistung, Laufzeit und Preis stehen, keine Passwörter." />
      <div className="house-overview-grid">
        {contractAreas.map((area) => {
          const Icon = area.icon
          return (
            <article key={area.title}>
              <Icon size={20} />
              <strong>{area.title}</strong>
              <span>{area.body}</span>
            </article>
          )
        })}
      </div>
    </Card>

    <Card title="Quartalsprüfung">
      <div className="compact-list">
        <article>
          <TrendingDown size={20} />
          <strong>Tarifvergleich</strong>
          <span>Automatische Treffer brauchen belastbare Quellen, API oder manuell prüfbare Vergleichslinks.</span>
          <Tag tone="warn">Konzept offen</Tag>
        </article>
        <article>
          <Flame size={20} />
          <strong>Gas, Wasser, Strom</strong>
          <span>Ein echter Vergleich braucht Verbrauchswerte, PLZ, Vertragsdaten und eine belastbare Vergleichsquelle.</span>
          <Tag>prüfpflichtig</Tag>
        </article>
        <article>
          <ShieldCheck size={20} />
          <strong>Prüfflag</strong>
          <span>Treffer sollten als Vorschlag markiert werden, nicht als geprüfte Empfehlung.</span>
          <Tag tone="info">geplant</Tag>
        </article>
      </div>
    </Card>
  </div>
)
