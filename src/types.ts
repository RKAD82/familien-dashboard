export type Role = 'admin' | 'adult' | 'child'

export type NavItemId =
  | 'heute'
  | 'woche'
  | 'kalender'
  | 'aufgaben'
  | 'einkauf'
  | 'links'
  | 'notizen'
  | 'abfall'
  | 'rezepte'
  | 'inventar'
  | 'versicherungen'
  | 'aktivitaeten'
  | 'meldungen'
  | 'kontakte'
  | 'notfall'
  | 'system'

export type EntityStatus = 'open' | 'today' | 'waiting' | 'done' | 'discarded'

export type WasteType =
  | 'grau'
  | 'gelb'
  | 'blau'
  | 'bio'
  | 'weihnachtsbaum'
  | 'schadstoffmobil'
  | 'bauabfall'
  | 'grosskartonagen'

export type Priority = 'normal' | 'important' | 'urgent'

export interface Profile {
  id: string
  email: string
  display_name: string
  avatar_color: string
  created_at?: string
}

export interface Family {
  id: string
  name: string
  default_timezone: string
}

export interface FamilyMembership {
  id: string
  family_id: string
  user_id: string
  role: Role
  display_name: string
  active: boolean
  notification_preferences?: Record<string, unknown>
  visible_nav_items?: NavItemId[] | null
  email?: string | null
  login_name?: string | null
  family?: Family
}

export interface Calendar {
  id: string
  family_id: string
  name: string
  color: string
  visibility: 'family' | 'private'
  type: 'family' | 'school' | 'waste' | 'personal'
}

export interface EventItem {
  id: string
  family_id: string
  calendar_id: string | null
  title: string
  starts_at: string
  ends_at: string | null
  all_day: boolean
  recurrence_rule: string | null
  assignee_membership_id: string | null
  bring_membership_id: string | null
  pickup_membership_id: string | null
  category: string
  location: string | null
  notes: string | null
  is_important: boolean
  notify_family: boolean
  created_by: string | null
  updated_at?: string
}

export interface TaskItem {
  id: string
  family_id: string
  title: string
  description: string | null
  status: EntityStatus
  due_at: string | null
  assigned_to: string | null
  assignee_membership_id: string | null
  category: string
  recurrence_rule: string | null
  linked_event_id: string | null
  is_important: boolean
  notify_family: boolean
  created_by: string | null
  updated_at?: string
}

export interface ShoppingList {
  id: string
  family_id: string
  title: string
  store_type: string
  archived: boolean
  is_template: boolean
}

export interface ShoppingItem {
  id: string
  list_id: string
  title: string
  quantity: string | null
  unit: string | null
  category: string | null
  source_label: string | null
  checked: boolean
  added_by: string | null
  checked_by: string | null
  sort_order: number
  updated_at?: string
}

export interface LinkCollection {
  id: string
  family_id: string
  title: string
  sort_order: number
}

export interface FamilyLink {
  id: string
  collection_id: string
  title: string
  url: string
  description: string | null
  favorite: boolean
  visible_to: string[] | null
  is_important: boolean
  notify_family: boolean
}

export interface FamilyContact {
  id: string
  family_id: string
  name: string
  relation: string | null
  phone: string | null
  mobile: string | null
  email: string | null
  address: string | null
  notes: string | null
  favorite: boolean
  created_by: string | null
  updated_at?: string
}

export type EmergencyItemType = 'contact' | 'address' | 'medical' | 'info' | 'link'

export interface EmergencyItem {
  id: string
  family_id: string
  type: EmergencyItemType
  title: string
  primary_text: string
  secondary_text: string | null
  phone: string | null
  address: string | null
  url: string | null
  notes: string | null
  priority: number
  created_by: string | null
  updated_at?: string
}

export interface NoteItem {
  id: string
  family_id: string
  title: string
  body: string
  category: string
  visibility: 'family' | 'adults' | 'private'
  is_important: boolean
  notify_family: boolean
  updated_by: string | null
  updated_at?: string
}

