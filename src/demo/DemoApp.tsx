import { useMemo, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { VisibleRoute } from '../components/VisibleRoute'
import { createDemoData } from './demoData'
import { ActivitiesPage } from '../pages/ActivitiesPage'
import { CalendarPage } from '../pages/CalendarPage'
import { ContactsPage } from '../pages/ContactsPage'
import { EmergencyPage } from '../pages/EmergencyPage'
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
import type { DashboardData, EmergencyItem, FamilyContact, NoteItem, ShoppingItem, TaskItem } from '../types'

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
              recurrence_rule: input.recurrence_rule,
              assignee_membership_id: input.assignee_membership_id,
              bring_membership_id: input.bring_membership_id,
              pickup_membership_id: input.pickup_membership_id,
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
      updateEvent: async (event, input) => {
        setData((current) => ({
          ...current,
          events: current.events.map((entry) => (entry.id === event.id ? { ...entry, ...input } : entry)),
        }))
      },
      deleteEvent: async (event) => {
        setData((current) => ({ ...current, events: current.events.filter((entry) => entry.id !== event.id) }))
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
              assignee_membership_id: input.assignee_membership_id,
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
      updateTask: async (task, input) => {
        setData((current) => ({
          ...current,
          tasks: current.tasks.map((entry) => (entry.id === task.id ? { ...entry, ...input } : entry)),
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
      createShoppingList: async (input) => {
        setData((current) => ({
          ...current,
          shoppingLists: [{ id: newId('list-demo'), family_id: current.family.id, archived: false, ...input }, ...current.shoppingLists],
        }))
      },
      updateShoppingList: async (list, input) => {
        setData((current) => ({
          ...current,
          shoppingLists: current.shoppingLists.map((entry) => (entry.id === list.id ? { ...entry, ...input } : entry)),
        }))
      },
      deleteShoppingList: async (list) => {
        setData((current) => ({
          ...current,
          shoppingLists: current.shoppingLists.filter((entry) => entry.id !== list.id),
          shoppingItems: current.shoppingItems.filter((entry) => entry.list_id !== list.id),
        }))
      },
      copyShoppingListFromTemplate: async (template, title) => {
        setData((current) => {
          const id = newId('list-demo')
          return {
            ...current,
            shoppingLists: [{ ...template, id, title, is_template: false }, ...current.shoppingLists],
            shoppingItems: [
              ...current.shoppingItems
                .filter((item) => item.list_id === template.id)
                .map((item, index) => ({ ...item, id: newId(`item-demo-${index}`), list_id: id, checked: false })),
              ...current.shoppingItems,
            ],
          }
        })
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
      updateLink: async (link, input) => {
        setData((current) => ({
          ...current,
          links: current.links.map((entry) => (entry.id === link.id ? { ...entry, ...input } : entry)),
        }))
      },
      deleteLink: async (link) => {
        setData((current) => ({
          ...current,
          links: current.links.filter((entry) => entry.id !== link.id),
        }))
      },
      createFamilyContact: async (input) => {
        setData((current) => ({
          ...current,
          contacts: [
            {
              id: newId('contact-demo'),
              family_id: current.family.id,
              name: input.name,
              relation: input.relation,
              phone: input.phone,
              mobile: input.mobile,
              email: input.email,
              address: input.address,
              notes: input.notes,
              favorite: input.favorite,
              created_by: 'demo-user',
            } satisfies FamilyContact,
            ...current.contacts,
          ],
        }))
      },
      updateFamilyContact: async (contact, input) => {
        setData((current) => ({
          ...current,
          contacts: current.contacts.map((entry) => (entry.id === contact.id ? { ...entry, ...input } : entry)),
        }))
      },
      deleteFamilyContact: async (contact) => {
        setData((current) => ({ ...current, contacts: current.contacts.filter((entry) => entry.id !== contact.id) }))
      },
      createEmergencyItem: async (input) => {
        setData((current) => ({
          ...current,
          emergencyItems: [
            {
              id: newId('emergency-demo'),
              family_id: current.family.id,
              type: input.type,
              title: input.title,
              primary_text: input.primary_text,
              secondary_text: input.secondary_text,
              phone: input.phone,
              address: input.address,
              url: input.url,
              notes: input.notes,
              priority: input.priority,
              created_by: 'demo-user',
            } satisfies EmergencyItem,
            ...current.emergencyItems,
          ],
        }))
      },
      updateEmergencyItem: async (item, input) => {
        setData((current) => ({
          ...current,
          emergencyItems: current.emergencyItems.map((entry) => (entry.id === item.id ? { ...entry, ...input } : entry)),
        }))
      },
      deleteEmergencyItem: async (item) => {
        setData((current) => ({ ...current, emergencyItems: current.emergencyItems.filter((entry) => entry.id !== item.id) }))
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
      updateNote: async (note, input) => {
        setData((current) => ({
          ...current,
          notes: current.notes.map((entry) =>
            entry.id === note.id ? { ...entry, ...input, updated_by: 'demo-user', updated_at: new Date().toISOString() } : entry,
          ),
        }))
      },
      deleteNote: async (note) => {
        setData((current) => ({
          ...current,
          notes: current.notes.filter((entry) => entry.id !== note.id),
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
      archiveRecipe: async (recipeId, archived) => {
        setData((current) => ({
          ...current,
          recipes: current.recipes.map((entry) => (entry.id === recipeId ? { ...entry, status: archived ? 'archived' : 'active' } : entry)),
        }))
      },
      archiveActivity: async (activityId, archived) => {
        setData((current) => ({
          ...current,
          activitySuggestions: current.activitySuggestions.map((entry) =>
            entry.id === activityId ? { ...entry, status: archived ? 'archived' : 'suggested' } : entry,
          ),
        }))
      },
      refreshActivities: async () => {
        setData((current) => ({
          ...current,
          activityAgentRuns: [
            {
              id: newId('activity-run-demo'),
              family_id: current.family.id,
              run_type: 'activities',
              started_at: new Date().toISOString(),
              finished_at: new Date().toISOString(),
              status: 'ok',
              sources_checked: 1,
              items_found: current.activitySuggestions.filter((entry) => entry.status !== 'archived').length,
              items_saved: 0,
              error_summary: null,
            },
            ...current.activityAgentRuns,
          ],
        }))
      },
      refreshRecipes: async () => {
        setData((current) => ({
          ...current,
          activityAgentRuns: [
            {
              id: newId('recipe-run-demo'),
              family_id: current.family.id,
              run_type: 'recipes',
              started_at: new Date().toISOString(),
              finished_at: new Date().toISOString(),
              status: 'ok',
              sources_checked: 1,
              items_found: current.recipes.filter((entry) => entry.status === 'active').length,
              items_saved: current.recipeSuggestions.length,
              error_summary: null,
            },
            ...current.activityAgentRuns,
          ],
        }))
      },
      updateMembershipNavigation: async (userId, visibleNavItems) => {
        setData((current) => ({
          ...current,
          memberships: current.memberships.map((entry) =>
            entry.user_id === userId ? { ...entry, visible_nav_items: visibleNavItems } : entry,
          ),
        }))
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
        <Route path="notizen" element={<VisibleRoute navId="notizen"><NotesPage /></VisibleRoute>} />
        <Route path="abfall" element={<VisibleRoute navId="abfall"><WastePage /></VisibleRoute>} />
        <Route path="rezepte" element={<VisibleRoute navId="rezepte"><RecipesPage /></VisibleRoute>} />
        <Route path="aktivitaeten" element={<VisibleRoute navId="aktivitaeten"><ActivitiesPage /></VisibleRoute>} />
        <Route path="meldungen" element={<VisibleRoute navId="meldungen"><NotificationsPage /></VisibleRoute>} />
        <Route path="kontakte" element={<VisibleRoute navId="kontakte"><ContactsPage /></VisibleRoute>} />
        <Route path="notfall" element={<VisibleRoute navId="notfall"><EmergencyPage /></VisibleRoute>} />
        <Route path="einstellungen" element={<VisibleRoute navId="system"><SettingsPage /></VisibleRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
