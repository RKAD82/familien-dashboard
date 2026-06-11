import { useMemo, useState } from 'react'
import { CheckCircle2, FileText, Upload, XCircle } from 'lucide-react'
import { Button, Card, EmptyState, Field, Select, Tag, TextArea } from '../components/ui'
import { useFamilyRoute } from '../routes/context'
import type { ExpenseBillingCycle, ExpenseCategory, ExpenseStatus, InventoryCondition, LinkCollection, ShoppingList } from '../types'

type ImportKind = 'task' | 'event' | 'shopping-list' | 'shopping-item' | 'link' | 'expense' | 'inventory' | 'note' | 'contact' | 'unknown'

type ImportEntry = {
  id: string
  kind: ImportKind
  title: string
  summary: string
  fields: Map<string, string>
  errors: string[]
  warnings: string[]
}

const templateOptions = [
  { id: 'tasks', label: 'Aufgaben', body: `--- EINTRAG ---
Titel (MUSS):
Kategorie:
Beschreibung:
Faelligkeit:
Zustaendig:
Wichtig markieren: nein
Familie benachrichtigen: nein
` },
  { id: 'calendar', label: 'Kalender', body: `--- EINTRAG ---
Datum (MUSS):
Titel (MUSS):
Start:
Ende:
Ganztaegig: nein
Jede Woche an diesem Wochentag anzeigen: nein
Kategorie:
Ort:
Zustaendig:
Bringt:
Holt:
Notiz:
Wichtig markieren: nein
Familie benachrichtigen: nein
` },
  { id: 'shopping', label: 'Einkauf', body: `Neue Einkaufsliste oder Vorlage

--- EINTRAG ---
Neue Liste/Vorlage (MUSS):
Typ:
Als Vorlage speichern: nein

Artikel fuer eine Einkaufsliste

--- EINTRAG ---
Einkaufsliste (MUSS):
Artikel (MUSS):
Menge:
Einheit:
Kategorie:
Bereich:
` },
  { id: 'links', label: 'Links', body: `--- EINTRAG ---
Sammlung (MUSS):
Titel (MUSS):
Adresse (MUSS):
Beschreibung:
Als Favorit anzeigen: ja
` },
  { id: 'expenses', label: 'Ausgaben', body: `--- EINTRAG ---
Bereich (MUSS):
Jahr (MUSS):
Status: aktiv
Bezeichnung (MUSS):
Anbieter:
Betrag EUR:
Rhythmus:
Zahlt von:
Abrechnungsnotiz:
Naechste Pruefung:
Vertrag bis:
Kuendigungsfrist:
Kontakt:
Telefon:
E-Mail:
Webseite:
Kundennummer:
Vergleichslink:
Notiz:
` },
  { id: 'inventory', label: 'Inventar', body: `--- EINTRAG ---
Name (MUSS):
Kategorie:
Standort:
Kaufdatum:
Garantie bis:
Wert EUR:
Seriennummer:
Zustand:
Dokument-Link:
Notiz:
` },
  { id: 'notes', label: 'Notizen', body: `--- EINTRAG ---
Titel (MUSS):
Inhalt (MUSS):
Kategorie:
Sichtbarkeit:
Wichtig markieren: nein
Familie benachrichtigen: nein
` },
  { id: 'contacts', label: 'Kontakte', body: `--- EINTRAG ---
Name (MUSS):
Bezug:
Telefon:
Handy:
E-Mail:
Adresse:
Bemerkungen:
Als wichtigen Kontakt markieren: nein
` },
]

const defaultText = templateOptions.map((template) => template.body).join('\n')

const kindLabels: Record<ImportKind, string> = {
  task: 'Aufgabe',
  event: 'Termin',
  'shopping-list': 'Einkaufsliste',
  'shopping-item': 'Einkaufsartikel',
  link: 'Link',
  expense: 'Ausgabe',
  inventory: 'Inventar',
  note: 'Notiz',
  contact: 'Kontakt',
  unknown: 'Unbekannt',
}

