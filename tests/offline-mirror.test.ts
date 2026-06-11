import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createOfflineMirrorData, readMirror, saveMirror } from '../src/lib/offlineMirror'
import type { EmergencyItem, Family, FamilyContact } from '../src/types'

class LocalStorageMock {
  private store = new Map<string, string>()

  getItem(key: string) {
    return this.store.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.store.set(key, value)
  }

  removeItem(key: string) {
    this.store.delete(key)
  }

  clear() {
    this.store.clear()
  }
}

const family: Family = {
  id: 'family-1',
  name: 'Familie Klein',
  default_timezone: 'Europe/Berlin',
}

const contact: FamilyContact = {
  id: 'contact-1',
  family_id: family.id,
  name: 'Kinderarzt',
  relation: 'Arzt',
  phone: '116117',
  mobile: null,
  email: null,
  address: null,
  notes: null,
  favorite: true,
  created_by: null,
}

const emergencyItem: EmergencyItem = {
  id: 'emergency-1',
  family_id: family.id,
  type: 'contact',
  title: 'Giftnotruf',
  primary_text: '0228 19240',
  secondary_text: null,
  phone: '022819240',
  address: null,
  url: null,
  notes: null,
  priority: 1,
  created_by: null,
}

describe('offlineMirror', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-11T08:30:00.000Z'))
    vi.stubGlobal('window', { localStorage: new LocalStorageMock() })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('speichert und liest Kontakte mit Spiegel-Zeitstempel', () => {
    saveMirror(family.id, 'contacts', [contact])

    const mirror = readMirror<FamilyContact>(family.id, 'contacts')

    expect(mirror).toEqual({
      items: [contact],
      mirroredAt: '2026-06-11T08:30:00.000Z',
    })
  })

  it('ignoriert defekte JSON-Daten im Storage', () => {
    window.localStorage.setItem('familien-dashboard-offline:family-1:contacts', '{kaputt')

    expect(readMirror<FamilyContact>(family.id, 'contacts')).toBeNull()
  })

  it('baut Dashboard-Daten aus Kontakten und Notfallspiegel', () => {
    saveMirror(family.id, 'contacts', [contact])
    saveMirror(family.id, 'emergencyItems', [emergencyItem])

    const data = createOfflineMirrorData(family)

    expect(data?.contacts).toEqual([contact])
    expect(data?.emergencyItems).toEqual([emergencyItem])
    expect(data?.offlineMirror).toEqual({
      fromMirror: true,
      mirroredAt: '2026-06-11T08:30:00.000Z',
    })
  })
})
