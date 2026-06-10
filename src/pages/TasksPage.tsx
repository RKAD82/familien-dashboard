import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CheckCircle2, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { AssignmentBadge } from '../components/AssignmentBadge'
import { activeMemberships } from '../lib/assignments'
import { formatLongDate, formatTime, openTasks } from '../lib/date'
import { useFamilyRoute } from '../routes/context'
import { Button, Card, Field, Select, Tag, TextArea, TextInput } from '../components/ui'

const formatTaskDate = (value: string | null) => (value ? `${formatLongDate(value)}, ${formatTime(value)} Uhr` : 'ohne Fälligkeit')

export const TasksPage = () => {
  const { data, actions } = useFamilyRoute()
  const [searchParams] = useSearchParams()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [assigneeMembershipId, setAssigneeMembershipId] = useState('')
  const [category, setCategory] = useState('Familie')
  const [important, setImportant] = useState(false)
  const [notify, setNotify] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState(data.tasks[0]?.id ?? '')
  const [editing, setEditing] = useState(false)

  const tasks = openTasks(data.tasks)
  const done = data.tasks.filter((task) => task.status === 'done')
  const selectedTask = data.tasks.find((task) => task.id === selectedTaskId) ?? tasks[0] ?? done[0]
  const assignableMembers = activeMemberships(data.memberships)
  const categoryOptions = useMemo(
    () =>
      Array.from(new Set(['Familie', 'Haushalt', 'Schule/Kita', 'Gesundheit', 'Besorgung', ...data.tasks.map((task) => task.category)])).sort(
        (a, b) => a.localeCompare(b, 'de'),
      ),
    [data.tasks],
  )

  useEffect(() => {
    const taskId = searchParams.get('task')
    if (taskId && data.tasks.some((task) => task.id === taskId)) {
      setSelectedTaskId(taskId)
    }
  }, [data.tasks, searchParams])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) {
      return
    }

    await actions.createTask({
      title: title.trim(),
      description: description.trim() || null,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      assignee_membership_id: assigneeMembershipId || null,
      category: category.trim() || 'Familie',
      is_important: important,
      notify_family: notify,
    })
    setTitle('')
    setDescription('')
    setDueAt('')
    setAssigneeMembershipId('')
    setImportant(false)
    setNotify(false)
  }

  const deleteSelectedTask = async () => {
    if (!selectedTask) {
      return
    }
    if (window.confirm(`Aufgabe „${selectedTask.title}“ wirklich löschen?`)) {
      await actions.deleteTask(selectedTask)
      setSelectedTaskId('')
    }
  }

  const startEdit = () => {
    if (!selectedTask) return
    setTitle(selectedTask.title)
    setDescription(selectedTask.description ?? '')
    setDueAt(selectedTask.due_at ? selectedTask.due_at.slice(0, 16) : '')
    setAssigneeMembershipId(selectedTask.assignee_membership_id ?? '')
    setCategory(selectedTask.category)
    setImportant(selectedTask.is_important)
    setNotify(selectedTask.notify_family)
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!selectedTask || !title.trim()) return
    await actions.updateTask(selectedTask, {
      title: title.trim(),
      description: description.trim() || null,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      assignee_membership_id: assigneeMembershipId || null,
      category: category.trim() || 'Familie',
      is_important: important,
      notify_family: notify,
      status: selectedTask.status,
    })
    setTitle('')
    setDescription('')
    setDueAt('')
    setAssigneeMembershipId('')
    setImportant(false)
    setNotify(false)
    setEditing(false)
  }

  return (
    <div className="page-stack tasks-page">
      <section className="page-title">
        <div>
          <h1>Aufgaben</h1>
          <p>Offene Aufgaben, Details und erledigte Punkte in einer Arbeitsansicht.</p>
        </div>
        <div className="page-actions">
          <Tag tone="warn">{tasks.length} offen</Tag>
          <Tag tone="good">{done.length} erledigt</Tag>
        </div>
      </section>

      <div className="task-workspace">
        <Card title="Neue Aufgabe" className="task-entry-card">
          <form className="form-stack" onSubmit={onSubmit}>
            <Field label="Titel">
              <TextInput value={title} onChange={(event) => setTitle(event.target.value)} />
            </Field>
            <Field label="Beschreibung">
              <TextArea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
            </Field>
            <Field label="Fälligkeit">
              <TextInput type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
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
            <Field label="Kategorie">
              <TextInput list="task-categories" value={category} onChange={(event) => setCategory(event.target.value)} />
              <datalist id="task-categories">
                {categoryOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </Field>
            <p className="form-hint">Neue Kategorien legst du an, indem du hier einfach einen neuen Kategorienamen eintippst.</p>
            <label className="check-line">
              <input type="checkbox" checked={important} onChange={(event) => setImportant(event.target.checked)} />
              Wichtig markieren
            </label>
            <label className="check-line">
              <input type="checkbox" checked={notify} onChange={(event) => setNotify(event.target.checked)} />
              Familie benachrichtigen
            </label>
            <Button type={editing ? 'button' : 'submit'} onClick={editing ? () => void saveEdit() : undefined}>
              <Plus size={18} />
              {editing ? 'Änderungen speichern' : 'Aufgabe speichern'}
            </Button>
            {editing && (
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Bearbeitung abbrechen
              </Button>
            )}
          </form>
        </Card>

        <Card title="Offene Aufgaben" className="task-list-card">
          <div className="task-list large">
            {tasks.map((task) => (
              <article key={task.id} className={`task-card ${task.id === selectedTask?.id ? 'selected' : ''}`}>
                <button className="task-done-button" type="button" onClick={() => void actions.updateTaskStatus(task, 'done')}>
                  <CheckCircle2 size={16} />
                  Erledigen
                </button>
                <button className="task-open-button" type="button" onClick={() => setSelectedTaskId(task.id)}>
                  <strong>{task.title}</strong>
                  <span>{task.description || task.category}</span>
                  <AssignmentBadge compact label="Zuständig" membershipId={task.assignee_membership_id} memberships={data.memberships} />
                </button>
                {task.is_important && <Tag tone="warn">wichtig</Tag>}
                {task.notify_family && <Tag tone="info">Meldung</Tag>}
              </article>
            ))}
            {!tasks.length && <p className="muted">Keine offenen Aufgaben.</p>}
          </div>
        </Card>
      </div>

      <div className="task-detail-grid">
        <Card title="Aufgabendetails">
          {selectedTask ? (
            <article className="detail-panel">
              <div>
                <h2>{selectedTask.title}</h2>
                <p>{selectedTask.description || 'Keine Beschreibung hinterlegt.'}</p>
              </div>
              <div className="tag-row">
                <Tag>{selectedTask.category}</Tag>
                <Tag tone={selectedTask.status === 'done' ? 'good' : 'info'}>{selectedTask.status === 'done' ? 'erledigt' : 'offen'}</Tag>
                {selectedTask.is_important && <Tag tone="warn">wichtig</Tag>}
              </div>
              <div className="assignment-row">
                <AssignmentBadge label="Zuständig" membershipId={selectedTask.assignee_membership_id} memberships={data.memberships} />
              </div>
              <span className="muted">{formatTaskDate(selectedTask.due_at)}</span>
              <div className="action-row">
                <Button variant="secondary" onClick={startEdit}>
                  Aufgabe bearbeiten
                </Button>
                {selectedTask.status === 'done' ? (
                  <Button variant="secondary" onClick={() => void actions.updateTaskStatus(selectedTask, 'open')}>
                    <RotateCcw size={18} />
                    Wieder öffnen
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => void actions.updateTaskStatus(selectedTask, 'done')}>
                    <CheckCircle2 size={18} />
                    Als erledigt markieren
                  </Button>
                )}
                <Button variant="danger" onClick={() => void deleteSelectedTask()}>
                  <Trash2 size={18} />
                  Aufgabe löschen
                </Button>
              </div>
            </article>
          ) : (
            <p className="muted">Keine Aufgabe ausgewählt.</p>
          )}
        </Card>

        <Card title="Erledigt-Historie">
          <div className="compact-list">
            {done.slice(0, 12).map((task) => (
              <article key={task.id}>
                <CheckCircle2 size={16} />
                <button className="text-button" type="button" onClick={() => setSelectedTaskId(task.id)}>
                  {task.title}
                </button>
              </article>
            ))}
            {!done.length && <p className="muted">Noch keine erledigten Aufgaben.</p>}
          </div>
        </Card>
      </div>
    </div>
  )
}
