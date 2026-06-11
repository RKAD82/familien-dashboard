import { useMemo, useState, type CSSProperties } from 'react'
import {
  CalendarClock,
  Car,
  Copy,
  ExternalLink,
  FileText,
  Folder,
  FolderPlus,
  Home,
  Mail,
  Pencil,
  Phone,
  Plus,
  Repeat,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  WalletCards,
} from 'lucide-react'
import { Button, Card, EmptyState, Field, Select, Tag, TextArea, TextInput } from '../components/ui'
import { useFamilyRoute, type ExpenseInput } from '../routes/context'
import type { ExpenseBillingCycle, ExpenseCategory, ExpenseItem, ExpenseStatus } from '../types'

type ExpenseFormState = {
  category_id: string
  title: string
  provider_name: string
  amount_eur: string
  billing_cycle: ExpenseBillingCycle
  billing_note: string
  expense_year: string
  paid_from: string
  contract_until: string
  cancellation_notice: string
  next_review_at: string
  contact_name: string
  phone: string
  email: string
  website_url: string
  customer_number: string
  comparison_url: string
  status: ExpenseStatus
  notes: string
}

type ParsedExpense = Omit<ExpenseInput, 'category_id'> & { categoryTitle: string }

const currentYear = new Date().getFullYear()

const emptyForm = (categoryId = ''): ExpenseFormState => ({
  category_id: categoryId,
  title: '',
  provider_name: '',
  amount_eur: '',
  billing_cycle: 'yearly',
  billing_note: '',
  expense_year: String(currentYear),
  paid_from: '',
  contract_until: '',
  cancellation_notice: '',
  next_review_at: '',
  contact_name: '',
  phone: '',
  email: '',
  website_url: '',
  customer_number: '',
  comparison_url: '',
  status: 'active',
  notes: '',
})

const billingLabels: Record<ExpenseBillingCycle, string> = {
  monthly: 'monatlich',
  quarterly: 'quartalsweise',
  yearly: 'jährlich',
  one_time: 'einmalig',
  unknown: 'offen',
}

const statusLabels: Record<ExpenseStatus, string> = {
  active: 'aktiv',
  review: 'prüfen',
  better_offer: 'besseres Angebot',
  cancelled: 'gekündigt',
  paused: 'pausiert',
}

const categoryIconMap = {
  home: Home,
  shield: ShieldCheck,
  repeat: Repeat,
  car: Car,
  sparkles: Sparkles,
  folder: Folder,
}

const categoryColors = ['#5f766e', '#4e6d9a', '#8a6b47', '#6d5d90', '#8a5d71', '#69737a']

const markdownTemplate = `# Ausgaben 2026

## Haushalt
| Titel | Anbieter | Betrag EUR | Rhythmus | Jahr | Status | Prüfung | Vertrag bis | Kontakt | Telefon | E-Mail | Kundennummer | Webseite | Vergleich | Notiz |
| Strom | Stadtwerke | 1420 | jährlich | 2026 | aktiv | 2026-09-01 | 2026-12-31 | Kundenservice | | service@example.de | | https://anbieter.de | https://vergleich.de | Verbrauch vor Vergleich aktualisieren |

## Versicherungen
| Titel | Anbieter | Betrag EUR | Rhythmus | Jahr | Status | Prüfung | Vertrag bis | Kontakt | Telefon | E-Mail | Kundennummer | Webseite | Vergleich | Notiz |
| Wohngebäude | Muster Versicherung | 684 | jährlich | 2026 | prüfen | 2026-09-30 | 2027-12-31 | Service | 0221 000000 | | DEMO-12345 | https://anbieter.de | https://check24.de | Leistungsumfang prüfen |

## Abos
| Titel | Anbieter | Betrag EUR | Rhythmus | Jahr | Status | Prüfung | Vertrag bis | Kontakt | Telefon | E-Mail | Kundennummer | Webseite | Vergleich | Notiz |
| Familien-Streaming | Streamingdienst | 14,99 | monatlich | 2026 | aktiv | 2026-12-01 | | | | support@example.de | | https://anbieter.de | | Nutzung prüfen |
`

