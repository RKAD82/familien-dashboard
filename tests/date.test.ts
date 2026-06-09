import { describe, expect, it } from 'vitest'
import { expandRecurringEvents, toDateKey } from '../src/lib/date'
import type { EventItem } from '../src/types'

const event = (overrides: Partial<EventItem>): EventItem => ({
  id: 'event',
  family_id: 'family',
  calendar_id: null,
  title: 'Training',
  starts_at: '2026-06-09T15:00:00.000Z',
  ends_at: null,
  all_day: false,
  recurrence_rule: null,
  category: 'Freizeit',
  location: null,
  notes: null,
  is_important: false,
  notify_family: false,
  created_by: null,
  ...overrides,
})

describe('Termine', () => {
  it('filtert einzelne Termine auf den angefragten Zeitraum', () => {
    const events = [
      event({ id: 'in-range', starts_at: '2026-06-09T15:00:00.000Z' }),
      event({ id: 'outside', starts_at: '2026-06-12T15:00:00.000Z' }),
    ]

    const expanded = expandRecurringEvents(events, new Date('2026-06-09T00:00:00.000Z'), new Date('2026-06-10T00:00:00.000Z'))
    expect(expanded.map((entry) => entry.id)).toEqual(['in-range'])
  })

  it('zeigt woechentliche Termine am passenden Wochentag erneut an', () => {
    const expanded = expandRecurringEvents(
      [event({ recurrence_rule: 'FREQ=WEEKLY' })],
      new Date('2026-06-16T00:00:00.000Z'),
      new Date('2026-06-17T00:00:00.000Z'),
    )

    expect(expanded).toHaveLength(1)
    expect(toDateKey(expanded[0]!.starts_at)).toBe('2026-06-16')
  })
})
