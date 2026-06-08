import type { WasteEvent, WasteSortingItem, WasteType } from '../types'

export const wasteLabels: Record<WasteType, string> = {
  grau: 'Graue Tonne',
  gelb: 'Gelbe Tonne',
  blau: 'Blaue Tonne',
  bio: 'Biotonne',
  weihnachtsbaum: 'Weihnachtsbaum',
  schadstoffmobil: 'Schadstoffmobil',
  bauabfall: 'Bau-/Renovierungsabfall',
  grosskartonagen: 'Großkartonagen',
}

export const wasteColors: Record<WasteType, string> = {
  grau: '#6b7280',
  gelb: '#d6a800',
  blau: '#2f73b7',
  bio: '#4b7f52',
  weihnachtsbaum: '#2f6f4e',
  schadstoffmobil: '#9b4d4d',
  bauabfall: '#8a6748',
  grosskartonagen: '#b7791f',
}

export const normalizeWasteEvents = (events: WasteEvent[]) =>
  [...events].sort((a, b) => `${a.date}-${a.waste_type}`.localeCompare(`${b.date}-${b.waste_type}`))

export const getUpcomingWasteEvents = (events: WasteEvent[], from = new Date(), limit = 6) => {
  const fromKey = from.toISOString().slice(0, 10)
  return normalizeWasteEvents(events)
    .filter((event) => event.date >= fromKey)
    .slice(0, limit)
}

export const getWasteEventsForMonth = (events: WasteEvent[], year: number, month: number) => {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return normalizeWasteEvents(events).filter((event) => event.date.startsWith(prefix))
}

export const validateWasteEvents = (events: Array<Pick<WasteEvent, 'date' | 'waste_type'>>) => {
  const seen = new Set<string>()
  const errors: string[] = []

  for (const event of events) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date) || Number.isNaN(Date.parse(`${event.date}T00:00:00Z`))) {
      errors.push(`Ungültiges Datum: ${event.date}`)
    }

    const duplicateKey = `${event.date}:${event.waste_type}`
    if (seen.has(duplicateKey)) {
      errors.push(`Doppelter Eintrag: ${duplicateKey}`)
    }
    seen.add(duplicateKey)
  }

  return errors
}

export const searchWasteSorting = (items: WasteSortingItem[], query: string) => {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return items.slice(0, 8)
  }

  return items
    .map((item) => {
      const haystack = [item.term, item.description, item.category_name, ...item.aliases].join(' ').toLowerCase()
      const score =
        item.term.toLowerCase() === normalized
          ? 100
          : item.term.toLowerCase().includes(normalized)
            ? 70
            : item.aliases.some((alias) => alias.toLowerCase().includes(normalized))
              ? 55
              : haystack.includes(normalized)
                ? 30
                : 0

      return { item, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.term.localeCompare(b.item.term))
    .map((entry) => entry.item)
}