export interface WasteDistrict {
  id: string
  municipality: string
  district_name: string
  source_label: string
  source_checked_at: string
  active: boolean
}

export interface WasteEvent {
  id: string
  district_id: string
  date: string
  waste_type: WasteType
  title: string
  location: string | null
  starts_at: string | null
  ends_at: string | null
  source_id: string | null
  source_event_uid: string
  notes: string | null
}

export interface WasteSortingItem {
  id: string
  category_id: string
  category_name?: string
  term: string
  aliases: string[]
  description: string
  allowed: boolean
  warning: string | null
  source_note: string | null
}

export interface Recipe {
  id: string
  family_id: string
  title: string
  description: string
  source_type: 'seed' | 'family' | 'external_link'
  source_url: string | null
  is_vegetarian: boolean
  difficulty: 'leicht' | 'mittel' | 'aufwendig'
  prep_minutes: number
  cook_minutes: number
  servings: number
  tags: string[]
  visibility: 'family' | 'adults'
  status: 'active' | 'archived'
  created_by: string | null
}

export interface RecipeIngredient {
  id: string
  recipe_id: string
  name: string
  quantity: string
  unit: string
  note: string | null
  shopping_category: string
  optional: boolean
  sort_order: number
}

export interface RecipeSuggestion {
  id: string
  family_id: string
  recipe_id: string
  suggestion_week: string
  rank: number
  reason: string
  status: 'suggested' | 'planned' | 'dismissed' | 'archived'
  generated_by: 'seed-generator' | 'manual'
  created_at?: string
  expires_at?: string | null
  recipe?: Recipe
}

export interface ActivitySource {
  id: string
  name: string
  url: string
  source_type: 'ical' | 'rss' | 'json-ld' | 'manual-seed'
  active: boolean
  last_checked_at: string | null
  notes: string | null
}

export interface ActivityAgentRun {
  id: string
  family_id: string | null
  run_type: 'activities' | 'recipes'
  started_at: string
  finished_at: string | null
  status: 'ok' | 'skipped' | 'error'
  sources_checked: number
  items_found: number
  items_saved: number
  error_summary: string | null
}

export interface ActivitySuggestion {
  id: string
  family_id: string
  source_id: string | null
  external_id: string
  title: string
  description: string
  starts_at: string | null
  ends_at: string | null
  location_name: string
  location_address: string | null
  distance_label: string
  category: string
  family_score: number
  price_label: string
  age_label: string
  url: string | null
  image_url: string | null
  status: 'suggested' | 'saved' | 'dismissed' | 'archived'
  expires_at: string | null
}

export interface NotificationItem {
  id: string
  family_id: string
  created_by: string | null
  type: string
  title: string
  body: string
  target_type: string
  target_id: string | null
  priority: Priority
  created_at: string
}

export interface NotificationDelivery {
  id: string
  notification_id: string
  user_id: string
  device_id: string | null
  channel: 'in_app' | 'push'
  status: 'pending' | 'sent' | 'read' | 'failed'
  sent_at: string | null
  read_at: string | null
  error: string | null
  notification?: NotificationItem
}

export interface DashboardData {
  family: Family
  memberships: FamilyMembership[]
  events: EventItem[]
  tasks: TaskItem[]
  shoppingLists: ShoppingList[]
  shoppingItems: ShoppingItem[]
  linkCollections: LinkCollection[]
  links: FamilyLink[]
  contacts: FamilyContact[]
  emergencyItems: EmergencyItem[]
  notes: NoteItem[]
  wasteDistricts: WasteDistrict[]
  wasteEvents: WasteEvent[]
  wasteSortingItems: WasteSortingItem[]
  recipes: Recipe[]
  recipeIngredients: RecipeIngredient[]
  recipeSuggestions: RecipeSuggestion[]
  activitySuggestions: ActivitySuggestion[]
  activityAgentRuns: ActivityAgentRun[]
  notificationDeliveries: NotificationDelivery[]
}
