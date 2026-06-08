import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getUpcomingWasteEvents, searchWasteSorting, validateWasteEvents } from '../src/lib/waste'
import type { WasteEvent, WasteSortingItem } from '../src/types'

const readJson = <T>(path: string): T => JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8')) as T

describe('Abfall-Seed Brauweiler/Freimersdorf', () => {
  const wasteSeed = readJson<{
    events: Array<Pick<WasteEvent, 'date' | 'waste_type' | 'title'>>
  }>('data/seed/abfall-pulheim-2026-brauweiler.json')

  it('enthaelt nur gueltige Datumswerte und keine Dubletten pro Tag/Tonne', () => {
    expect(validateWasteEvents(wasteSeed.events)).toEqual([])
  })

  it('berechnet naechste Abholungen ab dem aktuellen Projektstart', () => {
    const events = wasteSeed.events.map((event, index) => ({
      ...event,
      id: String(index),
      district_id: 'district',
      location: null,
      starts_at: null,
      ends_at: null,
      source_id: null,
      source_event_uid: `${event.date}-${event.waste_type}`,
      notes: null,
    })) as WasteEvent[]

    const upcoming = getUpcomingWasteEvents(events, new Date('2026-06-08T08:00:00.000Z'), 3)
    expect(upcoming[0]?.date).toBe('2026-06-09')
    expect(upcoming.every((event) => event.date >= '2026-06-08')).toBe(true)
  })
})

describe('Trennhilfe', () => {
  const sortingSeed = readJson<{
    items: Array<WasteSortingItem & { category_name: string }>
  }>('data/seed/waste-sorting-pulheim.json')

  it('findet typische Suchbegriffe und Aliase', () => {
    const results = searchWasteSorting(
      sortingSeed.items.map((item, index) => ({ ...item, id: String(index), category_id: item.category_name })),
      'akku',
    )

    expect(results[0]?.term).toBe('Batterien')
    expect(results[0]?.warning).toContain('Brandgefahr')
  })
})
