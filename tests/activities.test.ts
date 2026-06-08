import { describe, expect, it } from 'vitest'
import { dedupeActivitySuggestions, runActivitySources } from '../src/lib/activities'
import type { ActivitySuggestion } from '../src/types'

const activity = (id: string, score: number): ActivitySuggestion => ({
  id,
  family_id: 'family',
  source_id: null,
  external_id: id,
  title: 'Ausflug',
  description: 'Test',
  starts_at: null,
  ends_at: null,
  location_name: 'Pulheim',
  location_address: null,
  distance_label: 'nah',
  category: 'Draussen',
  family_score: score,
  price_label: 'kostenlos',
  age_label: 'familientauglich',
  url: null,
  image_url: null,
  status: 'suggested',
  expires_at: null,
})

describe('Aktivitaeten-Agent', () => {
  it('dedupliziert nach externer ID und behaelt den besseren Treffer', () => {
    const results = dedupeActivitySuggestions([activity('same', 50), activity('same', 90), activity('other', 70)])
    expect(results).toHaveLength(2)
    expect(results[0]?.family_score).toBe(90)
  })

  it('isoliert defekte Quellen', async () => {
    const result = await runActivitySources([
      { name: 'ok', run: async () => [activity('ok', 80)] },
      { name: 'kaputt', run: async () => Promise.reject(new Error('Quelle nicht erreichbar')) },
    ])

    expect(result.suggestions).toHaveLength(1)
    expect(result.errors[0]).toContain('kaputt')
  })
})
