import type { InventoryItem, ServiceContract } from '../types'

type HouseStorageKey = 'inventoryItems' | 'serviceContracts'

const storagePrefix = 'familien-dashboard-house'

const storageKey = (familyId: string, key: HouseStorageKey) => `${storagePrefix}:${familyId}:${key}`

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

export const readHouseFallback = <T extends InventoryItem | ServiceContract>(familyId: string, key: HouseStorageKey): T[] => {
  if (!canUseStorage()) {
    return []
  }
  try {
    const raw = window.localStorage.getItem(storageKey(familyId, key))
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

const writeHouseFallback = <T extends InventoryItem | ServiceContract>(familyId: string, key: HouseStorageKey, items: T[]) => {
  if (!canUseStorage()) {
    return
  }
  window.localStorage.setItem(storageKey(familyId, key), JSON.stringify(items))
}

export const upsertHouseFallback = <T extends InventoryItem | ServiceContract>(familyId: string, key: HouseStorageKey, item: T) => {
  const current = readHouseFallback<T>(familyId, key)
  const next = current.some((entry) => entry.id === item.id)
    ? current.map((entry) => (entry.id === item.id ? item : entry))
    : [item, ...current]
  writeHouseFallback(familyId, key, next)
  return next
}

export const deleteHouseFallback = <T extends InventoryItem | ServiceContract>(familyId: string, key: HouseStorageKey, itemId: string) => {
  const next = readHouseFallback<T>(familyId, key).filter((entry) => entry.id !== itemId)
  writeHouseFallback(familyId, key, next)
  return next
}
