import { useMemo, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { createDemoData } from './demoData'
import { ActivitiesPage } from '../pages/ActivitiesPage'
import { CalendarPage } from '../pages/CalendarPage'
import { LinksPage } from '../pages/LinksPage'
import { NotesPage } from '../pages/NotesPage'
import { NotificationsPage } from '../pages/NotificationsPage'
import { RecipesPage } from '../pages/RecipesPage'
import { SettingsPage } from '../pages/SettingsPage'
import { ShoppingPage } from '../pages/ShoppingPage'
import { TasksPage } from '../pages/TasksPage'
import { TodayPage } from '../pages/TodayPage'
import { WastePage } from '../pages/WastePage'
import { WeekPage } from '../pages/WeekPage'
import type { FamilyActions } from '../routes/context'
import type { DashboardData, NoteItem, ShoppingItem, TaskItem } from '../types'

const newId = (prefix: string) =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? `${prefix}-${crypto.randomUUID()}` : `${prefix}-${Date.now()}`

export const DemoApp = () => {
  const [data, setData] = useState<DashboardData>(() => createDemoData())

  const actions = useMemo<FamilyActions>(
    () => ({
      refresh: async () => undefined,
      createEvent: async (input) => {
        setData((current) => ({
          ...current,
          events: [
            {
              id: newId('event-demo'),
              family_id: current.family.id,
              calendar_id: null,
              title: input.title,
              starts_at: input.starts_at,
              ends_at: input.ends_at,
              all_day: input.all_day,
              recurrence_rule: null,
              category: input.category,
              location: input.location,
              notes: input.notes,
              is_important: input.is_important,
              notify_family: input.notify_family,
              created_by: 'demo-user',
            },
            ...current.events,
          ],
        }))
      },
      createTask: async (input) => {
        setData((current) => ({
          ...current,
          tasks: [
            {
              id: newId('task-demo'),
              family_id: current.family.id,
              title: input.title,
              description: input.description,
              status: input.due_at ? 'today' : 'open',
              due_at: input.due_at,
              assigned_to: null,
              category: input.category,
              recurrence_rule: null,
              linked_event_id: null,
              is_important: input.is_important,
              notify_family: input.notify_family,
              created_by: 'demo-user',
            },
            ...current.tasks,
          ],
        }))
      },
      updateTaskStatus: async (task: TaskItem, status: TaskItem['status']) => {
        setData((current) => ({
          ...current,
          tasks: current.tasks.map((entry) => (entry.id === task.id ? { ...entry, status } : entry)),
        }))
      },
      deleteTask: async (task: TaskItem) => {
        setData((current) => ({
          ...current,
          tasks: current.tasks.filter((entry) => entry.id !== task.id),
        }))
      },
      addShoppingItem: async (listId, input) => {
        setData((current) => ({
          ...current,
          shoppingItems: [
            {
              id: newId('item-demo'),
              list_id: listId,
              title: input.title,
              quantity: input.quantity,
              unit: input.unit,
              category: input.category,
              source_label: input.source_label,
              checked: false,
              added_by: 'demo-user',
              checked_by: null,
              sort_order: Date.now(),
            },
            ...current.shoppingItems,
          ],
        }))
      },
      updateShoppingItem: async (item, input) => {
        setData((current) => ({
          ...current,
          shoppingItems: current.shoppingItems.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  title: input.title,
                  quantity: input.quantity,
                  unit: input.unit,
                  category: input.category,
                  source_label: input.source_label,
                }
              : entry,
          ),
        }))
      },
      toggleShoppingItem: async (item: ShoppingItem) => {
        setData((current) => ({
          ...current,
          shoppingItems: current.shoppingItems.map((entry) =>
            entry.id === item.id ? { ...entry, checked: !entry.checked, checked_by: entry.checked ? null : 'demo-user' } : entry,
          ),
        }))
      },
      deleteShoppingItem: async (item) => {
        setData((current) => ({
          ...current,
          shoppingItems: current.shoppingItems.filter((entry) => entry.id !== item.id),
        }))
      },
      clearShoppingList: async (listId, checkedOnly) => {
        setData((current) => ({
          ...current,
          shoppingItems: current.shoppingItems.filter((item) => item.list_id !== listId || (checkedOnly && !item.checked)),
        }))
      },
      resetDemoData: async () => {
        setData(createDemoData())
      },
      createLink: async (input) => {
        setData((current) => ({
          ...current,
          links: [
            {
              id: newId('link-demo'),
              collection_id: input.collection_id,
              title: input.title,
              url: input.url,
              description: input.description,
              favorite: input.favorite,
              visible_to: null,
              is_important: input.is_important,
              notify_family: input.notify_family,
            },
            ...current.links,
          ],
        }))
      },
      createNote: async (input) => {
        setData((current) => ({
          ...current,
          notes: [
            {
              id: newId('note-demo'),
              family_id: current.family.id,
              title: input.title,
              body: input.body,
              category: input.category,
              visibility: input.visibility,
              is_important: input.is_important,
              notify_family: input.notify_family,
              updated_by: 'demo-user',
            } satisfies NoteItem,
            ...current.notes,
          ],
        }))
      },
      markNotificationRead: async (delivery) => {
        setData((current) => ({
          ...current,
          notificationDeliveries: current.notificationDeliveries.map((entry) =>
            entry.id === delivery.id ? { ...entry, status: 'read', read_at: new Date().toISOString() } : entry,
          ),
        }))
      },
      addRecipeToShoppingList: async (listId: string, recipeId: string) => {
        setData((current) => {
          const ingredients = current.recipeIngredients.filter((ingredient) => ingredient.recipe_id === recipeId)
          const recipe = current.recipes.find((entry) => entry.id === recipeId)
          return {
            ...current,
            shoppingItems: [
              ...ingredients.map((ingredient, index) => ({
                id: newId(`recipe-item-${index}`),
                list_id: listId,
                title: ingredient.name,
                quantity: ingredient.quantity,
                unit: ingredient.unit,
                category: ingredient.shopping_category,
                source_label: recipe ? `Zutaten für ${recipe.title}` : 'Rezeptzutaten',
                checked: false,
                added_by: 'demo-user',
                checked_by: null,
                sort_order: Date.now() + index,
              })),
              ...current.shoppingItems,
            ],
          }
        })
      },
    }),
    [],
  )

  return (
    <Routes>
      <Route element={<AppShell data={data} actions={actions} modeLabel="Demo-Vorschau ohne Supabase" />}>
        <Route index element={<TodayPage />} />
        <Route path="woche" element={<WeekPage />} />
        <Route path="kalender" element={<CalendarPage />} />
        <Route path="aufgaben" element={<TasksPage />} />
        <Route path="einkauf" element={<ShoppingPage />} />
        <Route path="links" element={<LinksPage />} />
        <Route path="notizen" element={<NotesPage />} />
        <Route path="abfall" element={<WastePage />} />
        <Route path="rezepte" element={<RecipesPage />} />
        <Route path="aktivitaeten" element={<ActivitiesPage />} />
        <Route path="meldungen" element={<NotificationsPage />} />
        <Route path="einstellungen" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