const normalizeKey = (value: string) =>
  value
    .replace(/\(MUSS\)/gi, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const normalizeLookup = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')

const getField = (fields: Map<string, string>, keys: string[]) => {
  for (const key of keys) {
    const value = fields.get(normalizeKey(key))
    if (value !== undefined) return value.trim()
  }
  return ''
}

const hasField = (fields: Map<string, string>, keys: string[]) => keys.some((key) => fields.has(normalizeKey(key)))

const normalizeUrl = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

const parseBool = (value: string, fallback = false) => {
  const normalized = normalizeLookup(value)
  if (!normalized) return fallback
  return ['ja', 'yes', 'true', '1', 'x', 'wahr'].includes(normalized)
}

const parseEuroValue = (value: string) => {
  const trimmed = value.trim().replace(/\s/g, '').replace(/€/g, '')
  if (!trimmed) return null
  const normalized = trimmed.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const parseYearValue = (value: string) => {
  const parsed = Number(value.trim())
  return Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2100 ? parsed : new Date().getFullYear()
}

const parseDateValue = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const germanDate = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (!germanDate) return null
  const [, day, month, year] = germanDate
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

const parseLocalDateTime = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsedDate = parseDateValue(trimmed)
  if (parsedDate) return new Date(`${parsedDate}T09:00`).toISOString()
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(trimmed)) return new Date(trimmed.replace(' ', 'T')).toISOString()
  return null
}

const combineDateAndTime = (date: string, time: string, fallbackTime: string) => {
  const normalizedDate = parseDateValue(date)
  if (!normalizedDate) return null
  const normalizedTime = /^\d{2}:\d{2}$/.test(time.trim()) ? time.trim() : fallbackTime
  if (!normalizedTime) return null
  return new Date(`${normalizedDate}T${normalizedTime}`).toISOString()
}

const parseBillingCycle = (value: string): ExpenseBillingCycle => {
  const normalized = normalizeLookup(value)
  if (normalized.includes('monat')) return 'monthly'
  if (normalized.includes('quart')) return 'quarterly'
  if (normalized.includes('einmal')) return 'one_time'
  if (normalized.includes('jahr') || normalized.includes('jaehr')) return 'yearly'
  return 'unknown'
}

const parseExpenseStatus = (value: string): ExpenseStatus => {
  const normalized = normalizeLookup(value)
  if (normalized.includes('besser')) return 'better_offer'
  if (normalized.includes('pruef')) return 'review'
  if (normalized.includes('kuend')) return 'cancelled'
  if (normalized.includes('paus')) return 'paused'
  return 'active'
}

const parseCondition = (value: string): InventoryCondition => {
  const normalized = normalizeLookup(value)
  if (normalized.includes('repar')) return 'repair'
  if (normalized.includes('ersetz')) return 'replace'
  if (normalized.includes('beob') || normalized.includes('pruef')) return 'watch'
  return 'ok'
}

const parseVisibility = (value: string): 'family' | 'adults' | 'private' => {
  const normalized = normalizeLookup(value)
  if (normalized.includes('erwachsen')) return 'adults'
  if (normalized.includes('privat')) return 'private'
  return 'family'
}

const detectKind = (fields: Map<string, string>): ImportKind => {
  if (hasField(fields, ['Neue Liste/Vorlage'])) return 'shopping-list'
  if (hasField(fields, ['Einkaufsliste']) && hasField(fields, ['Artikel'])) return 'shopping-item'
  if (hasField(fields, ['Datum']) && hasField(fields, ['Titel']) && (hasField(fields, ['Start']) || hasField(fields, ['Ganztaegig']))) return 'event'
  if (hasField(fields, ['Sammlung']) && hasField(fields, ['Adresse'])) return 'link'
  if (hasField(fields, ['Bereich']) && hasField(fields, ['Bezeichnung'])) return 'expense'
  if (hasField(fields, ['Titel']) && hasField(fields, ['Inhalt'])) return 'note'
  if (hasField(fields, ['Name']) && (hasField(fields, ['Bezug']) || hasField(fields, ['Handy']) || hasField(fields, ['Telefon']))) return 'contact'
  if (
    hasField(fields, ['Name']) &&
    (hasField(fields, ['Kategorie']) || hasField(fields, ['Standort']) || hasField(fields, ['Seriennummer']) || hasField(fields, ['Kaufdatum']))
  ) {
    return 'inventory'
  }
  if (hasField(fields, ['Titel']) && (hasField(fields, ['Faelligkeit']) || hasField(fields, ['Beschreibung']) || hasField(fields, ['Kategorie']))) {
    return 'task'
  }
  return 'unknown'
}

