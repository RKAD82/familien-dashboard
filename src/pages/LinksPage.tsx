import { useState, type FormEvent } from 'react'
import { ExternalLink, Plus, Star } from 'lucide-react'
import { useFamilyRoute } from '../routes/context'
import { Button, Card, EmptyState, Field, Select, Tag, TextInput } from '../components/ui'

const normalizeUrl = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) {
    return trimmed
  }
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export const LinksPage = () => {
  const { data, actions } = useFamilyRoute()
  const [collectionId, setCollectionId] = useState(data.linkCollections[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [favorite, setFavorite] = useState(true)
  const activeCollection = data.linkCollections.find((collection) => collection.id === collectionId) ?? data.linkCollections[0]

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!activeCollection || !title.trim() || !url.trim()) {
      return
    }

    await actions.createLink({
      collection_id: activeCollection.id,
      title: title.trim(),
      url: normalizeUrl(url),
      description: description.trim() || null,
      favorite,
      is_important: false,
      notify_family: false,
    })
    setTitle('')
    setUrl('')
    setDescription('')
    setFavorite(true)
  }

  return (
    <div className="page-grid">
      <section className="page-title span-3">
        <div>
          <h1>Links</h1>
          <p>Zentrale Sammlung für die Seiten, die im Familienalltag wiederkehren.</p>
        </div>
      </section>

      <Card title="Link anlegen">
        {activeCollection ? (
          <form className="form-stack" onSubmit={onSubmit}>
            <Field label="Sammlung">
              <Select value={activeCollection.id} onChange={(event) => setCollectionId(event.target.value)}>
                {data.linkCollections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Titel">
              <TextInput value={title} onChange={(event) => setTitle(event.target.value)} />
            </Field>
            <Field label="Adresse">
              <TextInput placeholder="https://..." value={url} onChange={(event) => setUrl(event.target.value)} />
            </Field>
            <Field label="Beschreibung">
              <TextInput value={description} onChange={(event) => setDescription(event.target.value)} />
            </Field>
            <label className="check-line">
              <input type="checkbox" checked={favorite} onChange={(event) => setFavorite(event.target.checked)} />
              Als Favorit anzeigen
            </label>
            <Button type="submit">
              <Plus size={18} />
              Link speichern
            </Button>
          </form>
        ) : (
          <EmptyState title="Keine Sammlung" body="Es muss zuerst eine Linksammlung vorhanden sein." />
        )}
      </Card>

      <div className="collection-grid span-2">
        {data.linkCollections.map((collection) => {
          const links = data.links.filter((link) => link.collection_id === collection.id)
          return (
            <Card key={collection.id} title={collection.title}>
              {links.length ? (
                <div className="link-list">
                  {links.map((link) => (
                    <a key={link.id} href={link.url} target="_blank" rel="noreferrer">
                      <div>
                        <strong>
                          {link.favorite && <Star size={14} />}
                          {link.title}
                        </strong>
                        <span>{link.description || link.url}</span>
                      </div>
                      {link.is_important && <Tag tone="warn">wichtig</Tag>}
                      <ExternalLink size={16} />
                    </a>
                  ))}
                </div>
              ) : (
                <EmptyState title="Leer" body="In dieser Sammlung sind noch keine Links." />
              )}
            </Card>
          )
        })}
        {!data.linkCollections.length && <EmptyState title="Keine Sammlungen" body="Seed oder Datenbank muss Links anlegen." />}
      </div>
    </div>
  )
}
