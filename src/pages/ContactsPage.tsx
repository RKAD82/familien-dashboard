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
  const [error, setError] = useState<string | null>(null)

  const contacts = [...data.contacts].sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name))

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Bitte einen Namen eintragen.')
      return
    }

    try {
      await actions.createFamilyContact({
        name: name.trim(),
        relation: relation.trim() || null,
        phone: phone.trim() || null,
        mobile: mobile.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
        favorite,
      })
      setName('')
      setRelation('')
      setPhone('')
      setMobile('')
      setEmail('')
      setAddress('')
      setNotes('')
      setFavorite(false)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Kontakt konnte nicht gespeichert werden.')
    }
  }

  return (
    <div className="page-grid contacts-page">
      <section className="page-title span-3">
        <div>
          <h1>Kontakte</h1>
          <p>Telefon, Handy, Adresse und Bemerkungen für wichtige Familienkontakte.</p>
        </div>
      </section>

      <Card title="Kontakt anlegen">
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
            Kontakt speichern
          </Button>
        </form>
      </Card>

      <Card title="Familienkontakte" className="span-2">
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
