import { Mail, MapPin, Phone, Plus, Smartphone, Star } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useFamilyRoute } from '../routes/context'
import { Button, Card, EmptyState, Field, Tag, TextArea, TextInput } from '../components/ui'

export const ContactsPage = () => {
  const { data, actions } = useFamilyRoute()
  const [name, setName] = useState('')
  const [relation, setRelation] = useState('')
  const [phone, setPhone] = useState('')
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [favorite, setFavorite] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const contacts = [...data.contacts].sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name))
  const favoriteContacts = contacts.filter((contact) => contact.favorite).length

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Bitte einen Namen eintragen.')
      return
    }

    try {
      const input = {
        name: name.trim(),
        relation: relation.trim() || null,
        phone: phone.trim() || null,
        mobile: mobile.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
        favorite,
      }
      const editing = editingId ? data.contacts.find((contact) => contact.id === editingId) : null
      if (editing) {
        await actions.updateFamilyContact(editing, input)
      } else {
        await actions.createFamilyContact(input)
      }
      setName('')
      setRelation('')
      setPhone('')
      setMobile('')
      setEmail('')
      setAddress('')
      setNotes('')
      setFavorite(false)
      setEditingId(null)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Kontakt konnte nicht gespeichert werden.')
    }
  }

  const editContact = (contact: (typeof data.contacts)[number]) => {
    setEditingId(contact.id)
    setName(contact.name)
    setRelation(contact.relation ?? '')
    setPhone(contact.phone ?? '')
    setMobile(contact.mobile ?? '')
    setEmail(contact.email ?? '')
    setAddress(contact.address ?? '')
    setNotes(contact.notes ?? '')
    setFavorite(contact.favorite)
  }

  return (
    <div className="page-grid contacts-page">
      <section className="page-title span-3">
        <div>
          <h1>Kontakte</h1>
          <p>Telefon, Handy, Adresse und Bemerkungen für wichtige Familienkontakte.</p>
        </div>
        <div className="page-actions">
          <Tag>{contacts.length} Kontakte</Tag>
          <Tag tone="warn">{favoriteContacts} wichtig</Tag>
        </div>
      </section>

      <Card title={editingId ? 'Kontakt bearbeiten' : 'Kontakt anlegen'} className="directory-form-card">
        <form className="form-stack" onSubmit={onSubmit}>
          <Field label="Name">
            <TextInput value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Bezug">
            <TextInput placeholder="z.B. Schule, Arzt, Familie" value={relation} onChange={(event) => setRelation(event.target.value)} />
          </Field>
          <div className="two-column-fields">
            <Field label="Telefon">
              <TextInput value={phone} onChange={(event) => setPhone(event.target.value)} />
            </Field>
            <Field label="Handy">
              <TextInput value={mobile} onChange={(event) => setMobile(event.target.value)} />
            </Field>
          </div>
          <Field label="E-Mail">
            <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label="Adresse">
            <TextArea rows={3} value={address} onChange={(event) => setAddress(event.target.value)} />
          </Field>
          <Field label="Bemerkungen">
            <TextArea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </Field>
          <label className="check-line">
            <input type="checkbox" checked={favorite} onChange={(event) => setFavorite(event.target.checked)} />
            Als wichtigen Kontakt markieren
          </label>
          {error && <p className="form-error">{error}</p>}
          <Button type="submit">
            <Plus size={18} />
            {editingId ? 'Kontakt ändern' : 'Kontakt speichern'}
          </Button>
          {editingId && (
            <Button variant="ghost" onClick={() => setEditingId(null)}>
              Bearbeitung abbrechen
            </Button>
          )}
        </form>
      </Card>

      <Card title="Familienkontakte" className="span-2 directory-list-card">
        {contacts.length ? (
          <div className="contact-grid">
            {contacts.map((contact) => (
              <article key={contact.id} className="contact-card">
                <div className="contact-card-header">
                  <div>
                    <strong>{contact.name}</strong>
                    {contact.relation && <span>{contact.relation}</span>}
                  </div>
                  {contact.favorite && <Star size={18} />}
                </div>
                <div className="contact-facts">
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`}>
                      <Phone size={16} />
                      <span>{contact.phone}</span>
                    </a>
                  )}
                  {contact.mobile && (
                    <a href={`tel:${contact.mobile}`}>
                      <Smartphone size={16} />
                      <span>{contact.mobile}</span>
                    </a>
                  )}
                  {contact.email && (
                    <a href={`mailto:${contact.email}`}>
                      <Mail size={16} />
                      <span>{contact.email}</span>
                    </a>
                  )}
                  {contact.address && (
                    <div>
                      <MapPin size={16} />
                      <span>{contact.address}</span>
                    </div>
                  )}
                </div>
                {contact.notes && <p>{contact.notes}</p>}
                {contact.favorite && <Tag tone="warn">wichtig</Tag>}
                <div className="inline-actions">
                  <button type="button" onClick={() => editContact(contact)}>Bearbeiten</button>
                  <button type="button" onClick={() => void actions.deleteFamilyContact(contact)}>Löschen</button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Noch keine Kontakte" body="Lege links den ersten Familienkontakt an." />
        )}
      </Card>
    </div>
  )
}
