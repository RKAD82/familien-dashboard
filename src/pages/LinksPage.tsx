import { useState, type FormEvent } from 'react'
import { ExternalLink, Pencil, Plus, Star, X } from 'lucide-react'
import { useFamilyRoute } from '../routes/context'
import { Button, Card, EmptyState, Field, Select, Tag, TextInput } from '../components/ui'
import type { FamilyLink } from '../types'

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
  const [editingLink, setEditingLink] = useState<FamilyLink | null>(null)
  const [newCollectionTitle, setNewCollectionTitle] = useState('')
  const activeCollection = data.linkCollections.find((collection) => collection.id === collectionId) ?? data.linkCollections[0]
  const favoriteLinks = data.links.filter((link) => link.favorite).length

  const resetForm = () => {
    setEditingLink(null)
    setTitle('')
    setUrl('')
    setDescription('')
    setFavorite(true)
    setCollectionId(data.linkCollections[0]?.id ?? '')
  }

  const startEdit = (link: FamilyLink) => {
    setEditingLink(link)
    setCollectionId(link.collection_id)
    setTitle(link.title)
    setUrl(link.url)
    setDescription(link.description ?? '')
    setFavorite(link.favorite)
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!activeCollection || !title.trim() || !url.trim()) {
      return
    }

    const input = {
      collection_id: activeCollection.id,
      title: title.trim(),
      url: normalizeUrl(url),
      description: description.trim() || null,
      favorite,
      is_important: false,
      notify_family: false,
    }

    if (editingLink) {
      await actions.updateLink(editingLink, input)
    } else {
      await actions.createLink(input)
    }
    resetForm()
  }

  const onCreateCollection = async (event: FormEvent) => {
    event.preventDefault()
    if (!newCollectionTitle.trim()) return
    const collection = await actions.createLinkCollection({
      title: newCollectionTitle.trim(),
      sort_order: data.linkCollections.length + 1,
    })
    setNewCollectionTitle('')
    setCollectionId(collection.id)
  }

  return (
    <div className="page-grid links-page">
      <section className="page-title span-3">
        <div>
          <h1>Links</h1>
          <p>Zentrale Sammlung für die Seiten, die im Familienalltag wiederkehren.</p>
        </div>
        <div className="page-actions">
          <Tag>{data.linkCollections.length} Sammlungen</Tag>
          <Tag tone="info">{data.links.length} Links</Tag>
          <Tag tone="warn">{favoriteLinks} Favoriten</Tag>
        </div>
      </section>

      <Card
        title={editingLink ? 'Link bearbeiten' : 'Link anlegen'}
        action={
          editingLink ? (
            <button type="button" className="text-button" onClick={resetForm}>
              <X size={16} />
              Abbrechen
            </button>
          ) : null
        }
      >
        <div className="form-stack">
          <form className="inline-form link-collection-create" onSubmit={onCreateCollection}>
            <TextInput placeholder="Neue Sammlung, z. B. Schule" value={newCollectionTitle} onChange={(event) => setNewCollectionTitle(event.target.value)} />
            <Button variant="secondary" type="submit">
              <Plus size={18} />
              Sammlung anlegen
            </Button>
          </form>

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
                {editingLink ? <Pencil size={18} /> : <Plus size={18} />}
                {editingLink ? 'Änderungen speichern' : 'Link speichern'}
              </Button>
            </form>
          ) : (
            <EmptyState title="Keine Sammlung" body="Bitte zuerst eine Sammlung anlegen." />
          )}
        </div>
      </Card>

      <div className="collection-grid span-2">
        {data.linkCollections.map((collection) => {
          const links = data.links.filter((link) => link.collection_id === collection.id)
          return (
            <Card key={collection.id} title={collection.title}>
              {links.length ? (
                <div className="link-list">
                  {links.map((link) => (
                    <article key={link.id} className="link-row">
                      <a className="link-main" href={link.url} target="_blank" rel="noreferrer">
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
                      <div className="inline-actions">
                        <button type="button" onClick={() => startEdit(link)}>
                          Bearbeiten
                        </button>
                        <button type="button" onClick={() => void actions.deleteLink(link)}>
                          Löschen
                        </button>
                      </div>
                    </article>
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
