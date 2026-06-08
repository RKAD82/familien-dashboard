import { Database, GitBranch, ShieldCheck } from 'lucide-react'
import { appConfig } from '../config'
import { useFamilyRoute } from '../routes/context'
import { Card, Tag } from '../components/ui'

export const SettingsPage = () => {
  const { data } = useFamilyRoute()

  return (
    <div className="page-grid">
      <section className="page-title span-2">
        <div>
          <h1>System</h1>
          <p>Status der Daten, Online-Adresse und Sicherheitsgrenzen.</p>
        </div>
      </section>

      <Card title="Speicher">
        <div className="setup-card">
          <Database size={24} />
          <strong>{data.family.name}</strong>
          <span>Die Demo läuft lokal. Im Onlinebetrieb werden Familien-Daten über Supabase gespeichert.</span>
          <Tag tone="good">Zugriff pro Familie getrennt</Tag>
        </div>
      </Card>

      <Card title="Online-Adresse">
        <div className="setup-card">
          <GitBranch size={24} />
          <strong>Familien-Dashboard</strong>
          <code>{appConfig.basePath}</code>
          <span>Diese Adresse ist für die Veröffentlichung als Web-App vorbereitet.</span>
        </div>
      </Card>

      <Card title="Sicherheit" className="span-2">
        <div className="security-grid">
          <article>
            <ShieldCheck size={22} />
            <strong>Keine sensiblen Demo-Daten</strong>
            <span>Private Inhalte gehören erst nach Anmeldung und Datenschutzentscheidung in die App.</span>
          </article>
          <article>
            <ShieldCheck size={22} />
            <strong>Keine kostenpflichtigen APIs</strong>
            <span>Rezepte und Aktivitäten arbeiten aus Seeds und eigener Logik.</span>
          </article>
          <article>
            <ShieldCheck size={22} />
            <strong>Push reduziert sensible Daten</strong>
            <span>Push transportiert kurze Hinweise; Details bleiben in der App nach Login.</span>
          </article>
        </div>
      </Card>
    </div>
  )
}
