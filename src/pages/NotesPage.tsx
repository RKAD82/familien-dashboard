import { useState, type FormEvent } from 'react'
import { Pencil, Plus, StickyNote, Trash2, X } from 'lucide-react'
import { useFamilyRoute } from '../routes/context'
import { Button, Card, Field, Select, Tag, TextArea, TextInput } from '../components/ui'
import type { NoteItem } from '../types'

const excerpt = (value: string) => (value.length > 170 ? `${value.slice(0, 170)}...` : value)

export const NotesPage = () => {
  const { data, actions } = useFamilyRoute()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('Familie')
  const [visibility, setVisibility] = useState<'family' | 'adults' | 'private'>('family')
  const [important, setImportant] = useState(false)
  const [notify, setNotify] = useState(false)
  const [selectedNoteId, setSelectedNoteId] = useState(data.notes[0]?.id ?? '')
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null)
  const selectedNote = data.notes.find((note) => note.id === selectedNoteId)

  const resetForm = () => {
    setEditingNote(null)
    setTitle('')
    setBody('')
    setCategory('Familie')
    setVisibility('family')
    setImportant(false)
    setNotify(false)
  }

  const startEdit = (note: NoteItem) => {
    setEditingNote(note)
    setSelectedNoteId(note.id)
    setTitle(note.title)
    setBody(note.body)
    setCategory(note.category)
    setVisibility(note.visibility)
    setImportant(note.is_important)
    setNotify(note.notify_family)
  }

  const deleteSelectedNote = async () => {
    if (!selectedNote) {
      return
    }
    await actions.deleteNote(selectedNote)
    if (editingNote?.id === selectedNote.id) {
      resetForm()
    }
    setSelectedNoteId('')
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !body.trim()) {
      return
    }

    const input = {
      title: title.trim(),
      body: body.trim(),
      category,
      visibility,
      is_important: important,
      notify_family: notify,
    }

    if (editingNote) {
      await actions.updateNote(editingNote, input)
      setSelectedNoteId(editingNote.id)
    } else {
      await actions.createNote(input)
    }
    resetForm()
  }

  return (
    <div className="page-grid">
      <section className="page-title span-2">
        <div>
          <h1>Notizen</h1>
          <p>Notiz anklicken und im großen Lesebereich öffnen.</p>
        </div>
      </section>

      <Card
        title={editingNote ? 'Notiz bearbeiten' : 'Neue Notiz'}
        action={
          editingNote ? (
            <button type="button" className="text-button" onClick={resetForm}>
              <X size={16} />
              Abbrechen
            </button>
          ) : null
        }
      >
        <form className="form-stack" onSubmit={onSubmit}>
          <Field label="Titel">
            <TextInput value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>
          <Field label="Inhalt">
            <TextArea rows={6} value={body} onChange={(event) => setBody(event.target.value)} />
          </Field>
          <Field label="Kategorie">
            <TextInput value={category} onChange={(event) => setCategory(event.target.value)} />
          </Field>
          <Field label="Sichtbarkeit">
            <Select value={visibility} onChange={(event) => setVisibility(event.target.value as typeof visibility)}>
              <option value="family">Familie</option>
              <option value="adults">Erwachsene</option>
              <option value="private">Privat</option>
            </Select>
          </Field>
          <label className="check-line">
            <input type="checkbox" checked={important} onChange={(event) => setImportant(event.target.checked)} />
            Wichtig markieren
          </label>
          <label className="check-line">
            <input type="checkbox" checked={notify} onChange={(event) => setNotify(event.target.checked)} />
            Familie benachrichtigen
          </label>
          <Button type="submit">
            {editingNote ? <Pencil size={18} /> : <Plus size={18} />}
            {editingNote ? 'Änderungen speichern' : 'Notiz speichern'}
          </Button>
        </form>
      </Card>

      <Card title="Lesebereich" className="span-2">
        {selectedNote ? (
          <article className="detail-panel note-detail">
            <div className="detail-panel-header">
              <div>
                <h2>{selectedNote.title}</h2>
                <div className="tag-row">
                  <Tag>{selectedNote.category}</Tag>
                  {selectedNote.visibility === 'adults' && <Tag tone="info">Erwachsene</Tag>}
                  {selectedNote.visibility === 'private' && <Tag tone="info">Privat</Tag>}
                  {selectedNote.is_important && <Tag tone="warn">wichtig</Tag>}
                </div>
              </div>
              <div className="inline-actions">
                <button type="button" onClick={() => startEdit(selectedNote)}>
                  Bearbeiten
                </button>
                <button type="button" onClick={() => void deleteSelectedNote()}>
                  <Trash2 size={14} />
                  Löschen
                </button>
                <button type="button" aria-label="Notiz schließen" onClick={() => setSelectedNoteId('')}>
                  <X size={14} />
                </button>
              </div>
            </div>
            <p>{selectedNote.body}</p>
          </article>
        ) : (
          <p className="muted">Wähle unten eine Notiz aus.</p>
        )}
      </Card>

      <div className="notes-grid span-3">
        {data.notes.map((note) => (
          <button key={note.id} className={`note-card note-card-button ${note.id === selectedNoteId ? 'selected' : ''}`} onClick={() => setSelectedNoteId(note.id)}>
            <StickyNote size={18} />
            <div>
              <h2>{note.title}</h2>
              <p>{excerpt(note.body)}</p>
              <div className="tag-row">
                <Tag>{note.category}</Tag>
                {note.visibility === 'adults' && <Tag tone="info">Erwachsene</Tag>}
                {note.visibility === 'private' && <Tag tone="info">Privat</Tag>}
                {note.is_important && <Tag tone="warn">wichtig</Tag>}
              </div>
            </div>
          </button>
        ))}
        {!data.notes.length && <p className="muted">Noch keine Notizen.</p>}
      </div>
    </div>
  )
}
