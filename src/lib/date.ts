import { rrulestr } from 'rrule'
import { appConfig } from '../config'
import type { EventItem, TaskItem } from '../types'

const dayFormatter = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  timeZone: appConfig.timezone,
})

const longDateFormatter = new Intl.DateTimeFormat('de-DE', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: appConfig.timezone,
})

const timeFormatter = new Intl.DateTimeFormat('de-DE', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: appConfig.timezone,
})

export const toDateKey = (value: string | Date) => {
  const date = typeof value === 'string' ? new Date(value) : value
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: appConfig.timezone,
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  return `${year}-${month}-${day}`
}

export const todayKey = () => toDateKey(new Date())

export const formatDay = (value: string | Date) => dayFormatter.format(typeof value === 'string' ? new Date(value) : value)

export const formatLongDate = (value: string | Date) =>
  longDateFormatter.format(typeof value === 'string' ? new Date(value) : value)

export const formatTime = (value: string | Date) =>
  timeFormatter.format(typeof value === 'string' ? new Date(value) : value)

export const startOfWeek = (date = new Date()) => {
  const current = new Date(date)
  const day = current.getDay() || 7
  current.setHours(0, 0, 0, 0)
  current.setDate(current.getDate() - day + 1)
  return current
}

export const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export const currentWeekDays = () => {
  const start = startOfWeek()
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

export const isToday = (value: string | Date) => toDateKey(value) === todayKey()

export const isInCurrentWeek = (value: string | Date) => {
  const key = toDateKey(value)
  return currentWeekDays().some((day) => toDateKey(day) === key)
}

export const expandRecurringEvents = (events: EventItem[], from: Date, to: Date) =>
  events.flatMap((event) => {
    if (!event.recurrence_rule) {
      return [event]
    }

    const rule = rrulestr(`DTSTART:${toRRuleDate(event.starts_at)}\nRRULE:${event.recurrence_rule}`)
    return rule.between(from, to, true).map((date) => ({
      ...event,
      id: `${event.id}-${date.toISOString()}`,
      starts_at: date.toISOString(),
    }))
  })

const toRRuleDate = (value: string) => {
  const date = new Date(value)
  const pad = (input: number) => String(input).padStart(2, '0')
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(
    date.getUTCHours(),
  )}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
}

export const sortByDate = <T extends { starts_at?: string | null; due_at?: string | null; date?: string | null }>(
  items: T[],
) =>
  [...items].sort((a, b) => {
    const aValue = a.starts_at ?? a.due_at ?? a.date ?? ''
    const bValue = b.starts_at ?? b.due_at ?? b.date ?? ''
    return aValue.localeCompare(bValue)
  })

export const tasksDueToday = (tasks: TaskItem[]) =>
  tasks.filter((task) => task.status !== 'done' && task.status !== 'discarded' && task.due_at && isToday(task.due_at))

export const openTasks = (tasks: TaskItem[]) =>
  tasks.filter((task) => task.status !== 'done' && task.status !== 'discarded')
