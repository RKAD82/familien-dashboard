import { FileText, MapPin, Package, Plus, Sofa, Wrench } from 'lucide-react'
import { Button, Card, EmptyState, Tag } from '../components/ui'

const inventoryAreas = [
  { icon: Wrench, title: 'Geräte & Technik', body: 'Seriennummern, Kaufdatum, Garantie und Bedienungsanleitungen.' },
  { icon: Sofa, title: 'Möbel & Räume', body: 'Standort, Zustand, Wert und Hinweise für Ersatz oder Reparatur.' },
  { icon: FileText, title: 'Nachweise', body: 'Rechnungen, Garantien, Fotos und relevante Dokumente.' },
]

export const InventoryPage = () => (
  <div className="page-grid house-page">
    <section className="page-title span-3">
      <div>
        <h1>Inventar</h1>
        <p>Hausinventar als ruhige Übersicht für Anschaffungen, Standorte und Nachweise.</p>
      </div>
      <div className="page-actions">
        <Tag tone="info">Struktur vorbereitet</Tag>
        <Button disabled>
          <Plus size={17} />
          Gegenstand
        </Button>
      </div>
    </section>

    <Card title="Hausinventar" className="span-2 house-primary-card">
      <EmptyState title="Noch keine Inventarliste" body="Hier entsteht die Übersicht für Geräte, Möbel, Garantien und wichtige Nachweise." />
      <div className="house-overview-grid">
        {inventoryAreas.map((area) => {
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

    <Card title="Ablage-Logik">
      <div className="compact-list">
        <article>
          <Package size={20} />
          <strong>Gegenstand</strong>
          <span>Name, Kategorie, Standort, Anschaffungsdatum, Wert und Notiz.</span>
          <Tag tone="info">geplant</Tag>
        </article>
        <article>
          <MapPin size={20} />
          <strong>Standort</strong>
          <span>Raum oder Bereich im Haus, damit Dinge später schnell auffindbar sind.</span>
          <Tag>Haus</Tag>
        </article>
      </div>
    </Card>
  </div>
)
