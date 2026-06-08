import { useState, type FormEvent } from 'react'
import { Plus, StickyNote, X } from 'lucide-react'
import { useFamilyRoute } from '../routes/context'
import { Button, Card, Field, Select, Tag, TextArea, TextInput } from '../components/ui'

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
  const selectedNote = data.notes.find((note) => note.id === selectedNoteId)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !body.trim()) {
      return
    }

    await actions.createNote({
      title: title.trim(),
      body: body.trim(),
      category,
      visibility,
      is_important: important,
      notify_family: notify,
    })
    setTitle('')
    setBody('')
    setImportant(false)
    setNotify(false)
  }

  return (
    <div className="page-grid">
      <section className="page-title span-2">
        <div>
          <h1>Notizen</h1>
          <p>Notiz anklicken und im großen Lesebereich öffnen.</p>
        </div>
      </section>

      <Card title="Neue Notiz">
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
            <Plus size={18} />
            Notiz speichern
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
              <Button variant="ghost" aria-label="Notiz schließen" onClick={() => setSelectedNoteId('')}>
                <X size={18} />
              </Button>
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
