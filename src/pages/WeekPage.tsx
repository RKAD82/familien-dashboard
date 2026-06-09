import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { addDays, currentWeekDays, expandRecurringEvents, formatDay, formatLongDate, formatTime, isInCurrentWeek, toDateKey } from '../lib/date'
import { useFamilyRoute } from '../routes/context'
import { Card, EmptyState, Tag } from '../components/ui'

export const WeekPage = () => {
  const { data } = useFamilyRoute()
  const days = currentWeekDays()
  const [selectedKey, setSelectedKey] = useState(toDateKey(new Date()))
  const selectedDay = days.find((day) => toDateKey(day) === selectedKey) ?? days[0]
  const weekEvents = expandRecurringEvents(data.events, days[0], addDays(days[6], 1))
  const weekTasks = data.tasks.filter((task) => task.due_at && isInCurrentWeek(task.due_at) && task.status !== 'done')
  const selectedEvents = weekEvents.filter((event) => toDateKey(event.starts_at) === selectedKey)
  const selectedTasks = weekTasks.filter((task) => task.due_at && toDateKey(task.due_at) === selectedKey)

  return (
    <div className="page-grid week-page">
      <section className="page-title span-3">
        <div>
          <h1>Woche</h1>
          <p>Tage untereinander, antippen und Details lesen.</p>
        </div>
      </section>

      <div className="week-list">
        {days.map((day) => {
          const key = toDateKey(day)
          const dayEvents = weekEvents.filter((event) => toDateKey(event.starts_at) === key)
          const dayTasks = weekTasks.filter((task) => task.due_at && toDateKey(task.due_at) === key)

          return (
            <button
              key={key}
              className={`week-day-card ${key === selectedKey ? 'selected' : ''}`}
              type="button"
              onClick={() => setSelectedKey(key)}
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
                {event.is_important && <Tag tone="warn">wichtig</Tag>}
              </article>
            ))}
            {selectedTasks.map((task) => (
              <article key={task.id} className="task">
                <span>Aufgabe</span>
                <strong>{task.title}</strong>
                <small>{task.description || task.category}</small>
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