const parseBlocks = (text: string): ImportEntry[] => {
  const blocks = text
    .split(/---\s*EINTRAG\s*---/i)
    .map((block) => block.trim())
    .filter(Boolean)

  return blocks.map((block, index) => {
    const fields = new Map<string, string>()
    let activeKey = ''
    for (const line of block.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const separator = trimmed.indexOf(':')
      if (separator > -1) {
        const key = normalizeKey(trimmed.slice(0, separator))
        const value = trimmed.slice(separator + 1).trim()
        if (key) {
          fields.set(key, value)
          activeKey = key
        }
      } else if (activeKey) {
        fields.set(activeKey, `${fields.get(activeKey) ?? ''}\n${trimmed}`.trim())
      }
    }

    const kind = detectKind(fields)
    const title =
      getField(fields, ['Titel', 'Bezeichnung', 'Artikel', 'Name', 'Neue Liste/Vorlage']) ||
      `${kindLabels[kind]} ${index + 1}`
    const entry: ImportEntry = {
      id: `preview-${index}`,
      kind,
      title,
      summary: '',
      fields,
      errors: [],
      warnings: [],
    }

    if (kind === 'unknown') entry.errors.push('Eintragstyp nicht erkannt.')
    validateEntry(entry)
    return entry
  })
}

const requireField = (entry: ImportEntry, label: string, keys: string[]) => {
  if (!getField(entry.fields, keys)) entry.errors.push(`${label} fehlt.`)
}

const validateEntry = (entry: ImportEntry) => {
  if (entry.kind === 'task') {
    requireField(entry, 'Titel', ['Titel'])
    entry.summary = getField(entry.fields, ['Kategorie']) || 'Aufgabe'
  }
  if (entry.kind === 'event') {
    requireField(entry, 'Datum', ['Datum'])
    requireField(entry, 'Titel', ['Titel'])
    entry.summary = getField(entry.fields, ['Datum'])
  }
  if (entry.kind === 'shopping-list') {
    requireField(entry, 'Neue Liste/Vorlage', ['Neue Liste/Vorlage'])
    entry.summary = parseBool(getField(entry.fields, ['Als Vorlage speichern'])) ? 'Vorlage' : 'Liste'
  }
  if (entry.kind === 'shopping-item') {
    requireField(entry, 'Einkaufsliste', ['Einkaufsliste'])
    requireField(entry, 'Artikel', ['Artikel'])
    entry.summary = getField(entry.fields, ['Einkaufsliste'])
  }
  if (entry.kind === 'link') {
    requireField(entry, 'Sammlung', ['Sammlung'])
    requireField(entry, 'Titel', ['Titel'])
    requireField(entry, 'Adresse', ['Adresse'])
    entry.summary = getField(entry.fields, ['Sammlung'])
  }
  if (entry.kind === 'expense') {
    requireField(entry, 'Bereich', ['Bereich'])
    requireField(entry, 'Jahr', ['Jahr'])
    requireField(entry, 'Bezeichnung', ['Bezeichnung'])
    entry.summary = `${getField(entry.fields, ['Bereich'])} ${getField(entry.fields, ['Jahr'])}`
  }
  if (entry.kind === 'inventory') {
    requireField(entry, 'Name', ['Name'])
    entry.summary = getField(entry.fields, ['Kategorie']) || 'Inventar'
  }
  if (entry.kind === 'note') {
    requireField(entry, 'Titel', ['Titel'])
    requireField(entry, 'Inhalt', ['Inhalt'])
    entry.summary = getField(entry.fields, ['Kategorie']) || 'Notiz'
  }
  if (entry.kind === 'contact') {
    requireField(entry, 'Name', ['Name'])
    entry.summary = getField(entry.fields, ['Bezug']) || 'Kontakt'
  }
}

const categoryColors = ['#5f766e', '#4e6d9a', '#8a6b47', '#6d5d90', '#8a5d71', '#69737a']

