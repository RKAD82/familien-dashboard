import { useOutletContext } from 'react-router-dom'
import type {
  DashboardData,
  EmergencyItem,
  EventItem,
  FamilyContact,
  FamilyLink,
  NoteItem,
  NotificationDelivery,
  NavItemId,
  Role,
  ShoppingItem,
  ShoppingList,
  TaskItem,
} from '../types'

export type CreateEventInput = Pick<
  EventItem,
  | 'title'
  | 'starts_at'
  | 'ends_at'
  | 'all_day'
  | 'recurrence_rule'
  | 'category'
  | 'location'
  | 'notes'
  | 'is_important'
  | 'notify_family'
>

export type CreateShoppingItemInput = Pick<ShoppingItem, 'title' | 'quantity' | 'unit' | 'category' | 'source_label'>
export type CreateShoppingListInput = Pick<ShoppingList, 'title' | 'store_type' | 'is_template'>

export type CreateLinkInput = Pick<
  FamilyLink,
  'collection_id' | 'title' | 'url' | 'description' | 'favorite' | 'is_important' | 'notify_family'
>

export type CreateFamilyContactInput = Pick<
  FamilyContact,
  'name' | 'relation' | 'phone' | 'mobile' | 'email' | 'address' | 'notes' | 'favorite'
>

export type CreateEmergencyItemInput = Pick<
  EmergencyItem,
  'type' | 'title' | 'primary_text' | 'secondary_text' | 'phone' | 'address' | 'url' | 'notes' | 'priority'
>

export interface InviteFamilyMemberInput {
  email: string
  display_name: string
  role: Role
}

export interface ManageFamilyMemberInput {
  user_id?: string
  login_name?: string
  email?: string | null
  display_name: string
  password?: string
  role: Role
  active: boolean
  visible_nav_items: NavItemId[]
}

export interface FamilyActions {
  refresh: () => Promise<void>
  createEvent: (input: CreateEventInput) => Promise<void>
  updateEvent: (event: EventItem, input: CreateEventInput) => Promise<void>
  deleteEvent: (event: EventItem) => Promise<void>
  createTask: (
    input: Pick<TaskItem, 'title' | 'description' | 'due_at' | 'category' | 'is_important' | 'notify_family'>,
  ) => Promise<void>
  updateTask: (
    task: TaskItem,
    input: Pick<TaskItem, 'title' | 'description' | 'due_at' | 'category' | 'is_important' | 'notify_family' | 'status'>,
  ) => Promise<void>
  updateTaskStatus: (task: TaskItem, status: TaskItem['status']) => Promise<void>
  deleteTask: (task: TaskItem) => Promise<void>
  addShoppingItem: (listId: string, input: CreateShoppingItemInput) => Promise<void>
  createShoppingList: (input: CreateShoppingListInput) => Promise<void>
  updateShoppingList: (list: ShoppingList, input: CreateShoppingListInput & { archived: boolean }) => Promise<void>
  deleteShoppingList: (list: ShoppingList) => Promise<void>
  copyShoppingListFromTemplate: (template: ShoppingList, title: string) => Promise<void>
  updateShoppingItem: (item: ShoppingItem, input: CreateShoppingItemInput) => Promise<void>
  toggleShoppingItem: (item: ShoppingItem) => Promise<void>
  deleteShoppingItem: (item: ShoppingItem) => Promise<void>
  clearShoppingList: (listId: string, checkedOnly: boolean) => Promise<void>
  resetDemoData?: () => Promise<void>
  createLink: (input: CreateLinkInput) => Promise<void>
  createFamilyContact: (input: CreateFamilyContactInput) => Promise<void>
  updateFamilyContact: (contact: FamilyContact, input: CreateFamilyContactInput) => Promise<void>
  deleteFamilyContact: (contact: FamilyContact) => Promise<void>
  createEmergencyItem: (input: CreateEmergencyItemInput) => Promise<void>
  updateEmergencyItem: (item: EmergencyItem, input: CreateEmergencyItemInput) => Promise<void>
  deleteEmergencyItem: (item: EmergencyItem) => Promise<void>
  createNote: (
    input: Pick<NoteItem, 'title' | 'body' | 'category' | 'visibility' | 'is_important' | 'notify_family'>,
  ) => Promise<void>
  markNotificationRead: (delivery: NotificationDelivery) => Promise<void>
  addRecipeToShoppingList: (listId: string, recipeId: string) => Promise<void>
  archiveRecipe: (recipeId: string, archived: boolean) => Promise<void>
  archiveActivity: (activityId: string, archived: boolean) => Promise<void>
  refreshActivities: () => Promise<void>
  refreshRecipes: () => Promise<void>
  updateMembershipNavigation?: (userId: string, visibleNavItems: NavItemId[]) => Promise<void>
  updateFamilyMember?: (
    userId: string,
    input: { display_name: string; role: Role; active: boolean; visible_nav_items: NavItemId[] },
  ) => Promise<void>
  sendPasswordReset?: (email: string) => Promise<void>
  manageFamilyMember?: (input: ManageFamilyMemberInput) => Promise<void>
  inviteFamilyMember?: (input: InviteFamilyMemberInput) => Promise<void>
}

export interface FamilyRouteContext {
  data: DashboardData
  actions: FamilyActions
}

export const useFamilyRoute = () => useOutletContext<FamilyRouteContext>()
