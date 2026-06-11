import { useMemo, useState } from 'react'
import {
  CalendarClock,
  ExternalLink,
  Mail,
  Phone,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  TrendingDown,
  Umbrella,
  WalletCards,
} from 'lucide-react'
import { Button, Card, EmptyState, Field, Select, Tag, TextArea, TextInput } from '../components/ui'
import { useFamilyRoute } from '../routes/context'
import type { ServiceContract, ServiceContractStatus } from '../types'

type ContractFormState = {
  kind: string
  provider_name: string
  product_name: string
  contact_name: string
  phone: string
  email: string
  website_url: string
  customer_number: string
  annual_cost_eur: string
  billing_cycle: string
  contract_until: string
  cancellation_notice: string
  next_review_at: string
  comparison_url: string
  status: ServiceContractStatus
  notes: string
}

const emptyForm: ContractFormState = {
  kind: 'Versicherung',
  provider_name: '',
  product_name: '',
  contact_name: '',
  phone: '',
  email: '',
  website_url: '',
  customer_number: '',
  annual_cost_eur: '',
  billing_cycle: 'jährlich',
  contract_until: '',
  cancellation_notice: '',
  next_review_at: '',
  comparison_url: '',
  status: 'active',
  notes: '',
}

const statusLabels: Record<ServiceContractStatus, string> = {
  active: 'aktiv',
  review: 'prüfen',
  better_offer: 'besseres Angebot',
  cancelled: 'gekündigt',
}

const statusTone = (status: ServiceContractStatus) => {
  if (status === 'active') return 'good'
  if (status === 'better_offer') return 'warn'
  if (status === 'cancelled') return 'neutral'
  return 'info'
}

const normalizeText = (value: string) => value.trim() || null