const slugFor = (value: string) =>
  normalizeLookup(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'ausgaben'

export const ImportPage = () => {
  const { data, actions } = useFamilyRoute()
  const [inputText, setInputText] = useState(defaultText)
  const [selectedTemplate, setSelectedTemplate] = useState(templateOptions[0].id)
  const [preview, setPreview] = useState<ImportEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const memberByName = useMemo(
    () => new Map(data.memberships.map((member) => [normalizeLookup(member.display_name), member.id])),
    [data.memberships],
  )

  const validEntries = preview.filter((entry) => !entry.errors.length)
  const errorEntries = preview.filter((entry) => entry.errors.length)

  const buildPreview = () => {
    const entries = parseBlocks(inputText)
    setPreview(entries)
    setResult(null)
    setError(entries.length ? null : 'Keine Einträge erkannt. Bitte die Vorlage mit --- EINTRAG --- verwenden.')
  }

  const readFile = async (file: File | null) => {
    if (!file) return
    setInputText(await file.text())
    setPreview([])
    setResult(`Datei "${file.name}" geladen. Bitte Vorschau erstellen.`)
  }

  const memberIdFor = (name: string, entry: ImportEntry) => {
    if (!name.trim()) return null
    const id = memberByName.get(normalizeLookup(name))
    if (!id) entry.warnings.push(`Person "${name}" nicht gefunden, Feld bleibt leer.`)
    return id ?? null
  }

  const ensureShoppingList = async (title: string, lists: Map<string, ShoppingList>, asTemplate = false) => {
    const key = normalizeLookup(title)
    const existing = lists.get(key)
    if (existing) return existing
    const created = await actions.createShoppingList({ title, store_type: 'import', is_template: asTemplate })
    lists.set(key, created)
    return created
  }

  const ensureLinkCollection = async (title: string, collections: Map<string, LinkCollection>) => {
    const key = normalizeLookup(title)
    const existing = collections.get(key)
    if (existing) return existing
    const created = await actions.createLinkCollection({ title, sort_order: collections.size + 1 })
    collections.set(key, created)
    return created
  }

  const ensureExpenseCategory = async (title: string, categories: Map<string, ExpenseCategory>) => {
    const key = normalizeLookup(title)
    const existing = categories.get(key)
    if (existing) return existing
    const created = await actions.createExpenseCategory({
      title,
      slug: slugFor(title),
      color: categoryColors[categories.size % categoryColors.length],
      icon: 'folder',
      sort_order: (categories.size + 1) * 10,
      active: true,
    })
    categories.set(key, created)
    return created
  }

  const importEntries = async () => {
    if (!validEntries.length) return
    setSaving(true)
    setError(null)
    setResult(null)
    let imported = 0
    const failures: string[] = []
    const shoppingLists = new Map(data.shoppingLists.map((list) => [normalizeLookup(list.title), list]))
    const linkCollections = new Map(data.linkCollections.map((collection) => [normalizeLookup(collection.title), collection]))
    const expenseCategories = new Map(data.expenseCategories.map((category) => [normalizeLookup(category.title), category]))

    for (const entry of validEntries) {
      try {
        if (entry.kind === 'task') {
          await actions.createTask({
            title: getField(entry.fields, ['Titel']),
            description: getField(entry.fields, ['Beschreibung']) || null,
            due_at: parseLocalDateTime(getField(entry.fields, ['Faelligkeit'])),
            assignee_membership_id: memberIdFor(getField(entry.fields, ['Zustaendig']), entry),
            category: getField(entry.fields, ['Kategorie']) || 'Familie',
            is_important: parseBool(getField(entry.fields, ['Wichtig markieren'])),
            notify_family: parseBool(getField(entry.fields, ['Familie benachrichtigen'])),
          })
        }
        if (entry.kind === 'event') {
          const date = getField(entry.fields, ['Datum'])
          const startsAt = combineDateAndTime(date, getField(entry.fields, ['Start']), '09:00')
          if (!startsAt) throw new Error('Datum ist nicht im Format JJJJ-MM-TT.')
          await actions.createEvent({
            title: getField(entry.fields, ['Titel']),
            starts_at: startsAt,
            ends_at: parseBool(getField(entry.fields, ['Ganztaegig']))
              ? null
              : combineDateAndTime(date, getField(entry.fields, ['Ende']), ''),
            all_day: parseBool(getField(entry.fields, ['Ganztaegig'])),
            recurrence_rule: parseBool(getField(entry.fields, ['Jede Woche an diesem Wochentag anzeigen'])) ? 'FREQ=WEEKLY' : null,
            assignee_membership_id: memberIdFor(getField(entry.fields, ['Zustaendig']), entry),
            bring_membership_id: memberIdFor(getField(entry.fields, ['Bringt']), entry),
            pickup_membership_id: memberIdFor(getField(entry.fields, ['Holt']), entry),
            category: getField(entry.fields, ['Kategorie']) || 'Familie',
            location: getField(entry.fields, ['Ort']) || null,
            notes: getField(entry.fields, ['Notiz']) || null,
            is_important: parseBool(getField(entry.fields, ['Wichtig markieren'])),
            notify_family: parseBool(getField(entry.fields, ['Familie benachrichtigen'])),
          })
        }
        if (entry.kind === 'shopping-list') {
          await ensureShoppingList(
            getField(entry.fields, ['Neue Liste/Vorlage']),
            shoppingLists,
            parseBool(getField(entry.fields, ['Als Vorlage speichern'])),
          )
        }
        if (entry.kind === 'shopping-item') {
          const list = await ensureShoppingList(getField(entry.fields, ['Einkaufsliste']), shoppingLists)
          const area = getField(entry.fields, ['Bereich'])
          await actions.addShoppingItem(list.id, {
            title: getField(entry.fields, ['Artikel']),
            quantity: getField(entry.fields, ['Menge']) || null,
            unit: getField(entry.fields, ['Einheit']) || null,
            category: getField(entry.fields, ['Kategorie']) || null,
            source_label: area || null,
          })
        }
        if (entry.kind === 'link') {
          const collection = await ensureLinkCollection(getField(entry.fields, ['Sammlung']), linkCollections)
          await actions.createLink({
            collection_id: collection.id,
            title: getField(entry.fields, ['Titel']),
            url: normalizeUrl(getField(entry.fields, ['Adresse'])),
            description: getField(entry.fields, ['Beschreibung']) || null,
            favorite: parseBool(getField(entry.fields, ['Als Favorit anzeigen']), true),
            is_important: false,
            notify_family: false,
          })
        }
        if (entry.kind === 'expense') {
          const category = await ensureExpenseCategory(getField(entry.fields, ['Bereich']), expenseCategories)
          await actions.createExpense({
            category_id: category.id,
            title: getField(entry.fields, ['Bezeichnung']),
            provider_name: getField(entry.fields, ['Anbieter']) || null,
            amount_eur: parseEuroValue(getField(entry.fields, ['Betrag EUR'])),
            billing_cycle: parseBillingCycle(getField(entry.fields, ['Rhythmus'])),
            billing_note: getField(entry.fields, ['Abrechnungsnotiz']) || getField(entry.fields, ['Rhythmus']) || null,
            expense_year: parseYearValue(getField(entry.fields, ['Jahr'])),
            paid_from: getField(entry.fields, ['Zahlt von']) || null,
            contract_until: parseDateValue(getField(entry.fields, ['Vertrag bis'])),
            cancellation_notice: getField(entry.fields, ['Kuendigungsfrist']) || null,
            next_review_at: parseDateValue(getField(entry.fields, ['Naechste Pruefung'])),
            contact_name: getField(entry.fields, ['Kontakt']) || null,
            phone: getField(entry.fields, ['Telefon']) || null,
            email: getField(entry.fields, ['E-Mail']) || null,
            website_url: normalizeUrl(getField(entry.fields, ['Webseite'])) || null,
            customer_number: getField(entry.fields, ['Kundennummer']) || null,
            comparison_url: normalizeUrl(getField(entry.fields, ['Vergleichslink'])) || null,
            status: parseExpenseStatus(getField(entry.fields, ['Status'])),
            notes: getField(entry.fields, ['Notiz']) || null,
          })
        }
        if (entry.kind === 'inventory') {
          await actions.createInventoryItem({
            title: getField(entry.fields, ['Name']),
            category: getField(entry.fields, ['Kategorie']) || 'Inventar',
            location: getField(entry.fields, ['Standort']) || 'Haus',
            purchase_date: parseDateValue(getField(entry.fields, ['Kaufdatum'])),
            warranty_until: parseDateValue(getField(entry.fields, ['Garantie bis'])),
            value_eur: parseEuroValue(getField(entry.fields, ['Wert EUR'])),
            serial_number: getField(entry.fields, ['Seriennummer']) || null,
            document_url: normalizeUrl(getField(entry.fields, ['Dokument-Link'])) || null,
            condition: parseCondition(getField(entry.fields, ['Zustand'])),
            notes: getField(entry.fields, ['Notiz']) || null,
          })
        }
        if (entry.kind === 'note') {
          await actions.createNote({
            title: getField(entry.fields, ['Titel']),
            body: getField(entry.fields, ['Inhalt']),
            category: getField(entry.fields, ['Kategorie']) || 'Familie',
            visibility: parseVisibility(getField(entry.fields, ['Sichtbarkeit'])),
            is_important: parseBool(getField(entry.fields, ['Wichtig markieren'])),
            notify_family: parseBool(getField(entry.fields, ['Familie benachrichtigen'])),
          })
        }
        if (entry.kind === 'contact') {
          await actions.createFamilyContact({
            name: getField(entry.fields, ['Name']),
            relation: getField(entry.fields, ['Bezug']) || null,
            phone: getField(entry.fields, ['Telefon']) || null,
            mobile: getField(entry.fields, ['Handy']) || null,
            email: getField(entry.fields, ['E-Mail']) || null,
            address: getField(entry.fields, ['Adresse']) || null,
            notes: getField(entry.fields, ['Bemerkungen']) || null,
            favorite: parseBool(getField(entry.fields, ['Als wichtigen Kontakt markieren'])),
          })
        }
        imported += 1
      } catch (importError) {
        failures.push(`${entry.title}: ${importError instanceof Error ? importError.message : 'Import fehlgeschlagen'}`)
      }
    }

    setSaving(false)
    if (failures.length) {
      setError(`${failures.length} Einträge konnten nicht importiert werden: ${failures.join(' | ')}`)
    }
    setResult(`${imported} Einträge importiert.${errorEntries.length ? ` ${errorEntries.length} fehlerhafte Einträge wurden übersprungen.` : ''}`)
    if (imported) {
      await actions.refresh()
    }
  }

  const selectedTemplateBody = templateOptions.find((template) => template.id === selectedTemplate)?.body ?? ''

  return (
    <div className="page-grid import-page">
      <section className="page-title span-3">
        <div>
          <h1>Import</h1>
          <p>TXT- oder Markdown-Dateien nach einem einfachen Feldschema einlesen, prüfen und erst dann als echte Einträge speichern.</p>
        </div>
        <div className="page-actions">
          <Tag tone="info">{preview.length} erkannt</Tag>
          <Tag tone={errorEntries.length ? 'warn' : 'good'}>{errorEntries.length} fehlerhaft</Tag>
          <Tag tone="good">{validEntries.length} importierbar</Tag>
        </div>
      </section>

      <Card title="Quelle" className="span-2 import-source-card">
        <div className="form-stack">
          <Field label="TXT/Markdown-Datei">
            <input
              className="input"
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              onChange={(event) => void readFile(event.target.files?.[0] ?? null)}
            />
          </Field>
          <div className="two-column-fields">
            <Field label="Vorlage">
              <Select value={selectedTemplate} onChange={(event) => setSelectedTemplate(event.target.value)}>
                {templateOptions.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Aktion">
              <Button variant="secondary" onClick={() => setInputText(selectedTemplateBody)}>
                <FileText size={17} />
                Vorlage einsetzen
              </Button>
            </Field>
          </div>
          <Field label="Importtext">
            <TextArea value={inputText} onChange={(event) => setInputText(event.target.value)} />
          </Field>
          <div className="action-row">
            <Button onClick={buildPreview}>
              <Upload size={18} />
              Vorschau erstellen
            </Button>
            <Button variant="secondary" onClick={importEntries} disabled={!validEntries.length || saving}>
              <CheckCircle2 size={18} />
              Import bestätigen
            </Button>
          </div>
          {result && <div className="form-success">{result}</div>}
          {error && <div className="form-error">{error}</div>}
        </div>
      </Card>

      <Card title="Regeln" className="import-rules-card">
        <div className="compact-list">
          <article>
            <FileText size={18} />
            <strong>Ein Block pro Eintrag</strong>
            <span>Jeder Datensatz beginnt mit --- EINTRAG --- und nutzt Feldname: Wert.</span>
          </article>
          <article>
            <CheckCircle2 size={18} />
            <strong>Pflichtfelder</strong>
            <span>Felder mit (MUSS) müssen gefüllt sein. Leere optionale Felder bleiben einfach leer.</span>
          </article>
          <article>
            <XCircle size={18} />
            <strong>Keine Blindübernahme</strong>
            <span>Fehlerhafte Blöcke werden angezeigt und beim Import übersprungen.</span>
          </article>
        </div>
      </Card>

      <Card title="Vorschau" className="span-3">
        {preview.length ? (
          <div className="import-preview-list">
            {preview.map((entry) => (
              <article className={entry.errors.length ? 'has-errors' : ''} key={entry.id}>
                <div>
                  <strong>{entry.title}</strong>
                  <span>
                    {kindLabels[entry.kind]} {entry.summary ? `· ${entry.summary}` : ''}
                  </span>
                </div>
                <Tag tone={entry.errors.length ? 'warn' : 'good'}>{entry.errors.length ? 'prüfen' : 'bereit'}</Tag>
                {(entry.errors.length > 0 || entry.warnings.length > 0) && (
                  <p>{[...entry.errors, ...entry.warnings].join(' ')}</p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Noch keine Vorschau" body="Lade eine Datei oder füge Text ein und erstelle danach die Vorschau." />
        )}
      </Card>
    </div>
  )
}