const normalizeText = (value: string) => value.trim() || null

const normalizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'ausgaben'

const normalizeHeader = (value: string) =>
  normalizeSlug(value)
    .replace(/-eur$/, '')
    .replace(/^e-mail$/, 'email')
    .replace(/^prufung$/, 'pruefung')

const parseEuroValue = (value: string) => {
  const trimmed = value.trim().replace(/\s/g, '').replace(/€/g, '')
  if (!trimmed) return null
  const normalized = trimmed.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const parseYearValue = (value: string, fallback: number) => {
  const parsed = Number(value.trim())
  return Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2100 ? parsed : fallback
}

const formatCurrency = (value: number | null) =>
  typeof value === 'number'
    ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
    : 'offen'

const formatCurrencyPrecise = (value: number | null) =>
  typeof value === 'number'
    ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(value)
    : 'offen'

const annualizedAmount = (expense: ExpenseItem) => {
  if (expense.amount_eur === null) return 0
  if (expense.billing_cycle === 'monthly') return expense.amount_eur * 12
  if (expense.billing_cycle === 'quarterly') return expense.amount_eur * 4
  return expense.amount_eur
}

const statusTone = (status: ExpenseStatus) => {
  if (status === 'active') return 'good'
  if (status === 'better_offer' || status === 'review') return 'warn'
  if (status === 'cancelled' || status === 'paused') return 'neutral'
  return 'info'
}

const parseBillingCycle = (value: string): ExpenseBillingCycle => {
  const normalized = value.toLowerCase()
  if (normalized.includes('monat')) return 'monthly'
  if (normalized.includes('quart')) return 'quarterly'
  if (normalized.includes('einmal')) return 'one_time'
  if (normalized.includes('jahr') || normalized.includes('jähr')) return 'yearly'
  return 'unknown'
}

const parseStatus = (value: string): ExpenseStatus => {
  const normalized = value.toLowerCase()
  if (normalized.includes('besser')) return 'better_offer'
  if (normalized.includes('prüf') || normalized.includes('pruef')) return 'review'
  if (normalized.includes('künd') || normalized.includes('kuend')) return 'cancelled'
  if (normalized.includes('paus')) return 'paused'
  return 'active'
}

const splitMarkdownRow = (line: string) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())

