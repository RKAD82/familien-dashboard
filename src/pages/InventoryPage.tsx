import { useMemo, useState } from 'react'
import { Archive, CalendarClock, ExternalLink, FileText, MapPin, Package, Pencil, Plus, Search, Trash2, Wrench } from 'lucide-react'
import { Button, Card, EmptyState, Field, Select, Tag, TextArea, TextInput } from '../components/ui'
import { useFamilyRoute } from '../routes/context'
import type { InventoryCondition, InventoryItem } from '../types'

type InventoryFormState = {
  title: string
  category: string
  location: string
  purchase_date: string
  warranty_until: string
  value_eur: string
  serial_number: string
  document_url: string
  condition: InventoryCondition
  notes: string
}

const emptyForm: InventoryFormState = {
  title: '',
  category: 'Geräte & Technik',
  location: '',
  purchase_date: '',
  warranty_until: '',
  value_eur: '',
  serial_number: '',
  document_url: '',
  condition: 'ok',
  notes: '',
}

const conditionLabels: Record<InventoryCondition, string> = {
  ok: 'in Ordnung',
  watch: 'beobachten',
  repair: 'reparieren',
  replace: 'ersetzen',
}

const conditionTone = (condition: InventoryCondition) => {
  if (condition === 'ok') return 'good'
  if (condition === 'watch') return 'info'
  return 'warn'
}

const formatCurrency = (value: number | null) =>
  typeof value === 'number'
    ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
    : 'ohne Wert'

const normalizeText = (value: string) => value.trim() || null

