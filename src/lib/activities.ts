import type { ActivitySuggestion } from '../types'

export interface ActivitySourceRunner {
  name: string
  run: () => Promise<ActivitySuggestion[]>
}

export const dedupeActivitySuggestions = (items: ActivitySuggestion[]) => {
  const byKey = new Map<string, ActivitySuggestion>()

  for (const item of items) {
    const normalizedTitle = item.title.trim().toLowerCase()
    const normalizedStart = item.starts_at?.slice(0, 10) ?? 'no-date'
    const key = item.external_id || `${normalizedTitle}:${normalizedStart}:${item.location_name.toLowerCase()}`
    const existing = byKey.get(key)

    if (!existing || item.family_score > existing.family_score) {
      byKey.set(key, item)
    }
  }

  return [...byKey.values()].sort((a, b) => b.family_score - a.family_score)
}

export const runActivitySources = async (runners: ActivitySourceRunner[]) => {
  const results = await Promise.allSettled(runners.map((runner) => runner.run()))
  const suggestions: ActivitySuggestion[] = []
  const errors: string[] = []

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      suggestions.push(...result.value)
      return
    }

    errors.push(`${runners[index]?.name ?? 'Unbekannte Quelle'}: ${result.reason}`)
  })

  return {
    suggestions: dedupeActivitySuggestions(suggestions),
    errors,
  }
}
