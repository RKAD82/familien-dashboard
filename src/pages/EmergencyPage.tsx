import { AlertTriangle, ExternalLink, HeartPulse, Link as LinkIcon, MapPin, Phone, Plus, ShieldAlert } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useFamilyRoute } from '../routes/context'
import type { EmergencyItemType } from '../types'
import { Button, Card, EmptyState, Field, Select, Tag, TextArea, TextInput } from '../components/ui'

const typeLabels: Record<EmergencyItemType, string> = {
  contact: 'Notfallkontakt',
  address: 'Notfalladresse',
  medical: 'Medizinisch',
  info: 'Hinweis',
  link: 'Wichtiger Link',
}

const typeIcons: Record<EmergencyItemType, typeof ShieldAlert> = {
  contact: ShieldAlert,
  address: MapPin,
  medical: HeartPulse,
  info: AlertTriangle,
  link: LinkIcon,
}

export const EmergencyPage = () => {
  const { data, actions } = useFamilyRoute()
  const [type, setType] = useState<EmergencyItemType>('contact')
  const [title, setTitle] = useState('')
  const [primaryText, setPrimaryText] = useState('')
  const [secondaryText, setSecondaryText] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const emergencyItems = [...data.emergencyItems].sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title))
  const urgentItems = emergencyItems.filter((item) => item.priority <= 2).length

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!title.trim() || !primaryText.trim()) {
      setError('Bitte Titel und Hauptinformation eintragen.')
      return
    }

    try {
      const input = {
        type,
        title: title.trim(),
        primary_text: primaryText.trim(),
        secondary_text: secondaryText.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        url: url.trim() || null,
        notes: notes.trim() || null,
        priority,
      }
      const editing = editingId ? data.emergencyItems.find((item) => item.id === editingId) : null
      if (editing) {
        await actions.updateEmergencyItem(editing, input)
      } else {
        await actions.createEmergencyItem(input)
      }
      setType('contact')
      setTitle('')
      setPrimaryText('')
      setSecondaryText('')
      setPhone('')
      setAddress('')
      setUrl('')
      setNotes('')
      setPriority(1)
      setEditingId(null)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Notfall-Eintrag konnte nicht gespeichert werden.')
    }
  }

  const editItem = (item: (typeof data.emergencyItems)[number]) => {
    setEditingId(item.id)
    setType(item.type)
    setTitle(item.title)
    setPrimaryText(item.primary_text)
    setSecondaryText(item.secondary_text ?? '')
    setPhone(item.phone ?? '')
    setAddress(item.address ?? '')
    setUrl(item.url ?? '')
    setNotes(item.notes ?? '')
    setPriority(item.priority)
  }

  return (
    <div className="page-grid emergency-page">
      <section className="page-title span-3">
        <div>
          <h1>Notfall</h1>
          <p>Notfallkontakte, wichtige Nummern, Adressen und Hinweise an einem Ort.</p>
        </div>
        <div className="page-actions">
          <Tag>{emergencyItems.length} Einträge</Tag>
          <Tag tone={urgentItems ? 'warn' : 'info'}>{urgentItems} höchste Priorität</Tag>
        </div>
      </section>

      <Card title={editingId ? 'Notfall-Eintrag bearbeiten' : 'Notfall-Eintrag anlegen'} className="emergency-form-card">
        <form className="form-stack" onSubmit={onSubmit}>
          <Field label="Art">
            <Select value={type} onChange={(event) => setType(event.target.value as EmergencyItemType)}>
              {Object.entries(typeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Titel">
            <TextInput value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>
          <Field label="Hauptinformation">
            <TextInput placeholder="z.B. Name, Nummer, Adresse oder Webseitenname" value={primaryText} onChange={(event) => setPrimaryText(event.target.value)} />
          </Field>
          <Field label="Zusatz">
            <TextInput value={secondaryText} onChange={(event) => setSecondaryText(event.target.value)} />
          </Field>
          <div className="two-column-fields">
            <Field label="Telefon">
              <TextInput value={phone} onChange={(event) => setPhone(event.target.value)} />
            </Field>
            <Field label="Priorität">
              <TextInput
                min={1}
                max={9}
                type="number"
                value={priority}
                onChange={(event) => setPriority(Number(event.target.value))}
              />
            </Field>
          </div>
          <Field label="Adresse">
            <TextArea rows={3} value={address} onChange={(event) => setAddress(event.target.value)} />
          </Field>
          <Field label="Link">
            <TextInput placeholder="https://..." type="url" value={url} onChange={(event) => setUrl(event.target.value)} />
          </Field>
          <Field label="Bemerkungen">
            <TextArea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </Field>
          {error && <p className="form-error">{error}</p>}
          <Button type="submit">
            <Plus size={18} />
            {editingId ? 'Eintrag ändern' : 'Eintrag speichern'}
          </Button>
          {editingId && (
            <Button variant="ghost" onClick={() => setEditingId(null)}>
              Bearbeitung abbrechen
            </Button>
          )}
        </form>
      </Card>

      <Card title="Notfallübersicht" className="span-2 emergency-overview-card">
        {emergencyItems.length ? (
          <div className="emergency-grid">
            {emergencyItems.map((item) => {
              const Icon = typeIcons[item.type]
              return (
                <article key={item.id} className="emergency-card">
                  <div className="emergency-icon">
                    <Icon size={22} />
                  </div>
                  <div>
                    <div className="emergency-card-header">
                      <strong>{item.title}</strong>
                      <Tag tone={item.priority <= 2 ? 'warn' : 'info'}>{typeLabels[item.type]}</Tag>
                    </div>
                    <p>{item.primary_text}</p>
                    {item.secondary_text && <span>{item.secondary_text}</span>}
                    {item.phone && (
                      <a href={`tel:${item.phone}`}>
                        <Phone size={16} />
                        {item.phone}
                      </a>
                    )}
                    {item.address && <small>{item.address}</small>}
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noreferrer">
                        <ExternalLink size={16} />
                        Link öffnen
                      </a>
                    )}
                    {item.notes && <small>{item.notes}</small>}
                    <div className="inline-actions">
                      <button type="button" onClick={() => editItem(item)}>Bearbeiten</button>
                      <button type="button" onClick={() => void actions.deleteEmergencyItem(item)}>Löschen</button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <EmptyState title="Noch keine Notfallinfos" body="Lege links den ersten Notfallkontakt oder eine Adresse an." />
        )}
      </Card>
    </div>
  )
}
