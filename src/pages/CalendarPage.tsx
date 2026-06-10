import { useState, type FormEvent } from 'react'
import { CalendarDays, Plus } from 'lucide-react'
import { AssignmentBadge } from '../components/AssignmentBadge'
import { expandRecurringEvents, formatLongDate, formatTime, sortByDate, toDateKey } from '../lib/date'
import { activeMemberships } from '../lib/assignments'
import { useFamilyRoute } from '../routes/context'
import { Button, Card, EmptyState, Field, Select, Tag, TextArea, TextInput } from '../components/ui'

const months = Array.from({ length: 12 }, (_, index) => index)

const localDateTimeToIso = (date: string, time: string) => new Date(`${date}T${time}`).toISOString()

export const CalendarPage = () => {
  const { data, actions } = useFamilyRoute()
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()))
  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [category, setCategory] = useState('Familie')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [assigneeMembershipId, setAssigneeMembershipId] = useState('')
  const [bringMembershipId, setBringMembershipId] = useState('')
  const [pickupMembershipId, setPickupMembershipId] = useState('')
  const [repeatWeekly, setRepeatWeekly] = useState(false)
  const [important, setImportant] = useState(false)
  const [notify, setNotify] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const year = Number(selectedDate.slice(0, 4))
  const yearEvents = expandRecurringEvents(data.events, new Date(year, 0, 1), new Date(year + 1, 0, 1))
  const selectedEvents = sortByDate(yearEvents.filter((event) => toDateKey(event.starts_at) === selectedDate))
  const editingEvent = editingEventId ? data.events.find((event) => event.id === editingEventId) ?? null : null
  const assignableMembers = activeMemberships(data.memberships)
  const importantEvents = yearEvents.filter((event) => event.is_important).length

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) {
      return
    }

    const payload = {
      title: title.trim(),
      starts_at: localDateTimeToIso(selectedDate, allDay ? '09:00' : startTime || '09:00'),
      ends_at: !allDay && endTime ? localDateTimeToIso(selectedDate, endTime) : null,
      all_day: allDay,
      recurrence_rule: repeatWeekly ? 'FREQ=WEEKLY' : null,
      assignee_membership_id: assigneeMembershipId || null,
      bring_membership_id: bringMembershipId || null,
      pickup_membership_id: pickupMembershipId || null,
      category,
      location: location.trim() || null,
      notes: notes.trim() || null,
      is_important: important,
      notify_family: notify,
    }

    if (editingEvent) {
      await actions.updateEvent(editingEvent, payload)
    } else {
      await actions.createEvent(payload)
    }

    setTitle('')
    setEndTime('')
    setLocation('')
    setNotes('')
    setAssigneeMembershipId('')
    setBringMembershipId('')
    setPickupMembershipId('')
    setRepeatWeekly(false)
    setImportant(false)
    setNotify(false)
    setEditingEventId(null)
  }

  const startEditEvent = (eventId: string) => {
    const source = data.events.find((event) => event.id === eventId)
    if (!source) return
    const start = new Date(source.starts_at)
    const end = source.ends_at ? new Date(source.ends_at) : null
    setEditingEventId(source.id)
    setSelectedDate(toDateKey(source.starts_at))
    setTitle(source.title)
    setStartTime(start.toTimeString().slice(0, 5))
    setEndTime(end ? end.toTimeString().slice(0, 5) : '')
    setAllDay(source.all_day)
    setCategory(source.category)
    setLocation(source.location ?? '')
    setNotes(source.notes ?? '')
    setAssigneeMembershipId(source.assignee_membership_id ?? '')
    setBringMembershipId(source.bring_membership_id ?? '')
    setPickupMembershipId(source.pickup_membership_id ?? '')
    setRepeatWeekly(Boolean(source.recurrence_rule))
    setImportant(source.is_important)
    setNotify(source.notify_family)
  }

  const deleteEvent = async (eventId: string) => {
    const source = data.events.find((event) => event.id === eventId)
    if (!source) return
    if (window.confirm(`Termin "${source.title}" wirklich löschen?`)) {
      await actions.deleteEvent(source)
    }
  }

  return (
    <div className="page-grid calendar-page">
      <section className="page-title span-3">
        <div>
          <h1>Kalender {year}</h1>
          <p>Jahresblick, Tagesdetails und Terminpflege in einer Ansicht.</p>
        </div>
        <div className="page-actions">
          <Tag>{yearEvents.length} Termine</Tag>
          <Tag tone="warn">{importantEvents} wichtig</Tag>
          <Tag tone="info">{assignableMembers.length} Personen</Tag>
        </div>
      </section>

      <Card title={editingEvent ? 'Termin bearbeiten' : 'Termin eintragen'} className="calendar-form-card">
        <form className="form-stack" onSubmit={onSubmit}>
          <Field label="Datum">
            <TextInput type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          </Field>
          <Field label="Titel">
            <TextInput value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>
          <div className="two-column-fields">
            <Field label="Start">
              <TextInput type="time" value={startTime} disabled={allDay} onChange={(event) => setStartTime(event.target.value)} />
            </Field>
            <Field label="Ende">
              <TextInput type="time" value={endTime} disabled={allDay} onChange={(event) => setEndTime(event.target.value)} />
            </Field>
          </div>
          <label className="check-line">
            <input type="checkbox" checked={allDay} onChange={(event) => setAllDay(event.target.checked)} />
            Ganztägig
          </label>
          <label className="check-line">
            <input type="checkbox" checked={repeatWeekly} onChange={(event) => setRepeatWeekly(event.target.checked)} />
            Jede Woche an diesem Wochentag anzeigen
          </label>
          <Field label="Kategorie">
            <Select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option>Familie</option>
              <option>Schule/Kita</option>
              <option>Gesundheit</option>
              <option>Freizeit</option>
              <option>Abfall</option>
            </Select>
          </Field>
          <Field label="Ort">
            <TextInput value={location} onChange={(event) => setLocation(event.target.value)} />
          </Field>
          <Field label="Zuständig">
            <Select value={assigneeMembershipId} onChange={(event) => setAssigneeMembershipId(event.target.value)}>
              <option value="">Nicht festgelegt</option>
              {assignableMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.display_name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="two-column-fields">
            <Field label="Bringt">
              <Select value={bringMembershipId} onChange={(event) => setBringMembershipId(event.target.value)}>
                <option value="">Nicht festgelegt</option>
                {assignableMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.display_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Holt">
              <Select value={pickupMembershipId} onChange={(event) => setPickupMembershipId(event.target.value)}>
                <option value="">Nicht festgelegt</option>
                {assignableMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.display_name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Notiz">
            <TextArea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
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
            {editingEvent ? 'Termin ändern' : 'Termin speichern'}
          </Button>
          {editingEvent && (
            <Button variant="ghost" onClick={() => setEditingEventId(null)}>
              Bearbeitung abbrechen
            </Button>
          )}
        </form>
      </Card>

      <Card
        title={formatLongDate(`${selectedDate}T09:00:00`)}
        className="span-2 calendar-day-detail-card"
        action={<Tag tone={selectedEvents.length ? 'info' : 'neutral'}>{selectedEvents.length || 'frei'}</Tag>}
      >
        {selectedEvents.length ? (
          <div className="timeline-list">
            {selectedEvents.map((event) => (
              <article key={event.id} className="timeline-item">
                <span>{event.all_day ? 'ganztags' : formatTime(event.starts_at)}</span>
                <div>
                  <strong>{event.title}</strong>
                  <small>{event.location || event.category}</small>
                  {event.notes && <small>{event.notes}</small>}
                  <div className="assignment-row">
                    <AssignmentBadge label="Zuständig" membershipId={event.assignee_membership_id} memberships={data.memberships} />
                    <AssignmentBadge label="Bringt" membershipId={event.bring_membership_id} memberships={data.memberships} />
                    <AssignmentBadge label="Holt" membershipId={event.pickup_membership_id} memberships={data.memberships} />
                  </div>
                </div>
                {event.is_important && <Tag tone="warn">wichtig</Tag>}
                <div className="inline-actions">
                  <button type="button" onClick={() => startEditEvent(data.events.find((source) => event.id.startsWith(source.id))?.id ?? event.id)}>
                    Bearbeiten
                  </button>
                  <button type="button" onClick={() => void deleteEvent(data.events.find((source) => event.id.startsWith(source.id))?.id ?? event.id)}>
                    Löschen
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Kein Termin" body="Für diesen Tag ist noch nichts eingetragen." />
        )}
      </Card>

      <div className="year-grid calendar-year-grid span-3">
        {months.map((month) => {
          const monthEvents = yearEvents.filter((event) => {
            const date = new Date(event.starts_at)
            return date.getFullYear() === year && date.getMonth() === month
          })
          const first = new Date(year, month, 1)
          const daysInMonth = new Date(year, month + 1, 0).getDate()
          const leading = (first.getDay() + 6) % 7

          return (
            <Card key={month}>
              <div className="calendar-month-title">
                <CalendarDays size={18} />
                <h2>{first.toLocaleString('de-DE', { month: 'long' })}</h2>
                <Tag>{monthEvents.length}</Tag>
              </div>
              <div className="calendar-grid-small">
                {['M', 'D', 'M', 'D', 'F', 'S', 'S'].map((day, index) => (
                  <span key={`${day}-${index}`} className="weekday">
                    {day}
                  </span>
                ))}
                {Array.from({ length: leading }, (_, index) => (
                  <span key={`empty-${index}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, day) => {
                  const date = new Date(year, month, day + 1)
                  const key = toDateKey(date)
                  const entries = monthEvents.filter((event) => toDateKey(event.starts_at) === key)
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`calendar-day-button ${entries.length ? 'has-event' : ''} ${key === selectedDate ? 'selected' : ''}`}
                      title={entries.map((event) => event.title).join(', ')}
                      onClick={() => setSelectedDate(key)}
                    >
                      {day + 1}
                    </button>
                  )
                })}
              </div>
              {monthEvents.length ? (
                <div className="month-events">
                  {monthEvents.slice(0, 3).map((event) => (
                    <article key={event.id}>
                      <strong>{event.title}</strong>
                      <span>{formatLongDate(event.starts_at)}</span>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState title="Keine Familientermine" body="Noch keine Einträge in diesem Monat." />
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
