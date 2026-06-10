import { useState, type FormEvent } from 'react'
import { Check, Plus, Printer, RotateCcw, ShoppingBasket, Trash2 } from 'lucide-react'
import { useFamilyRoute } from '../routes/context'
import { Button, Card, EmptyState, Field, Select, Tag, TextInput } from '../components/ui'
import type { ShoppingItem } from '../types'

const singleItemsLabel = 'Einzelne Artikel'

export const ShoppingPage = () => {
  const { data, actions } = useFamilyRoute()
  const regularLists = data.shoppingLists.filter((list) => !list.is_template)
  const templateLists = data.shoppingLists.filter((list) => list.is_template)
  const [activeListId, setActiveListId] = useState(regularLists[0]?.id ?? data.shoppingLists[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [category, setCategory] = useState('')
  const [groupLabel, setGroupLabel] = useState(singleItemsLabel)
  const [listTitle, setListTitle] = useState('')
  const [listType, setListType] = useState('supermarkt')
  const [listTemplate, setListTemplate] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const activeList = data.shoppingLists.find((list) => list.id === activeListId) ?? regularLists[0] ?? data.shoppingLists[0]
  const items = activeList ? data.shoppingItems.filter((item) => item.list_id === activeList.id) : []
  const checkedItems = items.filter((item) => item.checked).length
  const groupedItems = items.reduce<Array<{ label: string; items: ShoppingItem[] }>>((groups, item) => {
    const label = item.source_label ?? singleItemsLabel
    const existing = groups.find((group) => group.label === label)
    if (existing) existing.items.push(item)
    else groups.push({ label, items: [item] })
    return groups
  }, [])
  const groupOptions = [
    singleItemsLabel,
    ...Array.from(new Set(items.map((item) => item.source_label).filter((label): label is string => Boolean(label)))),
  ]

  const resetItemForm = () => {
    setTitle('')
    setQuantity('')
    setUnit('')
    setCategory('')
    setGroupLabel(singleItemsLabel)
    setEditingItemId(null)
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!activeList || !title.trim()) return
    const input = {
      title: title.trim(),
      quantity: quantity.trim() || null,
      unit: unit.trim() || null,
      category: category.trim() || null,
      source_label: groupLabel === singleItemsLabel ? null : groupLabel,
    }
    const editingItem = editingItemId ? data.shoppingItems.find((item) => item.id === editingItemId) : null
    if (editingItem) await actions.updateShoppingItem(editingItem, input)
    else await actions.addShoppingItem(activeList.id, input)
    resetItemForm()
  }

  const editItem = (item: ShoppingItem) => {
    setEditingItemId(item.id)
    setTitle(item.title)
    setQuantity(item.quantity ?? '')
    setUnit(item.unit ?? '')
    setCategory(item.category ?? '')
    setGroupLabel(item.source_label ?? singleItemsLabel)
  }

  const createList = async () => {
    if (!listTitle.trim()) return
    await actions.createShoppingList({ title: listTitle.trim(), store_type: listType.trim() || 'supermarkt', is_template: listTemplate })
    setListTitle('')
    setListTemplate(false)
  }

  const clearList = async (checkedOnly: boolean) => {
    if (!activeList) return
    const text = checkedOnly ? 'Erledigte Artikel löschen?' : 'Diese Einkaufsliste wirklich leeren?'
    if (window.confirm(text)) await actions.clearShoppingList(activeList.id, checkedOnly)
  }

  return (
    <div className="page-grid shopping-page">
      <section className="page-title span-3">
        <div>
          <h1>Einkauf</h1>
          <p>Listen, Vorlagen und Artikel für den nächsten Einkauf pflegen.</p>
        </div>
        <div className="page-actions">
          <Tag>{regularLists.length} Listen</Tag>
          <Tag tone="info">{items.length} Artikel</Tag>
          <Tag tone="good">{checkedItems} erledigt</Tag>
        </div>
      </section>

      <Card title="Listen">
        <div className="side-list">
          {regularLists.map((list) => (
            <button key={list.id} className={list.id === activeList?.id ? 'active' : ''} onClick={() => setActiveListId(list.id)}>
              <ShoppingBasket size={16} />
              {list.title}
            </button>
          ))}
          {templateLists.map((list) => (
            <button key={list.id} className={list.id === activeList?.id ? 'active' : ''} onClick={() => setActiveListId(list.id)}>
              <ShoppingBasket size={16} />
              Vorlage: {list.title}
            </button>
          ))}
        </div>
        <div className="form-stack compact-form">
          <Field label="Neue Liste/Vorlage">
            <TextInput value={listTitle} onChange={(event) => setListTitle(event.target.value)} />
          </Field>
          <Field label="Typ">
            <TextInput value={listType} onChange={(event) => setListType(event.target.value)} />
          </Field>
          <label className="check-line">
            <input checked={listTemplate} type="checkbox" onChange={(event) => setListTemplate(event.target.checked)} />
            Als Vorlage speichern
          </label>
          <Button onClick={() => void createList()}>Liste anlegen</Button>
        </div>
      </Card>

      <Card title={editingItemId ? 'Artikel bearbeiten' : 'Artikel hinzufügen'} className="span-2">
        {activeList ? (
          <form className="form-stack" onSubmit={onSubmit}>
            <Field label="Artikel">
              <TextInput placeholder="z.B. Tomaten" value={title} onChange={(event) => setTitle(event.target.value)} />
            </Field>
            <div className="three-column-fields">
              <Field label="Menge">
                <TextInput placeholder="2" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
              </Field>
              <Field label="Einheit">
                <TextInput placeholder="kg" value={unit} onChange={(event) => setUnit(event.target.value)} />
              </Field>
              <Field label="Kategorie">
                <TextInput placeholder="Gemüse" value={category} onChange={(event) => setCategory(event.target.value)} />
              </Field>
            </div>
            <Field label="Bereich">
              <Select value={groupLabel} onChange={(event) => setGroupLabel(event.target.value)}>
                {groupOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </Select>
            </Field>
            <Button type="submit">
              <Plus size={18} />
              {editingItemId ? 'Artikel ändern' : 'Hinzufügen'}
            </Button>
            {editingItemId && (
              <Button variant="ghost" onClick={resetItemForm}>
                Bearbeitung abbrechen
              </Button>
            )}
          </form>
        ) : (
          <EmptyState title="Keine Liste" body="Lege links eine erste Einkaufsliste an." />
        )}
      </Card>

      <Card title={activeList?.title ?? 'Keine Einkaufsliste'} className="span-3 print-card">
        {activeList ? (
          <>
            <div className="action-row shopping-actions">
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer size={18} />
                Drucken / PDF
              </Button>
              <Button variant="secondary" onClick={() => void clearList(true)}>
                <Trash2 size={18} />
                Erledigte löschen
              </Button>
              <Button variant="danger" onClick={() => void clearList(false)}>
                <Trash2 size={18} />
                Liste leeren
              </Button>
              {activeList.is_template ? (
                <Button variant="secondary" onClick={() => void actions.copyShoppingListFromTemplate(activeList, `${activeList.title} aktuell`)}>
                  Vorlage verwenden
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => void actions.updateShoppingList(activeList, { ...activeList, is_template: true, archived: false })}>
                  Als Vorlage speichern
                </Button>
              )}
              {actions.resetDemoData && (
                <Button variant="ghost" onClick={() => void actions.resetDemoData?.()}>
                  <RotateCcw size={18} />
                  Demo zurücksetzen
                </Button>
              )}
            </div>
            <div className="shopping-items">
              {groupedItems.map((group) => (
                <section key={group.label} className="shopping-group">
                  <h2>{group.label}</h2>
                  {group.items.map((item) => (
                    <article key={item.id} className={`shopping-row ${item.checked ? 'checked' : ''}`}>
                      <button aria-label={`${item.title} abhaken`} onClick={() => void actions.toggleShoppingItem(item)}>
                        {item.checked && <Check size={16} />}
                      </button>
                      <div>
                        <strong>{item.title}</strong>
                        <span>
                          {[item.quantity, item.unit].filter(Boolean).join(' ')}
                          {item.category ? ` · ${item.category}` : ''}
                        </span>
                      </div>
                      <button aria-label={`${item.title} bearbeiten`} onClick={() => editItem(item)}>
                        Bearbeiten
                      </button>
                      <button aria-label={`${item.title} löschen`} onClick={() => void actions.deleteShoppingItem(item)}>
                        <Trash2 size={16} />
                      </button>
                    </article>
                  ))}
                </section>
              ))}
              {!items.length && <p className="muted">Diese Liste ist leer.</p>}
            </div>
          </>
        ) : (
          <EmptyState title="Keine Liste" body="Lege links eine erste Einkaufsliste an." />
        )}
      </Card>
    </div>
  )
}
