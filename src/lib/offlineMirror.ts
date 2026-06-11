import type { DashboardData, EmergencyItem, Family, FamilyContact } from '../types'

export type OfflineMirrorKey = 'contacts' | 'emergencyItems'

export type OfflineMirrorPayload<T> = {
  items: T[]
  mirroredAt: string
}

const storagePrefix = 'familien-dashboard-offline'

const storageKey = (familyId: string, key: OfflineMirrorKey) => `${storagePrefix}:${familyId}:${key}`

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

export const saveMirror = <T extends FamilyContact | EmergencyItem>(familyId: string, key: OfflineMirrorKey, items: T[]) => {
  if (!canUseStorage()) return null

  const payload: OfflineMirrorPayload<T> = {
    items,
    mirroredAt: new Date().toISOString(),
  }
  window.localStorage.setItem(storageKey(familyId, key), JSON.stringify(payload))
  return payload
}

export const readMirror = <T extends FamilyContact | EmergencyItem>(familyId: string, key: OfflineMirrorKey) => {
  if (!canUseStorage()) return null

  try {
    const raw = window.localStorage.getItem(storageKey(familyId, key))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<OfflineMirrorPayload<T>>
    if (!Array.isArray(parsed.items) || typeof parsed.mirroredAt !== 'string') return null
    return { items: parsed.items, mirroredAt: parsed.mirroredAt }
  } catch {
    return null
  }
}

const newestMirrorDate = (values: Array<string | null | undefined>) => {
  const timestamps = values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value))
  if (!timestamps.length) return null
  return new Date(Math.max(...timestamps)).toISOString()
}

export const createOfflineMirrorData = (family: Family): DashboardData | null => {
  const contacts = readMirror<FamilyContact>(family.id, 'contacts')
  const emergencyItems = readMirror<EmergencyItem>(family.id, 'emergencyItems')
  if (!contacts && !emergencyItems) return null

  return {
    family,
    memberships: [],
    events: [],
    tasks: [],
    shoppingLists: [],
    shoppingItems: [],
    linkCollections: [],
    links: [],
    contacts: contacts?.items ?? [],
    emergencyItems: emergencyItems?.items ?? [],
    notes: [],
    inventoryItems: [],
    serviceContracts: [],
    expenseCategories: [],
    expenses: [],
    wasteDistricts: [],
    wasteEvents: [],
    wasteSortingItems: [],
    recipes: [],
    recipeIngredients: [],
    recipeSuggestions: [],
    activitySuggestions: [],
    activityAgentRuns: [],
    notificationDeliveries: [],
    offlineMirror: {
      fromMirror: true,
      mirroredAt: newestMirrorDate([contacts?.mirroredAt, emergencyItems?.mirroredAt]),
    },
  }
}

export const formatMirrorDate = (value: string | null | undefined) => {
  if (!value) return 'unbekannt'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'unbekannt'
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Berlin',
  }).format(date)
}
