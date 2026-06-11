import { useOutletContext } from 'react-router-dom'
import type {
  DashboardData,
  EmergencyItem,
  EventItem,
  ExpenseCategory,
  ExpenseItem,
  FamilyContact,
  FamilyLink,
  FamilyMembership,
  InventoryItem,
  LinkCollection,
  NoteItem,
  NotificationDelivery,
  NavItemId,
  Role,
  ServiceContract,
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
  | 'assignee_membership_id'
  | 'bring_membership_id'
  | 'pickup_membership_id'
  | 'category'
  | 'location'
  | 'notes'
  | 'is_important'
  | 'notify_family'
>

export type CreateShoppingItemInput = Pick<ShoppingItem, 'title' | 'quantity' | 'unit' | 'category' | 'source_label'>
export type CreateShoppingListInput = Pick<ShoppingList, 'title' | 'store_type' | 'is_template'>
export type CreateLinkCollectionInput = Pick<LinkCollection, 'title' | 'sort_order'>

export type CreateLinkInput = Pick<
  FamilyLink,
  'collection_id' | 'title' | 'url' | 'description' | 'favorite' | 'is_important' | 'notify_family'
>

export type UpdateLinkInput = CreateLinkInput

export type NoteInput = Pick<NoteItem, 'title' | 'body' | 'category' | 'visibility' | 'is_important' | 'notify_family'>

export type InventoryItemInput = Pick<
  InventoryItem,
  'title' | 'category' | 'location' | 'purchase_date' | 'warranty_until' | 'value_eur' | 'serial_number' | 'document_url' | 'condition' | 'notes'
>

export type ServiceContractInput = Pick<
  ServiceContract,
  | 'kind'
  | 'provider_name'
  | 'product_name'
  | 'contact_name'
  | 'phone'
  | 'email'
  | 'website_url'
  | 'customer_number'
  | 'annual_cost_eur'
  | 'billing_cycle'
  | 'contract_until'
  | 'cancellation_notice'
  | 'next_review_at'
  | 'comparison_url'
  | 'status'
  | 'notes'
>

export type ExpenseCategoryInput = Pick<ExpenseCategory, 'title' | 'slug' | 'color' | 'icon' | 'sort_order' | 'active'>

export type ExpenseInput = Pick<
  ExpenseItem,
  | 'category_id'
  | 'title'
  | 'provider_name'
  | 'amount_eur'
  | 'billing_cycle'
  | 'billing_note'
  | 'expense_year'
  | 'paid_from'
  | 'contract_until'
  | 'cancellation_notice'
  | 'next_review_at'
  | 'contact_name'
  | 'phone'
  | 'email'
  | 'website_url'
  | 'customer_number'
  | 'comparison_url'
  | 'status'
  | 'notes'
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
    input: Pick<TaskItem, 'title' | 'description' | 'due_at' | 'assignee_membership_id' | 'category' | 'is_important' | 'notify_family'>,
  ) => Promise<void>
  updateTask: (
    task: TaskItem,
    input: Pick<
      TaskItem,
      'title' | 'description' | 'due_at' | 'assignee_membership_id' | 'category' | 'is_important' | 'notify_family' | 'status'
    >,
  ) => Promise<void>
  updateTaskStatus: (task: TaskItem, status: TaskItem['status']) => Promise<void>
  deleteTask: (task: TaskItem) => Promise<void>
  addShoppingItem: (listId: string, input: CreateShoppingItemInput) => Promise<void>
  createShoppingList: (input: CreateShoppingListInput) => Promise<ShoppingList>
  updateShoppingList: (list: ShoppingList, input: CreateShoppingListInput & { archived: boolean }) => Promise<void>
  deleteShoppingList: (list: ShoppingList) => Promise<void>
  copyShoppingListFromTemplate: (template: ShoppingList, title: string) => Promise<void>
  updateShoppingItem: (item: ShoppingItem, input: CreateShoppingItemInput) => Promise<void>
  toggleShoppingItem: (item: ShoppingItem) => Promise<void>
  deleteShoppingItem: (item: ShoppingItem) => Promise<void>
  clearShoppingList: (listId: string, checkedOnly: boolean) => Promise<void>
  resetDemoData?: () => Promise<void>
  createLink: (input: CreateLinkInput) => Promise<void>
  createLinkCollection: (input: CreateLinkCollectionInput) => Promise<LinkCollection>
  updateLink: (link: FamilyLink, input: UpdateLinkInput) => Promise<void>
  deleteLink: (link: FamilyLink) => Promise<void>
  createFamilyContact: (input: CreateFamilyContactInput) => Promise<void>
  updateFamilyContact: (contact: FamilyContact, input: CreateFamilyContactInput) => Promise<void>
  deleteFamilyContact: (contact: FamilyContact) => Promise<void>
  createEmergencyItem: (input: CreateEmergencyItemInput) => Promise<void>
  updateEmergencyItem: (item: EmergencyItem, input: CreateEmergencyItemInput) => Promise<void>
  deleteEmergencyItem: (item: EmergencyItem) => Promise<void>
  createNote: (input: NoteInput) => Promise<void>
  updateNote: (note: NoteItem, input: NoteInput) => Promise<void>
  deleteNote: (note: NoteItem) => Promise<void>
  createInventoryItem: (input: InventoryItemInput) => Promise<void>
  updateInventoryItem: (item: InventoryItem, input: InventoryItemInput) => Promise<void>
  deleteInventoryItem: (item: InventoryItem) => Promise<void>
  createServiceContract: (input: ServiceContractInput) => Promise<void>
  updateServiceContract: (contract: ServiceContract, input: ServiceContractInput) => Promise<void>
  deleteServiceContract: (contract: ServiceContract) => Promise<void>
  createExpenseCategory: (input: ExpenseCategoryInput) => Promise<ExpenseCategory>
  updateExpenseCategory: (category: ExpenseCategory, input: ExpenseCategoryInput) => Promise<void>
  createExpense: (input: ExpenseInput) => Promise<void>
  updateExpense: (expense: ExpenseItem, input: ExpenseInput) => Promise<void>
  deleteExpense: (expense: ExpenseItem) => Promise<void>
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
  actualMembership?: FamilyMembership | null
  currentMembership?: FamilyMembership | null
  simulatedMembershipId?: string | null
  setSimulatedMembershipId?: (membershipId: string | null) => void
}

export const useFamilyRoute = () => useOutletContext<FamilyRouteContext>()
