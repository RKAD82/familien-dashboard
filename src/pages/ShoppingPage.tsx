import { useState, type FormEvent } from 'react'
import { Check, Plus, Printer, RotateCcw, ShoppingBasket, Trash2 } from 'lucide-react'
import { useFamilyRoute } from '../routes/context'
import { Button, Card, EmptyState, Field, Select, TextInput } from '../components/ui'

const singleItemsLabel = 'Einzelne Artikel'

export const ShoppingPage = () => {
  const { data, actions } = useFamilyRoute()
  const [activeListId, setActiveListId] = useState(data.shoppingLists[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [category, setCategory] = useState('')
  const [groupLabel, setGroupLabel] = useState(singleItemsLabel)
  const activeList = data.shoppingLists.find((list) => list.id === activeListId) ?? data.shoppingLists[0]
  const items = activeList ? data.shoppingItems.filter((item) => item.list_id === activeList.id) : []
  const groupedItems = items.reduce<Array<{ label: string; items: typeof items }>>((groups, item) => {
    const label = item.source_label ?? singleItemsLabel
    const existing = groups.find((group) => group.label === label)
    if (existing) {
      existing.items.push(item)
      return groups
    }
    groups.push({ label, items: [item] })
    return groups
  }, [])
  const groupOptions = [
    singleItemsLabel,
    ...Array.from(new Set(items.map((item) => item.source_label).filter((label): label is string => Boolean(label)))),
  ]

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!activeList || !title.trim()) {
      return
    }
    await actions.addShoppingItem(activeList.id, {
      title: title.trim(),
      quantity: quantity.trim() || null,
      unit: unit.trim() || null,
      category: category.trim() || null,
      source_label: groupLabel === singleItemsLabel ? null : groupLabel,
    })
    setTitle('')
    setQuantity('')
    setUnit('')
    setCategory('')
  }

  const clearList = async (checkedOnly: boolean) => {
    if (!activeList) {
      return
    }
    const text = checkedOnly ? 'Erledigte Artikel löschen?' : 'Diese Einkaufsliste wirklich leeren?'
    if (window.confirm(text)) {
      await actions.clearShoppingList(activeList.id, checkedOnly)
    }
  }

  return (
    <div className="page-grid shopping-page">
      <section className="page-title span-2">
        <div>
          <h1>Einkauf</h1>
          <p>Artikel ergänzen, abhaken, löschen, Liste leeren oder drucken.</p>
        </div>
      </section>

      <Card title="Listen">
        <div className="side-list">
          {data.shoppingLists.map((list) => (
            <button
              key={list.id}
              className={list.id === activeList?.id ? 'active' : ''}
              onClick={() => setActiveListId(list.id)}
            >
              <ShoppingBasket size={16} />
              {list.title}
            </button>
          ))}
        </div>
      </Card>

      <Card title="Artikel hinzufügen" className="span-2">
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
              Hinzufügen
            </Button>
          </form>
        ) : (
          <EmptyState title="Keine Liste" body="Lege per Seed oder Datenbank eine erste Einkaufsliste an." />
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
          <EmptyState title="Keine Liste" body="Lege per Seed oder Datenbank eine erste Einkaufsliste an." />
        )}
      </Card>
    </div>
  )
}