const parseExpenseMarkdown = (markdown: string, fallbackYear: number): ParsedExpense[] => {
  const lines = markdown.split(/\r?\n/)
  const parsed: ParsedExpense[] = []
  let activeYear = fallbackYear
  let activeCategory = ''
  let headers: string[] = []

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    const yearMatch = line.match(/^#\s*Ausgaben\s+(\d{4})/i)
    if (yearMatch?.[1]) {
      activeYear = Number(yearMatch[1])
      headers = []
      continue
    }

    const categoryMatch = line.match(/^##\s+(.+)/)
    if (categoryMatch?.[1]) {
      activeCategory = categoryMatch[1].trim()
      headers = []
      continue
    }

    if (!line.startsWith('|') || !activeCategory) continue
    const cells = splitMarkdownRow(line)
    if (!cells.length || cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue

    const normalizedCells = cells.map(normalizeHeader)
    if (normalizedCells.includes('titel')) {
      headers = normalizedCells
      continue
    }
    if (!headers.length) continue

    const row = new Map(headers.map((header, index) => [header, cells[index] ?? '']))
    const title = row.get('titel')?.trim() ?? ''
    if (!title) continue

    const rowYear = parseYearValue(row.get('jahr') ?? '', activeYear)
    const billingText = row.get('rhythmus') ?? ''
    parsed.push({
      categoryTitle: activeCategory,
      title,
      provider_name: normalizeText(row.get('anbieter') ?? ''),
      amount_eur: parseEuroValue(row.get('betrag') ?? row.get('betrag-eur') ?? ''),
      billing_cycle: parseBillingCycle(billingText),
      billing_note: normalizeText(billingText),
      expense_year: rowYear,
      paid_from: null,
      contract_until: normalizeText(row.get('vertrag-bis') ?? ''),
      cancellation_notice: null,
      next_review_at: normalizeText(row.get('pruefung') ?? ''),
      contact_name: normalizeText(row.get('kontakt') ?? ''),
      phone: normalizeText(row.get('telefon') ?? ''),
      email: normalizeText(row.get('email') ?? ''),
      website_url: normalizeText(row.get('webseite') ?? ''),
      customer_number: normalizeText(row.get('kundennummer') ?? ''),
      comparison_url: normalizeText(row.get('vergleich') ?? ''),
      status: parseStatus(row.get('status') ?? ''),
      notes: normalizeText(row.get('notiz') ?? ''),
    })
  }

  return parsed
}

const toFormState = (expense: ExpenseItem): ExpenseFormState => ({
  category_id: expense.category_id,
  title: expense.title,
  provider_name: expense.provider_name ?? '',
  amount_eur: expense.amount_eur === null ? '' : String(expense.amount_eur),
  billing_cycle: expense.billing_cycle,
  billing_note: expense.billing_note ?? '',
  expense_year: String(expense.expense_year),
  paid_from: expense.paid_from ?? '',
  contract_until: expense.contract_until ?? '',
  cancellation_notice: expense.cancellation_notice ?? '',
  next_review_at: expense.next_review_at ?? '',
  contact_name: expense.contact_name ?? '',
  phone: expense.phone ?? '',
  email: expense.email ?? '',
  website_url: expense.website_url ?? '',
  customer_number: expense.customer_number ?? '',
  comparison_url: expense.comparison_url ?? '',
  status: expense.status,
  notes: expense.notes ?? '',
})

const isReviewDue = (expense: ExpenseItem) => {
  if (!expense.next_review_at || expense.status === 'cancelled') return false
  const today = new Date()
  const review = new Date(`${expense.next_review_at}T12:00:00`)
  const days = (review.getTime() - today.getTime()) / 86_400_000
  return days <= 60
}

const iconForCategory = (category: ExpenseCategory) => categoryIconMap[category.icon as keyof typeof categoryIconMap] ?? Folder

export const ExpensesPage = () => {
  const { data, actions } = useFamilyRoute()
  const categories = useMemo(
    () => data.expenseCategories.filter((category) => category.active).sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title)),
    [data.expenseCategories],
  )
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all')
  const fallbackCategoryId = activeCategoryId !== 'all' ? activeCategoryId : categories[0]?.id ?? ''
  const [form, setForm] = useState<ExpenseFormState>(() => emptyForm(fallbackCategoryId))
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null)
  const [selectedYear, setSelectedYear] = useState(String(currentYear))
  const [query, setQuery] = useState('')
  const [newCategoryTitle, setNewCategoryTitle] = useState('')
  const [importText, setImportText] = useState(markdownTemplate)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories])
  const yearOptions = useMemo(() => {
    const years = new Set([currentYear, currentYear + 1, ...data.expenses.map((expense) => expense.expense_year)])
    return Array.from(years).sort((a, b) => b - a)
  }, [data.expenses])

  const filteredExpenses = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return data.expenses.filter((expense) => {
      const categoryMatches = activeCategoryId === 'all' || expense.category_id === activeCategoryId
      const yearMatches = selectedYear === 'all' || expense.expense_year === Number(selectedYear)
      const textMatches =
        !needle ||
        [
          expense.title,
          expense.provider_name,
          expense.customer_number,
          expense.contact_name,
          expense.notes,
          categoryById.get(expense.category_id)?.title,
        ].some((value) => value?.toLowerCase().includes(needle))
      return categoryMatches && yearMatches && textMatches
    })
  }, [activeCategoryId, categoryById, data.expenses, query, selectedYear])

  const visibleAnnualCosts = filteredExpenses.reduce((sum, expense) => sum + annualizedAmount(expense), 0)
  const allSelectedYearExpenses = data.expenses.filter((expense) => selectedYear === 'all' || expense.expense_year === Number(selectedYear))
  const selectedYearCosts = allSelectedYearExpenses.reduce((sum, expense) => sum + annualizedAmount(expense), 0)
  const reviewDue = allSelectedYearExpenses.filter(isReviewDue).length
  const betterOffers = allSelectedYearExpenses.filter((expense) => expense.status === 'better_offer').length

  const resetForm = (categoryId = fallbackCategoryId) => {
    setForm(emptyForm(categoryId))
    setEditingExpense(null)
    setError(null)
  }

  const submitExpense = async () => {
    const categoryId = form.category_id || fallbackCategoryId
    if (!categoryId) {
      setError('Bitte zuerst einen Bereich anlegen.')
      return
    }
    if (!form.title.trim()) {
      setError('Bitte eine Bezeichnung eintragen.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload: ExpenseInput = {
        category_id: categoryId,
        title: form.title.trim(),
        provider_name: normalizeText(form.provider_name),
        amount_eur: parseEuroValue(form.amount_eur),
        billing_cycle: form.billing_cycle,
        billing_note: normalizeText(form.billing_note),
        expense_year: parseYearValue(form.expense_year, currentYear),
        paid_from: normalizeText(form.paid_from),
        contract_until: normalizeText(form.contract_until),
        cancellation_notice: normalizeText(form.cancellation_notice),
        next_review_at: normalizeText(form.next_review_at),
        contact_name: normalizeText(form.contact_name),
        phone: normalizeText(form.phone),
        email: normalizeText(form.email),
        website_url: normalizeText(form.website_url),
        customer_number: normalizeText(form.customer_number),
        comparison_url: normalizeText(form.comparison_url),
        status: form.status,
        notes: normalizeText(form.notes),
      }
      if (editingExpense) {
        await actions.updateExpense(editingExpense, payload)
        setFeedback('Ausgabe aktualisiert.')
      } else {
        await actions.createExpense(payload)
        setFeedback('Ausgabe gespeichert.')
      }
      resetForm(categoryId)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Ausgabe konnte nicht gespeichert werden.')
    } finally {
      setSaving(false)
    }
  }

  const createCategory = async () => {
    const title = newCategoryTitle.trim()
    if (!title) return
    setSaving(true)
    setError(null)
    try {
      const existing = categories.find((category) => normalizeSlug(category.title) === normalizeSlug(title))
      const category =
        existing ??
        (await actions.createExpenseCategory({
          title,
          slug: normalizeSlug(title),
          color: categoryColors[categories.length % categoryColors.length],
          icon: 'folder',
          sort_order: (categories[categories.length - 1]?.sort_order ?? 0) + 10,
          active: true,
        }))
      setActiveCategoryId(category.id)
      setForm((current) => ({ ...current, category_id: category.id }))
      setNewCategoryTitle('')
      setFeedback(`Bereich "${category.title}" ist bereit.`)
    } catch (categoryError) {
      setError(categoryError instanceof Error ? categoryError.message : 'Bereich konnte nicht angelegt werden.')
    } finally {
      setSaving(false)
    }
  }

  const importMarkdown = async () => {
    const parsed = parseExpenseMarkdown(importText, currentYear)
    if (!parsed.length) {
      setError('In der Markdown-Struktur wurden keine auswertbaren Tabellenzeilen gefunden.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const categoryBySlug = new Map(categories.map((category) => [category.slug, category]))
      for (const row of parsed) {
        const slug = normalizeSlug(row.categoryTitle)
        if (!categoryBySlug.has(slug)) {
          const created = await actions.createExpenseCategory({
            title: row.categoryTitle,
            slug,
            color: categoryColors[categoryBySlug.size % categoryColors.length],
            icon: 'folder',
            sort_order: (categories[categories.length - 1]?.sort_order ?? 0) + (categoryBySlug.size + 1) * 10,
            active: true,
          })
          categoryBySlug.set(slug, created)
        }
      }

      for (const row of parsed) {
        const category = categoryBySlug.get(normalizeSlug(row.categoryTitle))
        if (!category) continue
        await actions.createExpense({
          category_id: category.id,
          title: row.title,
          provider_name: row.provider_name,
          amount_eur: row.amount_eur,
          billing_cycle: row.billing_cycle,
          billing_note: row.billing_note,
          expense_year: row.expense_year,
          paid_from: row.paid_from,
          contract_until: row.contract_until,
          cancellation_notice: row.cancellation_notice,
          next_review_at: row.next_review_at,
          contact_name: row.contact_name,
          phone: row.phone,
          email: row.email,
          website_url: row.website_url,
          customer_number: row.customer_number,
          comparison_url: row.comparison_url,
          status: row.status,
          notes: row.notes,
        })
      }

      setFeedback(`${parsed.length} Markdown-Einträge importiert.`)
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Markdown konnte nicht importiert werden.')
    } finally {
      setSaving(false)
    }
  }

  const deleteExpense = async (expense: ExpenseItem) => {
    setSaving(true)
    setError(null)
    try {
      await actions.deleteExpense(expense)
      if (editingExpense?.id === expense.id) resetForm()
      setFeedback('Ausgabe gelöscht.')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Ausgabe konnte nicht gelöscht werden.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-grid house-page expenses-page">
      <section className="page-title span-3">
        <div>
          <h1>Ausgaben</h1>
          <p>Haushalt, Versicherungen, Abos und weitere laufende Kosten mit Jahresfilter, Prüfterminen und Markdown-Import.</p>
        </div>
        <div className="page-actions">
          <Tag tone="info">{categories.length} Bereiche</Tag>
          <Tag tone={reviewDue ? 'warn' : 'good'}>{reviewDue} Prüfungen fällig</Tag>
          <Tag tone={betterOffers ? 'warn' : 'info'}>{betterOffers} Wechselchancen</Tag>
          <Button
            onClick={() => {
              resetForm(fallbackCategoryId)
              document.getElementById('expense-form-title')?.focus()
            }}
          >
            <Plus size={17} />
            Ausgabe
          </Button>
        </div>
      </section>

      <Card title="Bereiche" className="span-3 expense-category-card">
        <div className="expense-category-tabs" role="tablist" aria-label="Ausgabenbereiche">
          <button
            className={activeCategoryId === 'all' ? 'is-active' : ''}
            type="button"
            onClick={() => setActiveCategoryId('all')}
          >
            <WalletCards size={18} />
            <span>Alle</span>
            <strong>{formatCurrency(selectedYearCosts)}</strong>
          </button>
          {categories.map((category) => {
            const Icon = iconForCategory(category)
            const categoryCosts = data.expenses
              .filter((expense) => expense.category_id === category.id && (selectedYear === 'all' || expense.expense_year === Number(selectedYear)))
              .reduce((sum, expense) => sum + annualizedAmount(expense), 0)
            return (
              <button
                className={activeCategoryId === category.id ? 'is-active' : ''}
                key={category.id}
                style={{ '--category-color': category.color } as CSSProperties}
                type="button"
                onClick={() => {
                  setActiveCategoryId(category.id)
                  setForm((current) => ({ ...current, category_id: category.id }))
                }}
              >
                <Icon size={18} />
                <span>{category.title}</span>
                <strong>{formatCurrency(categoryCosts)}</strong>
              </button>
            )
          })}
        </div>
        <div className="inline-form expense-category-create">
          <TextInput
            placeholder="Weiteren Bereich anlegen, z.B. Mobilität"
            value={newCategoryTitle}
            onChange={(event) => setNewCategoryTitle(event.target.value)}
          />
          <Button onClick={createCategory} disabled={saving || !newCategoryTitle.trim()}>
            <FolderPlus size={17} />
            Bereich
          </Button>
        </div>
      </Card>

      <Card title={editingExpense ? 'Ausgabe bearbeiten' : 'Ausgabe erfassen'} className="span-2 house-form-card">
        <div className="form-stack">
          <div className="three-column-fields">
            <Field label="Bereich">
              <Select value={form.category_id || fallbackCategoryId} onChange={(event) => setForm((current) => ({ ...current, category_id: event.target.value }))}>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Jahr">
              <TextInput inputMode="numeric" value={form.expense_year} onChange={(event) => setForm((current) => ({ ...current, expense_year: event.target.value }))} />
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ExpenseStatus }))}>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="three-column-fields">
            <Field label="Bezeichnung">
              <TextInput
                id="expense-form-title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="z.B. Strom, Wohngebäude, Streaming"
              />
            </Field>
            <Field label="Anbieter">
              <TextInput value={form.provider_name} onChange={(event) => setForm((current) => ({ ...current, provider_name: event.target.value }))} />
            </Field>
            <Field label="Betrag EUR">
              <TextInput inputMode="decimal" value={form.amount_eur} onChange={(event) => setForm((current) => ({ ...current, amount_eur: event.target.value }))} />
            </Field>
          </div>
          <div className="three-column-fields">
            <Field label="Rhythmus">
              <Select value={form.billing_cycle} onChange={(event) => setForm((current) => ({ ...current, billing_cycle: event.target.value as ExpenseBillingCycle }))}>
                {Object.entries(billingLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Zahlt von">
              <TextInput value={form.paid_from} onChange={(event) => setForm((current) => ({ ...current, paid_from: event.target.value }))} />
            </Field>
            <Field label="Abrechnungsnotiz">
              <TextInput value={form.billing_note} onChange={(event) => setForm((current) => ({ ...current, billing_note: event.target.value }))} />
            </Field>
          </div>
          <div className="three-column-fields">
            <Field label="Nächste Prüfung">
              <TextInput type="date" value={form.next_review_at} onChange={(event) => setForm((current) => ({ ...current, next_review_at: event.target.value }))} />
            </Field>
            <Field label="Vertrag bis">
              <TextInput type="date" value={form.contract_until} onChange={(event) => setForm((current) => ({ ...current, contract_until: event.target.value }))} />
            </Field>
            <Field label="Kündigungsfrist">
              <TextInput value={form.cancellation_notice} onChange={(event) => setForm((current) => ({ ...current, cancellation_notice: event.target.value }))} />
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
            <Button onClick={submitExpense} disabled={saving || !categories.length}>
              {editingExpense ? 'Änderung speichern' : 'Speichern'}
            </Button>
            {editingExpense && (
              <Button variant="ghost" onClick={() => resetForm()} disabled={saving}>
                Abbrechen
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card title="Jahresblick" className="house-status-card">
        <div className="house-metric-grid">
          <article>
            <WalletCards size={18} />
            <strong>{formatCurrency(selectedYearCosts)}</strong>
            <span>{selectedYear === 'all' ? 'alle Jahre' : `Jahr ${selectedYear}`}</span>
          </article>
          <article>
            <CalendarClock size={18} />
            <strong>{formatCurrency(visibleAnnualCosts)}</strong>
            <span>aktuelle Ansicht</span>
          </article>
          <article>
            <FileText size={18} />
            <strong>{filteredExpenses.length}</strong>
            <span>Einträge gefiltert</span>
          </article>
          <article>
            <Upload size={18} />
            <strong>Markdown</strong>
            <span>Import vorbereitet</span>
          </article>
        </div>
      </Card>

      <Card title="Übersicht" className="span-3">
        <div className="house-toolbar expense-toolbar">
          <div className="search-row">
            <Search size={18} />
            <TextInput placeholder="Suche nach Ausgabe, Anbieter, Kontakt" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <Select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>
            <option value="all">Alle Jahre</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
        </div>
        {filteredExpenses.length ? (
          <div className="house-item-grid">
            {filteredExpenses.map((expense) => {
              const category = categoryById.get(expense.category_id)
              return (
                <article className="expense-card" key={expense.id} style={{ '--category-color': category?.color ?? 'var(--page-accent)' } as CSSProperties}>
                  <div className="house-item-card-header">
                    <div>
                      <strong>{expense.title}</strong>
                      <span>
                        {category?.title ?? 'Ausgaben'} {expense.provider_name ? `· ${expense.provider_name}` : ''}
                      </span>
                    </div>
                    <Tag tone={statusTone(expense.status)}>{statusLabels[expense.status]}</Tag>
                  </div>
                  <div className="house-facts">
                    <span>
                      <WalletCards size={16} />
                      {formatCurrencyPrecise(expense.amount_eur)} · {billingLabels[expense.billing_cycle]} · {expense.expense_year}
                    </span>
                    <span>
                      <CalendarClock size={16} />
                      Prüfung {expense.next_review_at ?? 'offen'}
                    </span>
                    {expense.contract_until && <span>Vertrag bis {expense.contract_until}</span>}
                    {expense.customer_number && <span>Kundennr. {expense.customer_number}</span>}
                  </div>
                  {(expense.phone || expense.email || expense.website_url) && (
                    <div className="house-contact-row">
                      {expense.phone && (
                        <a className="text-button" href={`tel:${expense.phone}`}>
                          <Phone size={16} />
                          {expense.phone}
                        </a>
                      )}
                      {expense.email && (
                        <a className="text-button" href={`mailto:${expense.email}`}>
                          <Mail size={16} />
                          E-Mail
                        </a>
                      )}
                      {expense.website_url && (
                        <a className="text-button" href={expense.website_url} target="_blank" rel="noreferrer">
                          <ExternalLink size={16} />
                          Anbieter
                        </a>
                      )}
                    </div>
                  )}
                  {expense.notes && <p>{expense.notes}</p>}
                  <div className="house-card-actions">
                    {expense.comparison_url && (
                      <a className="text-button" href={expense.comparison_url} target="_blank" rel="noreferrer">
                        <ExternalLink size={16} />
                        Vergleich
                      </a>
                    )}
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => {
                        setEditingExpense(expense)
                        setForm(toFormState(expense))
                        setFeedback(null)
                        setError(null)
                      }}
                    >
                      <Pencil size={16} />
                      Bearbeiten
                    </button>
                    <button className="text-button danger-link" type="button" onClick={() => void deleteExpense(expense)}>
                      <Trash2 size={16} />
                      Löschen
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <EmptyState title="Keine Ausgaben gefunden" body="Lege eine Ausgabe an, importiere Markdown oder ändere Bereich, Jahr und Suche." />
        )}
      </Card>

      <Card
        title="Markdown-Import"
        className="span-3 expense-import-card"
        action={
          <div className="action-row">
            <Button variant="ghost" onClick={() => setImportText(markdownTemplate)}>
              <Copy size={16} />
              Vorlage
            </Button>
            <Button onClick={importMarkdown} disabled={saving}>
              <Upload size={16} />
              Einlesen
            </Button>
          </div>
        }
      >
        <div className="expense-import-layout">
          <div className="form-stack">
            <p className="form-hint">
              Du kannst Ausgaben als Markdown-Tabelle vorbereiten. Wichtig sind die Überschriften `# Ausgaben 2026`, `## Bereich` und die Tabellenkopfzeile.
            </p>
            <TextArea value={importText} onChange={(event) => setImportText(event.target.value)} />
          </div>
          <div className="expense-import-help">
            <FileText size={22} />
            <strong>Robuste Struktur</strong>
            <span>Neue Bereiche werden beim Einlesen automatisch angelegt. Fehlende optionale Felder bleiben leer.</span>
            <span>Für echte Vergleiche bleiben Preisvergleichslinks und Prüftermine als bewusste Entscheidung hinterlegt.</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
