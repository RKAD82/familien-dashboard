import { Bell, CalendarPlus, CheckCircle2, ShoppingCart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AssignmentBadge } from '../components/AssignmentBadge'
import { expandRecurringEvents, formatDay, formatTime, openTasks, sortByDate, tasksDueToday } from '../lib/date'
import { getUpcomingWasteEvents } from '../lib/waste'
import { useFamilyRoute } from '../routes/context'
import { Card, EmptyState, Tag } from '../components/ui'
import { WasteIcon } from '../components/WasteIcon'

export const TodayPage = () => {
  const { data } = useFamilyRoute()
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)
  const todayEvents = sortByDate(expandRecurringEvents(data.events, todayStart, todayEnd)).slice(0, 6)
  const todayTasks = tasksDueToday(data.tasks).slice(0, 6)
  const urgentTasks = openTasks(data.tasks).filter((task) => task.is_important).slice(0, 4)
  const nextWaste = getUpcomingWasteEvents(data.wasteEvents, now, 4)
  const shoppingList = data.shoppingLists[0]
  const shoppingItems = shoppingList
    ? data.shoppingItems.filter((item) => item.list_id === shoppingList.id && !item.checked).slice(0, 6)
    : []

  return (
    <div className="page-grid today-grid">
      <section className="page-title">
        <div>
          <h1>Heute</h1>
          <p>{new Intl.DateTimeFormat('de-DE', { dateStyle: 'full' }).format(new Date())}</p>
        </div>
        <Link to="/aufgaben" className="button button-secondary">
          <CalendarPlus size={18} />
          Aufgabe erfassen
        </Link>
      </section>

      <Card title="Tagesagenda" className="span-2">
        {todayEvents.length ? (
          <div className="timeline-list">
            {todayEvents.map((event) => (
              <article key={event.id} className="timeline-item">
                <span>{event.all_day ? 'ganztags' : formatTime(event.starts_at)}</span>
                <div>
                  <strong>{event.title}</strong>
                  <small>{event.location || event.category}</small>
                  <div className="assignment-row">
                    <AssignmentBadge compact label="Zuständig" membershipId={event.assignee_membership_id} memberships={data.memberships} />
                    <AssignmentBadge compact label="Bringt" membershipId={event.bring_membership_id} memberships={data.memberships} />
                    <AssignmentBadge compact label="Holt" membershipId={event.pickup_membership_id} memberships={data.memberships} />
                  </div>
                </div>
                {event.is_important && <Tag tone="warn">wichtig</Tag>}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Keine Termine heute" body="Der Kalender ist für heute frei." />
        )}
      </Card>

      <Card title="Fällig heute">
        {todayTasks.length ? (
          <div className="task-list">
            {todayTasks.map((task) => (
              <Link key={task.id} to={`/aufgaben?task=${task.id}`} className="task-row">
                <CheckCircle2 size={18} />
                <span>{task.title}</span>
                <AssignmentBadge compact label="Zuständig" membershipId={task.assignee_membership_id} memberships={data.memberships} />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="Nichts fällig" body="Keine Aufgabe ist auf heute gesetzt." />
        )}
      </Card>

      <Card title="Wichtige Punkte">
        {urgentTasks.length ? (
          <div className="compact-list">
            {urgentTasks.map((task) => (
              <Link key={task.id} to={`/aufgaben?task=${task.id}`}>
                <Bell size={16} />
                <div>
                  <strong>{task.title}</strong>
                  <span>{task.description || task.category}</span>
                  <AssignmentBadge compact label="Zuständig" membershipId={task.assignee_membership_id} memberships={data.memberships} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="Ruhig" body="Keine offenen wichtigen Aufgaben." />
        )}
      </Card>

      <Card title="Einkauf">
        {shoppingItems.length ? (
          <div className="compact-list">
            {shoppingItems.map((item) => (
              <article key={item.id}>
                <ShoppingCart size={16} />
                <span>{item.title}</span>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Liste leer" body="Keine offenen Artikel auf der ersten Liste." />
        )}
      </Card>

      <Card title="Nächste Abholungen" className="span-2">
        <div className="waste-strip">
          {nextWaste.map((event) => (
            <article key={event.id}>
              <WasteIcon type={event.waste_type} />
              <strong>{event.title}</strong>
              <span>{formatDay(`${event.date}T06:00:00Z`)}</span>
            </article>
          ))}
        </div>
      </Card>
    </div>
  )
}