const parseEuroValue = (value: string) => {
  if (!value.trim()) return null
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

const toFormState = (item: InventoryItem): InventoryFormState => ({
  title: item.title,
  category: item.category,
  location: item.location,
  purchase_date: item.purchase_date ?? '',
  warranty_until: item.warranty_until ?? '',
  value_eur: item.value_eur === null ? '' : String(item.value_eur),
  serial_number: item.serial_number ?? '',
  document_url: item.document_url ?? '',
  condition: item.condition,
  notes: item.notes ?? '',
})

const isWarrantySoon = (item: InventoryItem) => {
  if (!item.warranty_until) return false
  const today = new Date()
  const warranty = new Date(`${item.warranty_until}T12:00:00`)
  const days = (warranty.getTime() - today.getTime()) / 86_400_000
  return days >= 0 && days <= 120
}

export const InventoryPage = () => {
  const { data, actions } = useFamilyRoute()
  const [form, setForm] = useState<InventoryFormState>(emptyForm)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('alle')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const categories = useMemo(
    () => Array.from(new Set(['Geräte & Technik', 'Möbel & Räume', 'Nachweise', 'Garten', ...data.inventoryItems.map((item) => item.category)])).sort(),
    [data.inventoryItems],
  )

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return data.inventoryItems.filter((item) => {
      const categoryMatches = category === 'alle' || item.category === category
      const textMatches =
        !needle ||
        [item.title, item.category, item.location, item.serial_number, item.notes].some((value) => value?.toLowerCase().includes(needle))
      return categoryMatches && textMatches
    })
  }, [category, data.inventoryItems, query])

  const totalValue = data.inventoryItems.reduce((sum, item) => sum + (item.value_eur ?? 0), 0)
  const warrantySoon = data.inventoryItems.filter(isWarrantySoon).length
  const actionNeeded = data.inventoryItems.filter((item) => item.condition === 'repair' || item.condition === 'replace').length

  const resetForm = () => {
    setForm(emptyForm)
    setEditingItem(null)
    setError(null)
  }

  const submitItem = async () => {
    if (!form.title.trim()) {
      setError('Bitte mindestens einen Namen eintragen.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category.trim() || 'Inventar',
        location: form.location.trim() || 'Haus',
        purchase_date: normalizeText(form.purchase_date),
        warranty_until: normalizeText(form.warranty_until),
        value_eur: parseEuroValue(form.value_eur),
        serial_number: normalizeText(form.serial_number),
        document_url: normalizeText(form.document_url),
        condition: form.condition,
        notes: normalizeText(form.notes),
      }
      if (editingItem) {
        await actions.updateInventoryItem(editingItem, payload)
        setFeedback('Inventareintrag aktualisiert.')
      } else {
        await actions.createInventoryItem(payload)
        setFeedback('Inventareintrag gespeichert.')
      }
      resetForm()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Inventar konnte nicht gespeichert werden.')
    } finally {
      setSaving(false)
    }
  }

  const deleteItem = async (item: InventoryItem) => {
    setSaving(true)
    setError(null)
    try {
      await actions.deleteInventoryItem(item)
      if (editingItem?.id === item.id) resetForm()
      setFeedback('Inventareintrag gelöscht.')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Inventar konnte nicht gelöscht werden.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-grid house-page inventory-page">
      <section className="page-title span-3">
        <div>
          <h1>Inventar</h1>
          <p>Hausinventar mit Standort, Wert, Garantie, Seriennummern, Dokumenten und Zustandsnotizen.</p>
        </div>
        <div className="page-actions">
          <Tag tone="info">{data.inventoryItems.length} Einträge</Tag>
          <Tag tone={warrantySoon ? 'warn' : 'good'}>{warrantySoon} Garantien prüfen</Tag>
          <Button
            onClick={() => {
              resetForm()
              document.getElementById('inventory-form-title')?.focus()
            }}
          >
            <Plus size={17} />
            Gegenstand
          </Button>
        </div>
      </section>

      <Card title={editingItem ? 'Gegenstand bearbeiten' : 'Gegenstand erfassen'} className="span-2 house-form-card">
        <div className="form-stack">
          <div className="two-column-fields">
            <Field label="Name">
              <TextInput
                id="inventory-form-title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="z.B. Waschmaschine, Sofa, Leiter"
              />
            </Field>
            <Field label="Kategorie">
              <TextInput value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} />
            </Field>
          </div>
          <div className="three-column-fields">
            <Field label="Standort">
              <TextInput value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} />
            </Field>
            <Field label="Kaufdatum">
              <TextInput type="date" value={form.purchase_date} onChange={(event) => setForm((current) => ({ ...current, purchase_date: event.target.value }))} />
            </Field>
            <Field label="Garantie bis">
              <TextInput type="date" value={form.warranty_until} onChange={(event) => setForm((current) => ({ ...current, warranty_until: event.target.value }))} />
            </Field>
          </div>
          <div className="three-column-fields">
            <Field label="Wert EUR">
              <TextInput inputMode="decimal" value={form.value_eur} onChange={(event) => setForm((current) => ({ ...current, value_eur: event.target.value }))} />
            </Field>
            <Field label="Seriennummer">
              <TextInput value={form.serial_number} onChange={(event) => setForm((current) => ({ ...current, serial_number: event.target.value }))} />
            </Field>
            <Field label="Zustand">
              <Select value={form.condition} onChange={(event) => setForm((current) => ({ ...current, condition: event.target.value as InventoryCondition }))}>
                {Object.entries(conditionLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Dokument-Link">
            <TextInput value={form.document_url} onChange={(event) => setForm((current) => ({ ...current, document_url: event.target.value }))} placeholder="Link zu Rechnung, Anleitung oder Foto" />
          </Field>
          <Field label="Notiz">
            <TextArea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
          </Field>
          {error && <div className="form-error">{error}</div>}
          {feedback && <div className="form-success">{feedback}</div>}
          <div className="action-row">
            <Button onClick={submitItem} disabled={saving}>
              {editingItem ? 'Änderung speichern' : 'Speichern'}
            </Button>
            {editingItem && (
              <Button variant="ghost" onClick={resetForm} disabled={saving}>
                Abbrechen
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card title="Inventarstatus" className="house-status-card">
        <div className="house-metric-grid">
          <article>
            <Package size={18} />
            <strong>{data.inventoryItems.length}</strong>
            <span>Gegenstände</span>
          </article>
          <article>
            <Archive size={18} />
            <strong>{formatCurrency(totalValue)}</strong>
            <span>erfasster Wert</span>
          </article>
          <article>
            <CalendarClock size={18} />
            <strong>{warrantySoon}</strong>
            <span>Garantie läuft bald</span>
          </article>
          <article>
            <Wrench size={18} />
            <strong>{actionNeeded}</strong>
            <span>Handlungsbedarf</span>
          </article>
        </div>
      </Card>

      <Card title="Inventarliste" className="span-3">
        <div className="house-toolbar">
          <div className="search-row">
            <Search size={18} />
            <TextInput placeholder="Suche nach Name, Standort, Seriennummer" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <Select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="alle">Alle Kategorien</option>
            {categories.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </Select>
        </div>
        {filteredItems.length ? (
          <div className="house-item-grid">
            {filteredItems.map((item) => (
              <article className="inventory-item-card" key={item.id}>
                <div className="house-item-card-header">
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.category}</span>
                  </div>
                  <Tag tone={conditionTone(item.condition)}>{conditionLabels[item.condition]}</Tag>
                </div>
                <div className="house-facts">
                  <span>
                    <MapPin size={16} />
                    {item.location}
                  </span>
                  <span>
                    <Archive size={16} />
                    {formatCurrency(item.value_eur)}
                  </span>
                  <span>
                    <CalendarClock size={16} />
                    {item.warranty_until ? `Garantie bis ${item.warranty_until}` : 'keine Garantie erfasst'}
                  </span>
                  {item.serial_number && (
                    <span>
                      <FileText size={16} />
                      {item.serial_number}
                    </span>
                  )}
                </div>
                {item.notes && <p>{item.notes}</p>}
                <div className="house-card-actions">
                  {item.document_url && (
                    <a className="text-button" href={item.document_url} target="_blank" rel="noreferrer">
                      <ExternalLink size={16} />
                      Dokument
                    </a>
                  )}
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => {
                      setEditingItem(item)
                      setForm(toFormState(item))
                      setFeedback(null)
                    }}
                  >
                    <Pencil size={16} />
                    Bearbeiten
                  </button>
                  <button className="text-button danger-link" type="button" onClick={() => void deleteItem(item)}>
                    <Trash2 size={16} />
                    Löschen
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Kein Inventar gefunden" body="Lege den ersten Gegenstand an oder ändere Suche und Kategorie." />
        )}
      </Card>
    </div>
  )
}
