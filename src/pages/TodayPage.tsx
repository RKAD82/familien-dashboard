import { Check, CheckCircle2, Clock3, ShoppingCart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { expandRecurringEvents, formatDay, formatTime, isToday, openTasks, sortByDate, tasksDueToday } from '../lib/date'
import { findMembership, memberAvatarColor, memberAvatarSoftColor, memberInitials } from '../lib/assignments'
import { getUpcomingWasteEvents } from '../lib/waste'
import { useFamilyRoute } from '../routes/context'
import { WasteIcon } from '../components/WasteIcon'
import type { EventItem, FamilyMembership, TaskItem } from '../types'
import type { CSSProperties } from 'react'

const greetingFor = (date: Date) => {
  const hour = date.getHours()
  if (hour < 11) return 'Guten Morgen'
  if (hour < 17) return 'Guten Tag'
  return 'Guten Abend'
}

const runningEvent = (events: EventItem[], now: Date) =>
  events.find((event) => {
    if (event.all_day) return true
    const starts = new Date(event.starts_at)
    const ends = event.ends_at ? new Date(event.ends_at) : new Date(starts.getTime() + 60 * 60 * 1000)
    return starts <= now && ends >= now
  }) ?? null

const nextEventAfter = (events: EventItem[], now: Date) =>
  events.find((event) => !event.all_day && new Date(event.starts_at) > now) ?? events.find((event) => event.all_day) ?? null

const dueLabel = (task: TaskItem) => {
  if (!task.due_at) return 'offen'
  if (isToday(task.due_at)) return new Date(task.due_at).getHours() === 0 ? 'heute' : formatTime(task.due_at)
  return formatDay(task.due_at)
}

const isUrgentTask = (task: TaskItem, now: Date) => Boolean(task.is_important || (task.due_at && new Date(task.due_at) < now))

const memberStatus = (member: FamilyMembership, events: EventItem[], tasks: TaskItem[]) => {
  const assignedEvent = events.find(
    (event) =>
      event.assignee_membership_id === member.id ||
      event.bring_membership_id === member.id ||
      event.pickup_membership_id === member.id,
  )
  if (assignedEvent) {
    if (assignedEvent.pickup_membership_id === member.id) return `holt ${assignedEvent.title}`
    if (assignedEvent.bring_membership_id === member.id) return `bringt ${assignedEvent.title}`
    return assignedEvent.all_day ? assignedEvent.title : `${formatTime(assignedEvent.starts_at)} · ${assignedEvent.title}`
  }

  const assignedTask = tasks.find((task) => task.assignee_membership_id === member.id)
  return assignedTask ? assignedTask.title : 'heute ohne feste Aufgabe'
}

const doneText = (tasks: TaskItem[], members: FamilyMembership[]) => {
  if (!tasks.length) return 'Noch nichts abgehakt. Der Tag ist bereit.'
  return tasks
    .slice(0, 3)
    .map((task) => {
      const member = findMembership(members, task.assignee_membership_id)
      return member ? `${member.display_name} · ${task.title}` : task.title
    })
    .join(' · ')
}

export const TodayPage = () => {
  const { data, actions, currentMembership } = useFamilyRoute()
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  const activeMembers = data.memberships.filter((entry) => entry.active)
  const todayEvents = sortByDate(expandRecurringEvents(data.events, todayStart, todayEnd)).slice(0, 8)
  const currentEvent = runningEvent(todayEvents, now)
  const upcomingEvent = nextEventAfter(todayEvents.filter((event) => event.id !== currentEvent?.id), now)
  const allOpenTasks = openTasks(data.tasks)
  const personalTasks = currentMembership
    ? allOpenTasks.filter((task) => task.assignee_membership_id === currentMembership.id).slice(0, 4)
    : allOpenTasks.slice(0, 4)
  const todayTasks = tasksDueToday(data.tasks)
  const doneTasks = data.tasks
    .filter((task) => task.status === 'done' && (task.updated_at ? isToday(task.updated_at) : task.due_at ? isToday(task.due_at) : true))
    .slice(0, 4)
  const progressTotal = Math.max(todayTasks.length + doneTasks.length, personalTasks.length + doneTasks.length, 1)
  const nextWaste = getUpcomingWasteEvents(data.wasteEvents, now, 2)
  const shoppingList = data.shoppingLists[0]
  const shoppingItems = shoppingList
    ? data.shoppingItems.filter((item) => item.list_id === shoppingList.id && !item.checked).slice(0, 4)
    : []
  const hiddenShoppingItems = shoppingList
    ? Math.max(data.shoppingItems.filter((item) => item.list_id === shoppingList.id && !item.checked).length - shoppingItems.length, 0)
    : 0

  const heroStyle = {
    '--hero-person-color': memberAvatarColor(currentMembership, activeMembers),
  } as CSSProperties
  const personName = currentMembership?.display_name.split(' ')[0] ?? 'Familie'
  const wasteHint = nextWaste[0]?.title
  const heroSummary = currentMembership
    ? `${personalTasks.length} ${personalTasks.length === 1 ? 'Aufgabe' : 'Aufgaben'} für dich`
    : `${allOpenTasks.length} offene Punkte`

  return (
    <div className="today-command" style={heroStyle}>
      <section className="today-hero">
        <div className="today-hero-glow" />
        <div className="today-greeting">{greetingFor(now)}</div>
        <h1>
          Hallo <span>{personName}</span>. Heute sind <b>{heroSummary}</b>, {todayEvents.length || 'keine'} Termine
          {wasteHint ? (
            <>
              {' '}
              und <b>{wasteHint}</b>
            </>
          ) : (
            ' und die Familie im Blick'
          )}
          .
        </h1>
        <div className="today-now-panel" aria-label="Jetzt und als nächstes">
          <span className="today-now-pulse" />
          <div>
            <div className="today-now-label">Jetzt läuft</div>
            <strong>{currentEvent ? currentEvent.title : 'Ruhiger Moment'}</strong>
          </div>
          <span className="today-now-separator" />
          <div>
            <div className="today-now-label muted">Als Nächstes</div>
            <span>{upcomingEvent ? `${formatTime(upcomingEvent.starts_at)} · ${upcomingEvent.title}` : 'heute nichts Weiteres'}</span>
          </div>
        </div>
      </section>

      <section className="today-card today-task-card">
        <div className="today-card-title">
          <h2>Deine Aufgaben</h2>
          <span>{personalTasks.length} offen</span>
        </div>
        <div className="today-task-list">
          {personalTasks.length ? (
            personalTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                className="today-task"
                onClick={() => void actions.updateTaskStatus(task, 'done')}
              >
                <span className="today-task-check" aria-hidden="true" />
                <span>{task.title}</span>
                <time className={isUrgentTask(task, now) ? 'is-urgent' : ''}>{dueLabel(task)}</time>
              </button>
            ))
          ) : (
            <p className="today-empty">Für dich ist gerade nichts offen.</p>
          )}
        </div>
      </section>

      <section className="today-card today-shopping-card">
        <div className="today-card-title">
          <h2>Einkauf offen</h2>
          <Link to="/einkauf">Liste öffnen</Link>
        </div>
        <div className="today-shopping-list">
          {shoppingItems.length ? (
            shoppingItems.map((item) => (
              <button key={item.id} type="button" onClick={() => void actions.toggleShoppingItem(item)}>
                <ShoppingCart size={16} />
                <span>{item.title}</span>
              </button>
            ))
          ) : (
            <p className="today-empty">Keine offenen Artikel.</p>
          )}
        </div>
        {hiddenShoppingItems > 0 && <p className="today-more">+ {hiddenShoppingItems} weitere</p>}
      </section>

      <section className="today-family-card">
        <div className="today-card-title">
          <h2>Die Familie heute</h2>
        </div>
        <div className="today-family-row">
          {activeMembers.slice(0, 4).map((member) => (
            <article
              key={member.id}
              className="today-person-pill"
              style={
                {
                  '--member-color': memberAvatarColor(member, activeMembers),
                  '--member-soft-color': memberAvatarSoftColor(member, activeMembers),
                } as CSSProperties
              }
            >
              <span>{memberInitials(member)}</span>
              <div>
                <strong>{member.display_name}</strong>
                <small>{memberStatus(member, todayEvents, allOpenTasks)}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="today-done-strip">
        <CheckCircle2 size={22} />
        <p>
          Heute schon erledigt: <b>{doneText(doneTasks, data.memberships)}</b>
        </p>
        <strong>
          {doneTasks.length} / {progressTotal}
        </strong>
      </section>

      <section className="today-card today-agenda-card">
        <div className="today-card-title">
          <h2>Tagesagenda</h2>
          <Link to="/kalender">Zum Kalender</Link>
        </div>
        <div className="today-agenda-list">
          {todayEvents.length ? (
            todayEvents.slice(0, 5).map((event) => (
              <article key={event.id}>
                <time>{event.all_day ? 'Tag' : formatTime(event.starts_at)}</time>
                <span />
                <div>
                  <strong>{event.title}</strong>
                  <small>{event.location || event.category}</small>
                </div>
              </article>
            ))
          ) : (
            <p className="today-empty">Der Kalender ist für heute frei.</p>
          )}
        </div>
      </section>

      <section className="today-card today-waste-card">
        <div className="today-card-title">
          <h2>Nächste Abholungen</h2>
          <Clock3 size={16} />
        </div>
        <div className="today-waste-list">
          {nextWaste.map((event) => (
            <article key={event.id}>
              <WasteIcon type={event.waste_type} />
              <div>
                <strong>{event.title}</strong>
                <span>{formatDay(`${event.date}T06:00:00Z`)}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {doneTasks.length > 0 && (
        <section className="today-card today-done-card">
          <div className="today-card-title">
            <h2>Gerade erledigt</h2>
            <Check size={16} />
          </div>
          {doneTasks.map((task) => (
            <article key={task.id} className="today-task is-done">
              <span className="today-task-check" aria-hidden="true" />
              <span>{task.title}</span>
              <time>erledigt</time>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}
