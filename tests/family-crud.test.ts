import { describe, expect, it } from 'vitest'
import {
  deleteFamilyLinkRecord,
  deleteFamilyNoteRecord,
  updateFamilyLinkRecord,
  updateFamilyNoteRecord,
} from '../src/lib/familyCrud'
import type { FamilyLink, NoteItem } from '../src/types'

type Operation = {
  table: string
  action: 'update' | 'delete'
  payload?: Record<string, unknown>
  column: string
  value: string
}

const link = (): FamilyLink => ({
  id: 'link-1',
  collection_id: 'collection-1',
  title: 'Schule',
  url: 'https://schule.example',
  description: 'Portal',
  favorite: true,
  visible_to: null,
  is_important: false,
  notify_family: false,
})

const note = (): NoteItem => ({
  id: 'note-1',
  family_id: 'family-1',
  title: 'Arzt',
  body: 'Termin vorbereiten',
  category: 'Familie',
  visibility: 'adults',
  is_important: false,
  notify_family: false,
  updated_by: null,
  updated_at: '2026-06-09T08:00:00.000Z',
})

const createCrudClient = () => {
  const operations: Operation[] = []
  const client = {
    from: (table: string) => ({
      update: (payload: Record<string, unknown>) => ({
        eq: async (column: string, value: string) => {
          operations.push({ table, action: 'update', payload, column, value })
          return { error: null }
        },
      }),
      delete: () => ({
        eq: async (column: string, value: string) => {
          operations.push({ table, action: 'delete', column, value })
          return { error: null }
        },
      }),
    }),
  }

  return { client, operations }
}

describe('Familien-CRUD Aktionen', () => {
  it('aktualisiert einen Link über die links-Tabelle', async () => {
    const { client, operations } = createCrudClient()

    await updateFamilyLinkRecord(client, link(), {
      collection_id: 'collection-1',
      title: 'Schule neu',
      url: 'https://portal.example',
      description: 'Neues Portal',
      favorite: false,
      is_important: true,
      notify_family: false,
    })

    expect(operations).toEqual([
      {
        table: 'links',
        action: 'update',
        payload: {
          collection_id: 'collection-1',
          title: 'Schule neu',
          url: 'https://portal.example',
          description: 'Neues Portal',
          favorite: false,
          is_important: true,
          notify_family: false,
        },
        column: 'id',
        value: 'link-1',
      },
    ])
  })

  it('löscht einen Link über seine ID', async () => {
    const { client, operations } = createCrudClient()

    await deleteFamilyLinkRecord(client, link())

    expect(operations).toEqual([{ table: 'links', action: 'delete', column: 'id', value: 'link-1' }])
  })

  it('aktualisiert eine Notiz und behält die gewählte Sichtbarkeit explizit bei', async () => {
    const { client, operations } = createCrudClient()

    await updateFamilyNoteRecord(client, note(), 'user-1', {
      title: 'Arzt neu',
      body: 'Unterlagen mitnehmen',
      category: 'Gesundheit',
      visibility: 'adults',
      is_important: true,
      notify_family: false,
    })

    expect(operations).toHaveLength(1)
    expect(operations[0]).toMatchObject({
      table: 'notes',
      action: 'update',
      column: 'id',
      value: 'note-1',
    })
    expect(operations[0]?.payload).toMatchObject({
      title: 'Arzt neu',
      body: 'Unterlagen mitnehmen',
      category: 'Gesundheit',
      visibility: 'adults',
      is_important: true,
      notify_family: false,
      updated_by: 'user-1',
    })
    expect(typeof operations[0]?.payload?.updated_at).toBe('string')
  })

  it('löscht eine Notiz über ihre ID', async () => {
    const { client, operations } = createCrudClient()

    await deleteFamilyNoteRecord(client, note())

    expect(operations).toEqual([{ table: 'notes', action: 'delete', column: 'id', value: 'note-1' }])
  })
})
