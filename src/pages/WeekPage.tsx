import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { AssignmentBadge } from '../components/AssignmentBadge'
import { addDays, currentWeekDays, expandRecurringEvents, formatDay, formatLongDate, formatTime, isInCurrentWeek, toDateKey } from '../lib/date'
import { useFamilyRoute } from '../routes/context'
import { Card, EmptyState, Tag } from '../components/ui'

export const WeekPage = () => {
  const { data } = useFamilyRoute()
  const [searchParams, setSearchParams] = useSearchParams()
  const days = currentWeekDays()
  const requestedDay = searchParams.get('tag')
  const [selectedKey, setSelectedKey] = useState(requestedDay ?? toDateKey(new Date()))
  const activeKey = days.some((day) => toDateKey(day) === requestedDay) ? requestedDay ?? selectedKey : selectedKey
  const selectedDay = days.find((day) => toDateKey(day) === activeKey) ?? days[0]
  const weekEvents = expandRecurringEvents(data.events, days[0], addDays(days[6], 1))
  const weekTasks = data.tasks.filter((task) => task.due_at && isInCurrentWeek(task.due_at) && task.status !== 'done')
  const selectedEvents = weekEvents.filter((event) => toDateKey(event.starts_at) === activeKey)
  const selectedTasks = weekTasks.filter((task) => task.due_at && toDateKey(task.due_at) === activeKey)
  const busyDays = days.filter((day) => {
    const key = toDateKey(day)
    return weekEvents.some((event) => toDateKey(event.starts_at) === key) || weekTasks.some((task) => task.due_at && toDateKey(task.due_at) === key)
  }).length
  const selectDay = (key: string) => {
    setSelectedKey(key)
    setSearchParams({ tag: key })
  }

  return (
    <div className="page-grid week-page">
      <section className="page-title span-3">
        <div>
          <h1>Woche</h1>
          <p>Eine ruhige Wochenübersicht mit Tagesauswahl, Terminen und offenen Aufgaben.</p>
        </div>
        <div className="page-actions">
          <Tag>{busyDays} aktive Tage</Tag>
          <Tag tone="info">{weekEvents.length} Termine</Tag>
          <Tag tone="warn">{weekTasks.length} Aufgaben</Tag>
        </div>
      </section>

      <div className="week-list week-selector">
        {days.map((day) => {
          const key = toDateKey(day)
          const dayEvents = weekEvents.filter((event) => toDateKey(event.starts_at) === key)
          const dayTasks = weekTasks.filter((task) => task.due_at && toDateKey(task.due_at) === key)

          return (
            <button
              key={key}
              className={`week-day-card ${key === activeKey ? 'selected' : ''}`}
              type="button"
              onClick={() => selectDay(key)}
            >
              <div className="week-day-title">
                <CalendarDays size={18} />
                <strong>{formatDay(day)}</strong>
              </div>
              <span>{dayEvents.length} Termine · {dayTasks.length} Aufgaben</span>
              {(dayEvents.length || dayTasks.length) ? (
                <strong>{dayEvents[0]?.title ?? dayTasks[0]?.title}</strong>
              ) : (
                <small>frei</small>
              )}
            </button>
          )
        })}
      </div>

      <Card title={formatLongDate(selectedDay)} className="week-detail-card span-2">
        {selectedEvents.length || selectedTasks.length ? (
          <div className="day-items day-items-large">
            {selectedEvents.map((event) => (
              <article key={event.id}>
                <span>{event.all_day ? 'ganztags' : formatTime(event.starts_at)}</span>
                <strong>{event.title}</strong>
                <small>{event.location || event.category}</small>
                <div className="assignment-row">
                  <AssignmentBadge compact label="Zuständig" membershipId={event.assignee_membership_id} memberships={data.memberships} />
                  <AssignmentBadge compact label="Bringt" membershipId={event.bring_membership_id} memberships={data.memberships} />
                  <AssignmentBadge compact label="Holt" membershipId={event.pickup_membership_id} memberships={data.memberships} />
                </div>
                {event.is_important && <Tag tone="warn">wichtig</Tag>}
              </article>
            ))}
            {selectedTasks.map((task) => (
              <article key={task.id} className="task">
                <span>Aufgabe</span>
                <strong>{task.title}</strong>
                <small>{task.description || task.category}</small>
                <AssignmentBadge compact label="Zuständig" membershipId={task.assignee_membership_id} memberships={data.memberships} />
                {task.is_important && <Tag tone="warn">wichtig</Tag>}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="frei" body="Keine Einträge an diesem Tag." />
        )}
      </Card>
    </div>
  )
}