const parseEuroValue = (value: string) => {
  if (!value.trim()) return null
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

const formatCurrency = (value: number | null) =>
  typeof value === 'number'
    ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
    : 'offen'

const toFormState = (contract: ServiceContract): ContractFormState => ({
  kind: contract.kind,
  provider_name: contract.provider_name,
  product_name: contract.product_name,
  contact_name: contract.contact_name ?? '',
  phone: contract.phone ?? '',
  email: contract.email ?? '',
  website_url: contract.website_url ?? '',
  customer_number: contract.customer_number ?? '',
  annual_cost_eur: contract.annual_cost_eur === null ? '' : String(contract.annual_cost_eur),
  billing_cycle: contract.billing_cycle ?? '',
  contract_until: contract.contract_until ?? '',
  cancellation_notice: contract.cancellation_notice ?? '',
  next_review_at: contract.next_review_at ?? '',
  comparison_url: contract.comparison_url ?? '',
  status: contract.status,
  notes: contract.notes ?? '',
})

const isReviewDue = (contract: ServiceContract) => {
  if (!contract.next_review_at || contract.status === 'cancelled') return false
  const today = new Date()
  const review = new Date(`${contract.next_review_at}T12:00:00`)
  const days = (review.getTime() - today.getTime()) / 86_400_000
  return days <= 45
}

export const InsurancePage = () => {
  const { data, actions } = useFamilyRoute()
  const [form, setForm] = useState<ContractFormState>(emptyForm)
  const [editingContract, setEditingContract] = useState<ServiceContract | null>(null)
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('alle')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const kinds = useMemo(
    () => Array.from(new Set(['Versicherung', 'Strom', 'Gas', 'Wasser', 'Internet', 'Mobilfunk', ...data.serviceContracts.map((contract) => contract.kind)])).sort(),
    [data.serviceContracts],
  )

  const filteredContracts = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return data.serviceContracts.filter((contract) => {
      const kindMatches = kind === 'alle' || contract.kind === kind
      const textMatches =
        !needle ||
        [
          contract.kind,
          contract.provider_name,
          contract.product_name,
          contract.contact_name,
          contract.customer_number,
          contract.notes,
        ].some((value) => value?.toLowerCase().includes(needle))
      return kindMatches && textMatches
    })
  }, [data.serviceContracts, kind, query])

  const annualCosts = data.serviceContracts.reduce((sum, contract) => sum + (contract.annual_cost_eur ?? 0), 0)
  const reviewDue = data.serviceContracts.filter(isReviewDue).length
  const betterOffers = data.serviceContracts.filter((contract) => contract.status === 'better_offer').length

  const resetForm = () => {
    setForm(emptyForm)
    setEditingContract(null)
    setError(null)
  }

  const submitContract = async () => {
    if (!form.provider_name.trim() || !form.product_name.trim()) {
      setError('Bitte Anbieter und Tarif/Leistung eintragen.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        kind: form.kind.trim() || 'Versicherung',
        provider_name: form.provider_name.trim(),
        product_name: form.product_name.trim(),
        contact_name: normalizeText(form.contact_name),
        phone: normalizeText(form.phone),
        email: normalizeText(form.email),
        website_url: normalizeText(form.website_url),
        customer_number: normalizeText(form.customer_number),
        annual_cost_eur: parseEuroValue(form.annual_cost_eur),
        billing_cycle: normalizeText(form.billing_cycle),
        contract_until: normalizeText(form.contract_until),
        cancellation_notice: normalizeText(form.cancellation_notice),
        next_review_at: normalizeText(form.next_review_at),
        comparison_url: normalizeText(form.comparison_url),
        status: form.status,
        notes: normalizeText(form.notes),
      }
      if (editingContract) {
        await actions.updateServiceContract(editingContract, payload)
        setFeedback('Vertrag aktualisiert.')
      } else {
        await actions.createServiceContract(payload)
        setFeedback('Vertrag gespeichert.')
      }
      resetForm()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Vertrag konnte nicht gespeichert werden.')
    } finally {
      setSaving(false)
    }
  }

  const deleteContract = async (contract: ServiceContract) => {
    setSaving(true)
    setError(null)
    try {
      await actions.deleteServiceContract(contract)
      if (editingContract?.id === contract.id) resetForm()
      setFeedback('Vertrag gelöscht.')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Vertrag konnte nicht gelöscht werden.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-grid house-page insurance-page">
      <section className="page-title span-3">
        <div>
          <h1>Versicherungen</h1>
          <p>Verträge, Versorger, Ansprechpartner, Laufzeiten, Kosten, Prüftermine und Vergleichslinks.</p>
        </div>
        <div className="page-actions">
          <Tag tone={reviewDue ? 'warn' : 'good'}>{reviewDue} Prüfungen fällig</Tag>
          <Tag tone={betterOffers ? 'warn' : 'info'}>{betterOffers} Angebote markiert</Tag>
          <Button
            onClick={() => {
              resetForm()
              document.getElementById('contract-form-provider')?.focus()
            }}
          >
            <Plus size={17} />
            Vertrag
          </Button>
        </div>
      </section>

      <Card title={editingContract ? 'Vertrag bearbeiten' : 'Vertrag erfassen'} className="span-2 house-form-card">
        <div className="form-stack">
          <div className="three-column-fields">
            <Field label="Typ">
              <TextInput value={form.kind} onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value }))} />
            </Field>
            <Field label="Anbieter">
              <TextInput
                id="contract-form-provider"
                value={form.provider_name}
                onChange={(event) => setForm((current) => ({ ...current, provider_name: event.target.value }))}
                placeholder="z.B. Versicherung, Stadtwerke"
              />
            </Field>
            <Field label="Tarif / Leistung">
              <TextInput value={form.product_name} onChange={(event) => setForm((current) => ({ ...current, product_name: event.target.value }))} />
            </Field>
          </div>
          <div className="three-column-fields">
            <Field label="Jahreskosten EUR">
              <TextInput inputMode="decimal" value={form.annual_cost_eur} onChange={(event) => setForm((current) => ({ ...current, annual_cost_eur: event.target.value }))} />
            </Field>
            <Field label="Zahlweise">
              <TextInput value={form.billing_cycle} onChange={(event) => setForm((current) => ({ ...current, billing_cycle: event.target.value }))} />
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ServiceContractStatus }))}>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="three-column-fields">
            <Field label="Vertrag bis">
              <TextInput type="date" value={form.contract_until} onChange={(event) => setForm((current) => ({ ...current, contract_until: event.target.value }))} />
            </Field>
            <Field label="Kündigungsfrist">
              <TextInput value={form.cancellation_notice} onChange={(event) => setForm((current) => ({ ...current, cancellation_notice: event.target.value }))} />
            </Field>
            <Field label="Nächste Prüfung">
              <TextInput type="date" value={form.next_review_at} onChange={(event) => setForm((current) => ({ ...current, next_review_at: event.target.value }))} />
            </Field>
          </div>
          <div className="three-column-fields">
            <Field label="Kontakt">
              <TextInput value={form.contact_name} onChange={(event) => setForm((current) => ({ ...current, contact_name: event.target.value }))} />
            </Field>
            <Field label="Telefon">
              <TextInput value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
            </Field>
            <Field label="E-Mail">
              <TextInput type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            </Field>
          </div>
          <div className="three-column-fields">
            <Field label="Webseite">
              <TextInput value={form.website_url} onChange={(event) => setForm((current) => ({ ...current, website_url: event.target.value }))} />
            </Field>
            <Field label="Vergleichslink">
              <TextInput value={form.comparison_url} onChange={(event) => setForm((current) => ({ ...current, comparison_url: event.target.value }))} />
            </Field>
            <Field label="Kundennummer">
              <TextInput value={form.customer_number} onChange={(event) => setForm((current) => ({ ...current, customer_number: event.target.value }))} />
            </Field>
          </div>
          <Field label="Notiz">
            <TextArea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
          </Field>
          {error && <div className="form-error">{error}</div>}
          {feedback && <div className="form-success">{feedback}</div>}
          <div className="action-row">
            <Button onClick={submitContract} disabled={saving}>
              {editingContract ? 'Änderung speichern' : 'Speichern'}
            </Button>
            {editingContract && (
              <Button variant="ghost" onClick={resetForm} disabled={saving}>
                Abbrechen
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card title="Vertragsstatus" className="house-status-card">
        <div className="house-metric-grid">
          <article>
            <Umbrella size={18} />
            <strong>{data.serviceContracts.length}</strong>
            <span>Verträge</span>
          </article>
          <article>
            <WalletCards size={18} />
            <strong>{formatCurrency(annualCosts)}</strong>
            <span>Jahreskosten</span>
          </article>
          <article>
            <CalendarClock size={18} />
            <strong>{reviewDue}</strong>
            <span>fällig / bald fällig</span>
          </article>
          <article>
            <TrendingDown size={18} />
            <strong>{betterOffers}</strong>
            <span>Wechselchance</span>
          </article>
        </div>
      </Card>

      <Card title="Tarifprüfung" className="span-3">
        <div className="compact-list">
          <article>
            <TrendingDown size={20} />
            <strong>Heute nutzbar</strong>
            <span>Prüftermin, Vergleichslink, Kosten und Status pro Vertrag. Treffer werden bewusst als Vorschlag markiert.</span>
            <Tag tone="info">prüfbar</Tag>
          </article>
          <article>
            <ShieldCheck size={20} />
            <strong>Später automatisierbar</strong>
            <span>Eine echte Quartalsprüfung braucht Verbrauchswerte, Vertragsdaten und eine belastbare Vergleichsquelle oder API.</span>
            <Tag tone="warn">kein Fake-Automatismus</Tag>
          </article>
        </div>
      </Card>

      <Card title="Vertragsübersicht" className="span-3">
        <div className="house-toolbar">
          <div className="search-row">
            <Search size={18} />
            <TextInput placeholder="Suche nach Anbieter, Tarif, Kundennummer" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <Select value={kind} onChange={(event) => setKind(event.target.value)}>
            <option value="alle">Alle Typen</option>
            {kinds.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </Select>
        </div>
        {filteredContracts.length ? (
          <div className="house-item-grid">
            {filteredContracts.map((contract) => (
              <article className="contract-card" key={contract.id}>
                <div className="house-item-card-header">
                  <div>
                    <strong>{contract.provider_name}</strong>
                    <span>{contract.kind} · {contract.product_name}</span>
                  </div>
                  <Tag tone={statusTone(contract.status)}>{statusLabels[contract.status]}</Tag>
                </div>
                <div className="house-facts">
                  <span>
                    <WalletCards size={16} />
                    {formatCurrency(contract.annual_cost_eur)} {contract.billing_cycle ? `· ${contract.billing_cycle}` : ''}
                  </span>
                  <span>
                    <CalendarClock size={16} />
                    Prüfung {contract.next_review_at ?? 'offen'}
                  </span>
                  <span>
                    <ShieldCheck size={16} />
                    Laufzeit {contract.contract_until ?? 'offen'}
                  </span>
                  {contract.customer_number && <span>Kundennr. {contract.customer_number}</span>}
                </div>
                {(contract.phone || contract.email || contract.website_url) && (
                  <div className="house-contact-row">
                    {contract.phone && (
                      <a className="text-button" href={`tel:${contract.phone}`}>
                        <Phone size={16} />
                        {contract.phone}
                      </a>
                    )}
                    {contract.email && (
                      <a className="text-button" href={`mailto:${contract.email}`}>
                        <Mail size={16} />
                        E-Mail
                      </a>
                    )}
                    {contract.website_url && (
                      <a className="text-button" href={contract.website_url} target="_blank" rel="noreferrer">
                        <ExternalLink size={16} />
                        Anbieter
                      </a>
                    )}
                  </div>
                )}
                {contract.notes && <p>{contract.notes}</p>}
                <div className="house-card-actions">
                  {contract.comparison_url && (
                    <a className="text-button" href={contract.comparison_url} target="_blank" rel="noreferrer">
                      <TrendingDown size={16} />
                      Vergleich
                    </a>
                  )}
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => {
                      setEditingContract(contract)
                      setForm(toFormState(contract))
                      setFeedback(null)
                    }}
                  >
                    <Pencil size={16} />
                    Bearbeiten
                  </button>
                  <button className="text-button danger-link" type="button" onClick={() => void deleteContract(contract)}>
                    <Trash2 size={16} />
                    Löschen
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Keine Verträge gefunden" body="Lege den ersten Vertrag an oder ändere Suche und Typfilter." />
        )}
      </Card>
    </div>
  )
}
