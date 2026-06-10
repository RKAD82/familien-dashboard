import type { FamilyLink, NoteItem } from '../types'

export type UpdateFamilyLinkInput = Pick<
  FamilyLink,
  'collection_id' | 'title' | 'url' | 'description' | 'favorite' | 'is_important' | 'notify_family'
>

export type UpdateFamilyNoteInput = Pick<
  NoteItem,
  'title' | 'body' | 'category' | 'visibility' | 'is_important' | 'notify_family'
>

type CrudError = { message?: string }
type CrudResult = PromiseLike<{ error: CrudError | null }>

type CrudTable = {
  update: (payload: Record<string, unknown>) => { eq: (column: string, value: string) => CrudResult }
  delete: () => { eq: (column: string, value: string) => CrudResult }
}

type CrudClient = {
  from: (table: 'links' | 'notes') => CrudTable
}

const throwIfError = (error: CrudError | null) => {
  if (error) {
    throw error
  }
}

export const updateFamilyLinkRecord = async (client: CrudClient, link: FamilyLink, input: UpdateFamilyLinkInput) => {
  const { error } = await client.from('links').update(input).eq('id', link.id)
  throwIfError(error)
}

export const deleteFamilyLinkRecord = async (client: CrudClient, link: FamilyLink) => {
  const { error } = await client.from('links').delete().eq('id', link.id)
  throwIfError(error)
}

export const updateFamilyNoteRecord = async (
  client: CrudClient,
  note: NoteItem,
  userId: string | null,
  input: UpdateFamilyNoteInput,
) => {
  const { error } = await client
    .from('notes')
    .update({
      ...input,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', note.id)
  throwIfError(error)
}

export const deleteFamilyNoteRecord = async (client: CrudClient, note: NoteItem) => {
  const { error } = await client.from('notes').delete().eq('id', note.id)
  throwIfError(error)
}
