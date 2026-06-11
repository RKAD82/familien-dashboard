import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRef } from 'react'
import { publicBasePath } from '../config'
import { assignmentPayloadForEvent, assignmentPayloadForTask } from '../lib/assignments'
import {
  deleteFamilyLinkRecord,
  deleteFamilyNoteRecord,
  updateFamilyLinkRecord,
  updateFamilyNoteRecord,
  type UpdateFamilyLinkInput,
  type UpdateFamilyNoteInput,
} from '../lib/familyCrud'
import { deleteHouseFallback, readHouseFallback, upsertHouseFallback } from '../lib/houseFallbackStorage'
import { createOfflineMirrorData, saveMirror } from '../lib/offlineMirror'
import { requireSupabase, supabase } from '../lib/supabase'
import type {
  ActivitySuggestion,
  ActivityAgentRun,
  DashboardData,
  EmergencyItem,
  EventItem,
  ExpenseBillingCycle,
  ExpenseCategory,
  ExpenseItem,
  Family,
  FamilyContact,
  FamilyLink,
  InventoryItem,
  LinkCollection,
  NoteItem,
  NotificationDelivery,
  Recipe,
  RecipeIngredient,
  RecipeSuggestion,
  Role,
  ServiceContract,
  ShoppingItem,
  ShoppingList,
  TaskItem,
  WasteDistrict,
  WasteEvent,
  WasteSortingItem,
} from '../types'

const isMissingOptionalTable = (error: { code?: string; message?: string } | null | undefined) =>
  Boolean(error && (error.code === '42P01' || error.message?.includes('does not exist')))

const emptyData = (family: Family): DashboardData => ({
  family,
  memberships: [],
  events: [],
  tasks: [],
  shoppingLists: [],
  shoppingItems: [],
  linkCollections: [],
  links: [],
  contacts: [],
  emergencyItems: [],
  notes: [],
  inventoryItems: [],
  serviceContracts: [],
  expenseCategories: [],
  expenses: [],
  wasteDistricts: [],
  wasteEvents: [],
  wasteSortingItems: [],
  recipes: [],
  recipeIngredients: [],
  recipeSuggestions: [],
    activitySuggestions: [],
  activityAgentRuns: [],
  notificationDeliveries: [],
})

const newLocalHouseId = (prefix: string) =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? `${prefix}-${crypto.randomUUID()}` : `${prefix}-${Date.now()}`

const expenseCategoryTemplates = [
  { title: 'Haushalt', slug: 'haushalt', color: '#5f766e', icon: 'home', sort_order: 10 },
  { title: 'Versicherungen', slug: 'versicherungen', color: '#4e6d9a', icon: 'shield', sort_order: 20 },
  { title: 'Abos', slug: 'abos', color: '#8a6b47', icon: 'repeat', sort_order: 30 },
  { title: 'Mobilität', slug: 'mobilitaet', color: '#6d5d90', icon: 'car', sort_order: 40 },
  { title: 'Freizeit', slug: 'freizeit', color: '#8a5d71', icon: 'sparkles', sort_order: 50 },
  { title: 'Sonstiges', slug: 'sonstiges', color: '#69737a', icon: 'folder', sort_order: 90 },
]

const defaultExpenseCategoriesForFamily = (familyId: string): ExpenseCategory[] =>
  expenseCategoryTemplates.map((category) => ({
    id: `expense-category-local-${category.slug}`,
    family_id: familyId,
    title: category.title,
    slug: category.slug,
    color: category.color,
    icon: category.icon,
    sort_order: category.sort_order,
    active: true,
    created_by: null,
  }))

const expenseCategorySlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'ausgaben'

const billingCycleFromLegacy = (value: string | null): ExpenseBillingCycle => {
  const normalized = value?.toLowerCase() ?? ''
  if (normalized.includes('monat')) return 'monthly'
  if (normalized.includes('quart')) return 'quarterly'
  if (normalized.includes('einmal')) return 'one_time'
  if (normalized.includes('jahr') || normalized.includes('jähr')) return 'yearly'
  return 'yearly'
}

const legacyContractsToExpenses = (
  familyId: string,
  contracts: ServiceContract[],
  categories: ExpenseCategory[],
): ExpenseItem[] => {
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]))
  return contracts.map((contract) => {
    const kind = contract.kind.toLowerCase()
    const slug = kind.includes('versicherung')
      ? 'versicherungen'
      : ['strom', 'gas', 'wasser', 'internet', 'mobilfunk'].some((needle) => kind.includes(needle))
        ? 'haushalt'
        : 'sonstiges'
    const category = categoryBySlug.get(slug) ?? categories[0]
    return {
      id: `expense-from-contract-${contract.id}`,
      family_id: familyId,
      category_id: category?.id ?? `expense-category-local-${slug}`,
      title: contract.product_name,
      provider_name: contract.provider_name,
      amount_eur: contract.annual_cost_eur,
      billing_cycle: billingCycleFromLegacy(contract.billing_cycle),
      billing_note: contract.billing_cycle,
      expense_year: contract.next_review_at ? Number(contract.next_review_at.slice(0, 4)) : new Date().getFullYear(),
      paid_from: null,
      contract_until: contract.contract_until,
      cancellation_notice: contract.cancellation_notice,
      next_review_at: contract.next_review_at,
      contact_name: contract.contact_name,
      phone: contract.phone,
      email: contract.email,
      website_url: contract.website_url,
      customer_number: contract.customer_number,
      comparison_url: contract.comparison_url,
      status: contract.status,
      notes: contract.notes,
      source_contract_id: contract.id,
      created_by: contract.created_by,
      updated_at: contract.updated_at,
    }
  })
}

export const useFamilyData = (family: Family | null, userId: string | null) => {
  const [data, setData] = useState<DashboardData | null>(family ? (createOfflineMirrorData(family) ?? emptyData(family)) : null)
  const [loading, setLoading] = useState(Boolean(family))
  const [error, setError] = useState<string | null>(null)
  const hasLoadedRef = useRef(false)

  const familyId = family?.id ?? null

  useEffect(() => {
    hasLoadedRef.current = false
  }, [familyId])

  const loadData = useCallback(async () => {
    if (!familyId || !family) {
      setData(null)
      setLoading(false)
      return
    }

    if (!supabase) {
      setData(createOfflineMirrorData(family) ?? emptyData(family))
      setLoading(false)
      return
    }

    if (!hasLoadedRef.current) {
      setLoading(true)
    }
    setError(null)

    const [
      memberships,
      events,
      tasks,
      shoppingLists,
      linkCollections,
      contacts,
      emergencyItems,
      notes,
      inventoryItems,
      serviceContracts,
      expenseCategories,
      expenses,
      districts,
      recipes,
      recipeSuggestions,
      activities,
      activityRuns,
      deliveries,
    ] = await Promise.all([
      supabase.from('family_memberships').select('*, profile:profiles(email)').eq('family_id', familyId),
      supabase.from('events').select('*').eq('family_id', familyId).order('starts_at'),
      supabase.from('tasks').select('*').eq('family_id', familyId).order('due_at', { nullsFirst: false }),
      supabase.from('shopping_lists').select('*').eq('family_id', familyId).eq('archived', false).order('is_template').order('title'),
      supabase.from('link_collections').select('*').eq('family_id', familyId).order('sort_order'),
      supabase.from('family_contacts').select('*').eq('family_id', familyId).order('favorite', { ascending: false }).order('name'),
      supabase.from('emergency_items').select('*').eq('family_id', familyId).order('priority').order('title'),
      supabase.from('notes').select('*').eq('family_id', familyId).order('updated_at', { ascending: false }),
      supabase.from('inventory_items').select('*').eq('family_id', familyId).order('updated_at', { ascending: false }),
      supabase.from('service_contracts').select('*').eq('family_id', familyId).order('next_review_at', { nullsFirst: false }),
      supabase.from('expense_categories').select('*').eq('family_id', familyId).eq('active', true).order('sort_order').order('title'),
      supabase.from('expenses').select('*').eq('family_id', familyId).order('expense_year', { ascending: false }).order('updated_at', { ascending: false }),
      supabase.from('waste_districts').select('*').eq('active', true),
      supabase.from('recipes').select('*').eq('family_id', familyId).order('status').order('title'),
      supabase.from('recipe_suggestions').select('*, recipe:recipes(*)').eq('family_id', familyId).order('rank'),
      supabase.from('activity_suggestions').select('*').eq('family_id', familyId).order('status').order('family_score', { ascending: false }),
      supabase
        .from('activity_agent_runs')
        .select('*')
        .eq('family_id', familyId)
        .order('started_at', { ascending: false })
        .limit(20),
      userId
        ? supabase
            .from('notification_deliveries')
            .select('*, notification:notifications(*)')
            .eq('user_id', userId)
            .order('sent_at', { ascending: false, nullsFirst: false })
            .limit(30)
        : Promise.resolve({ data: [], error: null }),
    ])

    const firstError = [
      memberships,
      events,
      tasks,
      shoppingLists,
      linkCollections,
      contacts,
      emergencyItems,
      notes,
      inventoryItems,
      serviceContracts,
      expenseCategories,
      expenses,
      districts,
      recipes,
      recipeSuggestions,
      activities,
      activityRuns,
      deliveries,
    ].find((result) => result.error && !isMissingOptionalTable(result.error))

    if (firstError?.error) {
      const mirroredData = createOfflineMirrorData(family)
      if (mirroredData) {
        setData(mirroredData)
        hasLoadedRef.current = true
        setLoading(false)
        return
      }
      setError(firstError.error.message)
      setLoading(false)
      return
    }

    const shoppingListIds = ((shoppingLists.data as ShoppingList[] | null) ?? []).map((list) => list.id)
    const collectionIds = ((linkCollections.data as LinkCollection[] | null) ?? []).map((collection) => collection.id)
    const districtIds = ((districts.data as WasteDistrict[] | null) ?? []).map((district) => district.id)
    const recipeIds = ((recipes.data as Recipe[] | null) ?? []).map((recipe) => recipe.id)

    const [shoppingItems, links, wasteEvents, wasteSortingItems, recipeIngredients] = await Promise.all([
      shoppingListIds.length
        ? supabase.from('shopping_items').select('*').in('list_id', shoppingListIds).order('sort_order')
        : Promise.resolve({ data: [], error: null }),
      collectionIds.length
        ? supabase.from('links').select('*').in('collection_id', collectionIds).order('favorite', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      districtIds.length
        ? supabase.from('waste_events').select('*').in('district_id', districtIds).order('date')
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from('waste_sorting_items')
        .select('*, category:waste_sorting_categories(name)')
        .order('term'),
      recipeIds.length
        ? supabase.from('recipe_ingredients').select('*').in('recipe_id', recipeIds).order('sort_order')
        : Promise.resolve({ data: [], error: null }),
    ])

    const secondError = [shoppingItems, links, wasteEvents, wasteSortingItems, recipeIngredients].find((result) => result.error)
    if (secondError?.error) {
      const mirroredData = createOfflineMirrorData(family)
      if (mirroredData) {
        setData(mirroredData)
        hasLoadedRef.current = true
        setLoading(false)
        return
      }
      setError(secondError.error.message)
      setLoading(false)
      return
    }

    const normalizedSortingItems =
      (wasteSortingItems.data as Array<WasteSortingItem & { category?: { name?: string } }> | null)?.map((item) => ({
        ...item,
        category_name: item.category?.name ?? item.category_name,
      })) ?? []

    const contractData = isMissingOptionalTable(serviceContracts.error)
      ? readHouseFallback<ServiceContract>(familyId, 'serviceContracts')
      : ((serviceContracts.data as ServiceContract[] | null) ?? [])
    const fallbackExpenseCategories = readHouseFallback<ExpenseCategory>(familyId, 'expenseCategories')
    const categoryData = isMissingOptionalTable(expenseCategories.error)
      ? fallbackExpenseCategories.length
        ? fallbackExpenseCategories
        : defaultExpenseCategoriesForFamily(familyId)
      : ((expenseCategories.data as ExpenseCategory[] | null) ?? [])
    const fallbackExpenses = readHouseFallback<ExpenseItem>(familyId, 'expenses')
    const expenseData = isMissingOptionalTable(expenses.error)
      ? fallbackExpenses.length
        ? fallbackExpenses
        : legacyContractsToExpenses(familyId, contractData, categoryData)
      : ((expenses.data as ExpenseItem[] | null) ?? [])
    const contactData = isMissingOptionalTable(contacts.error) ? [] : ((contacts.data as FamilyContact[] | null) ?? [])
    const emergencyData = isMissingOptionalTable(emergencyItems.error) ? [] : ((emergencyItems.data as EmergencyItem[] | null) ?? [])

    if (!isMissingOptionalTable(contacts.error) && !contacts.error) {
      saveMirror(familyId, 'contacts', contactData)
    }
    if (!isMissingOptionalTable(emergencyItems.error) && !emergencyItems.error) {
      saveMirror(familyId, 'emergencyItems', emergencyData)
    }

    setData({
      family,
      memberships: (
        ((memberships.data as (DashboardData['memberships'][number] & { profile?: { email?: string | null } })[] | null) ?? []).map(
          ({ profile, ...member }) => ({
            ...member,
            email: profile?.email ?? null,
          }),
        )
      ),
      events: (events.data as EventItem[] | null) ?? [],
      tasks: (tasks.data as TaskItem[] | null) ?? [],
      shoppingLists: (shoppingLists.data as ShoppingList[] | null) ?? [],
      shoppingItems: (shoppingItems.data as ShoppingItem[] | null) ?? [],
      linkCollections: (linkCollections.data as LinkCollection[] | null) ?? [],
      links: (links.data as FamilyLink[] | null) ?? [],
      contacts: contactData,
      emergencyItems: emergencyData,
      notes: (notes.data as NoteItem[] | null) ?? [],
      inventoryItems: isMissingOptionalTable(inventoryItems.error)
        ? readHouseFallback<InventoryItem>(familyId, 'inventoryItems')
        : ((inventoryItems.data as InventoryItem[] | null) ?? []),
      serviceContracts: contractData,
      expenseCategories: categoryData,
      expenses: expenseData,
      wasteDistricts: (districts.data as WasteDistrict[] | null) ?? [],
      wasteEvents: (wasteEvents.data as WasteEvent[] | null) ?? [],
      wasteSortingItems: normalizedSortingItems,
      recipes: (recipes.data as Recipe[] | null) ?? [],
      recipeIngredients: (recipeIngredients.data as RecipeIngredient[] | null) ?? [],
      recipeSuggestions: (recipeSuggestions.data as RecipeSuggestion[] | null) ?? [],
      activitySuggestions: (activities.data as ActivitySuggestion[] | null) ?? [],
      activityAgentRuns: (activityRuns.data as ActivityAgentRun[] | null) ?? [],
      notificationDeliveries: (deliveries.data as NotificationDelivery[] | null) ?? [],
    })
    hasLoadedRef.current = true
    setLoading(false)
  }, [family, familyId, userId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (!supabase || !familyId) {
      return
    }

    const client = supabase
    const channel = client
      .channel(`family-${familyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `family_id=eq.${familyId}` }, () => {
        void loadData()
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_lists', filter: `family_id=eq.${familyId}` },
        () => {
          void loadData()
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `family_id=eq.${familyId}` },
        () => {
          void loadData()
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'family_contacts', filter: `family_id=eq.${familyId}` },
        () => {
          void loadData()
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'emergency_items', filter: `family_id=eq.${familyId}` },
        () => {
          void loadData()
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_items', filter: `family_id=eq.${familyId}` },
        () => {
          void loadData()
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_contracts', filter: `family_id=eq.${familyId}` },
        () => {
          void loadData()
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expense_categories', filter: `family_id=eq.${familyId}` },
        () => {
          void loadData()
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `family_id=eq.${familyId}` },
        () => {
          void loadData()
        },
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [familyId, loadData])

  const setLocalInventoryItems = useCallback((items: InventoryItem[]) => {
    setData((current) => (current ? { ...current, inventoryItems: items } : current))
  }, [])

  const setLocalServiceContracts = useCallback((contracts: ServiceContract[]) => {
    setData((current) => (current ? { ...current, serviceContracts: contracts } : current))
  }, [])

  const setLocalExpenseCategories = useCallback((categories: ExpenseCategory[]) => {
    setData((current) => (current ? { ...current, expenseCategories: categories } : current))
  }, [])

  const setLocalExpenses = useCallback((expenses: ExpenseItem[]) => {
    setData((current) => (current ? { ...current, expenses } : current))
  }, [])

  const actions = useMemo(
    () => ({
      refresh: loadData,
      createEvent: async (
        input: Pick<
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
        >,
      ) => {
        const client = requireSupabase()
        if (!familyId) {
          return
        }
        const { data: event, error: eventError } = await client
          .from('events')
          .insert({ ...input, ...assignmentPayloadForEvent(input), family_id: familyId, created_by: userId })
          .select()
          .single()

        if (eventError) {
          throw eventError
        }

        if (input.is_important || input.notify_family) {
          await client.rpc('create_family_notification', {
            p_family_id: familyId,
            p_type: 'event',
            p_title: 'Neuer wichtiger Termin',
            p_body: input.title,
            p_target_type: 'event',
            p_target_id: event.id,
            p_priority: input.notify_family ? 'urgent' : 'important',
          })
        }

        await loadData()
      },
      updateEvent: async (
        event: EventItem,
        input: Pick<
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
        >,
      ) => {
        const client = requireSupabase()
        const { error: updateError } = await client
          .from('events')
          .update({ ...input, ...assignmentPayloadForEvent(input), updated_at: new Date().toISOString() })
          .eq('id', event.id)
        if (updateError) {
          throw updateError
        }
        await loadData()
      },
      deleteEvent: async (event: EventItem) => {
        const client = requireSupabase()
        const { error: deleteError } = await client.from('events').delete().eq('id', event.id)
        if (deleteError) {
          throw deleteError
        }
        await loadData()
      },
      createTask: async (
        input: Pick<TaskItem, 'title' | 'description' | 'due_at' | 'assignee_membership_id' | 'category' | 'is_important' | 'notify_family'>,
      ) => {
        const client = requireSupabase()
        if (!familyId) {
          return
        }
        const { data: task, error: taskError } = await client
          .from('tasks')
          .insert({
            ...input,
            ...assignmentPayloadForTask(input),
            family_id: familyId,
            status: input.due_at ? 'today' : 'open',
            created_by: userId,
          })
          .select()
          .single()

        if (taskError) {
          throw taskError
        }

        if (input.is_important || input.notify_family) {
          await client.rpc('create_family_notification', {
            p_family_id: familyId,
            p_type: 'task',
            p_title: 'Neue wichtige Aufgabe',
            p_body: input.title,
            p_target_type: 'task',
            p_target_id: task.id,
            p_priority: input.notify_family ? 'urgent' : 'important',
          })
        }

        await loadData()
      },
      updateTask: async (
        task: TaskItem,
        input: Pick<
          TaskItem,
          'title' | 'description' | 'due_at' | 'assignee_membership_id' | 'category' | 'is_important' | 'notify_family' | 'status'
        >,
      ) => {
        const client = requireSupabase()
        const { error: updateError } = await client
          .from('tasks')
          .update({ ...input, ...assignmentPayloadForTask(input), updated_at: new Date().toISOString() })
          .eq('id', task.id)
        if (updateError) {
          throw updateError
        }
        await loadData()
      },
      updateTaskStatus: async (task: TaskItem, status: TaskItem['status']) => {
        const client = requireSupabase()
        const { error: updateError } = await client.from('tasks').update({ status }).eq('id', task.id)
        if (updateError) {
          throw updateError
        }
        await loadData()
      },
      deleteTask: async (task: TaskItem) => {
        const client = requireSupabase()
        const { error: deleteError } = await client.from('tasks').delete().eq('id', task.id)
        if (deleteError) {
          throw deleteError
        }
        await loadData()
      },
      addShoppingItem: async (
        listId: string,
        input: Pick<ShoppingItem, 'title' | 'quantity' | 'unit' | 'category' | 'source_label'>,
      ) => {
        const client = requireSupabase()
        const { error: insertError } = await client.from('shopping_items').insert({
          list_id: listId,
          title: input.title,
          quantity: input.quantity,
          unit: input.unit,
          category: input.category,
          source_label: input.source_label,
          checked: false,
          sort_order: Date.now(),
          added_by: userId,
        })
        if (insertError) {
          throw insertError
        }
        await loadData()
      },
      createShoppingList: async (input: Pick<ShoppingList, 'title' | 'store_type' | 'is_template'>) => {
        const client = requireSupabase()
        if (!familyId) {
          throw new Error('Keine aktive Familie gefunden.')
        }
        const { data: created, error: insertError } = await client
          .from('shopping_lists')
          .insert({ ...input, family_id: familyId, archived: false })
          .select()
          .single()
        if (insertError) {
          throw insertError
        }
        await loadData()
        return created as ShoppingList
      },
      updateShoppingList: async (list: ShoppingList, input: Pick<ShoppingList, 'title' | 'store_type' | 'is_template'> & { archived: boolean }) => {
        const client = requireSupabase()
        const { error: updateError } = await client.from('shopping_lists').update(input).eq('id', list.id)
        if (updateError) {
          throw updateError
        }
        await loadData()
      },
      deleteShoppingList: async (list: ShoppingList) => {
        const client = requireSupabase()
        const { error: itemError } = await client.from('shopping_items').delete().eq('list_id', list.id)
        if (itemError) {
          throw itemError
        }
        const { error: listError } = await client.from('shopping_lists').delete().eq('id', list.id)
        if (listError) {
          throw listError
        }
        await loadData()
      },
      copyShoppingListFromTemplate: async (template: ShoppingList, title: string) => {
        const client = requireSupabase()
        if (!familyId) {
          return
        }
        const templateItems = data?.shoppingItems.filter((item) => item.list_id === template.id) ?? []
        const { data: created, error: listError } = await client
          .from('shopping_lists')
          .insert({ family_id: familyId, title, store_type: template.store_type, archived: false, is_template: false })
          .select()
          .single()
        if (listError) {
          throw listError
        }
        if (templateItems.length) {
          const { error: itemError } = await client.from('shopping_items').insert(
            templateItems.map((item, index) => ({
              list_id: created.id,
              title: item.title,
              quantity: item.quantity,
              unit: item.unit,
              category: item.category,
              source_label: item.source_label,
              checked: false,
              sort_order: index,
              added_by: userId,
            })),
          )
          if (itemError) {
            throw itemError
          }
        }
        await loadData()
      },
      updateShoppingItem: async (
        item: ShoppingItem,
        input: Pick<ShoppingItem, 'title' | 'quantity' | 'unit' | 'category' | 'source_label'>,
      ) => {
        const client = requireSupabase()
        const { error: updateError } = await client
          .from('shopping_items')
          .update({
            title: input.title,
            quantity: input.quantity,
            unit: input.unit,
            category: input.category,
            source_label: input.source_label,
          })
          .eq('id', item.id)
        if (updateError) {
          throw updateError
        }
        await loadData()
      },
      toggleShoppingItem: async (item: ShoppingItem) => {
        const client = requireSupabase()
        const { error: updateError } = await client
          .from('shopping_items')
          .update({ checked: !item.checked, checked_by: !item.checked ? userId : null })
          .eq('id', item.id)
        if (updateError) {
          throw updateError
        }
        await loadData()
      },
      deleteShoppingItem: async (item: ShoppingItem) => {
        const client = requireSupabase()
        const { error: deleteError } = await client.from('shopping_items').delete().eq('id', item.id)
        if (deleteError) {
          throw deleteError
        }
        await loadData()
      },
      clearShoppingList: async (listId: string, checkedOnly: boolean) => {
        const client = requireSupabase()
        let query = client.from('shopping_items').delete().eq('list_id', listId)
        if (checkedOnly) {
          query = query.eq('checked', true)
        }
        const { error: deleteError } = await query
        if (deleteError) {
          throw deleteError
        }
        await loadData()
      },
      createLink: async (
        input: Pick<FamilyLink, 'collection_id' | 'title' | 'url' | 'description' | 'favorite' | 'is_important' | 'notify_family'>,
      ) => {
        const client = requireSupabase()
        const { error: insertError } = await client.from('links').insert(input)
        if (insertError) {
          throw insertError
        }
        await loadData()
      },
      createLinkCollection: async (input: Pick<LinkCollection, 'title' | 'sort_order'>) => {
        const client = requireSupabase()
        if (!familyId) {
          throw new Error('Keine aktive Familie gefunden.')
        }
        const { data: created, error: insertError } = await client
          .from('link_collections')
          .insert({ ...input, family_id: familyId })
          .select()
          .single()
        if (insertError) {
          throw insertError
        }
        await loadData()
        return created as LinkCollection
      },
      updateLink: async (link: FamilyLink, input: UpdateFamilyLinkInput) => {
        const client = requireSupabase()
        await updateFamilyLinkRecord(client, link, input)
        await loadData()
      },
      deleteLink: async (link: FamilyLink) => {
        const client = requireSupabase()
        await deleteFamilyLinkRecord(client, link)
        await loadData()
      },
      createFamilyContact: async (
        input: Pick<FamilyContact, 'name' | 'relation' | 'phone' | 'mobile' | 'email' | 'address' | 'notes' | 'favorite'>,
      ) => {
        const client = requireSupabase()
        if (!familyId) {
          return
        }
        const { error: insertError } = await client.from('family_contacts').insert({
          ...input,
          family_id: familyId,
          created_by: userId,
        })
        if (insertError) {
          throw insertError
        }
        await loadData()
      },
      updateFamilyContact: async (
        contact: FamilyContact,
        input: Pick<FamilyContact, 'name' | 'relation' | 'phone' | 'mobile' | 'email' | 'address' | 'notes' | 'favorite'>,
      ) => {
        const client = requireSupabase()
        const { error: updateError } = await client
          .from('family_contacts')
          .update({ ...input, updated_at: new Date().toISOString() })
          .eq('id', contact.id)
        if (updateError) {
          throw updateError
        }
        await loadData()
      },
      deleteFamilyContact: async (contact: FamilyContact) => {
        const client = requireSupabase()
        const { error: deleteError } = await client.from('family_contacts').delete().eq('id', contact.id)
        if (deleteError) {
          throw deleteError
        }
        await loadData()
      },
      createEmergencyItem: async (
        input: Pick<
          EmergencyItem,
          'type' | 'title' | 'primary_text' | 'secondary_text' | 'phone' | 'address' | 'url' | 'notes' | 'priority'
        >,
      ) => {
        const client = requireSupabase()
        if (!familyId) {
          return
        }
        const { error: insertError } = await client.from('emergency_items').insert({
          ...input,
          family_id: familyId,
          created_by: userId,
        })
        if (insertError) {
          throw insertError
        }
        await loadData()
      },
      updateEmergencyItem: async (
        item: EmergencyItem,
        input: Pick<EmergencyItem, 'type' | 'title' | 'primary_text' | 'secondary_text' | 'phone' | 'address' | 'url' | 'notes' | 'priority'>,
      ) => {
        const client = requireSupabase()
        const { error: updateError } = await client
          .from('emergency_items')
          .update({ ...input, updated_at: new Date().toISOString() })
          .eq('id', item.id)
        if (updateError) {
          throw updateError
        }
        await loadData()
      },
      deleteEmergencyItem: async (item: EmergencyItem) => {
        const client = requireSupabase()
        const { error: deleteError } = await client.from('emergency_items').delete().eq('id', item.id)
        if (deleteError) {
          throw deleteError
        }
        await loadData()
      },
      createNote: async (input: Pick<NoteItem, 'title' | 'body' | 'category' | 'visibility' | 'is_important' | 'notify_family'>) => {
        const client = requireSupabase()
        if (!familyId) {
          return
        }
        const { data: note, error: noteError } = await client
          .from('notes')
          .insert({ ...input, family_id: familyId, updated_by: userId })
          .select()
          .single()
        if (noteError) {
          throw noteError
        }
        if (input.is_important || input.notify_family) {
          await client.rpc('create_family_notification', {
            p_family_id: familyId,
            p_type: 'note',
            p_title: 'Neue wichtige Familiennotiz',
            p_body: input.title,
            p_target_type: 'note',
            p_target_id: note.id,
            p_priority: input.notify_family ? 'urgent' : 'important',
          })
        }
        await loadData()
      },
      updateNote: async (note: NoteItem, input: UpdateFamilyNoteInput) => {
        const client = requireSupabase()
        await updateFamilyNoteRecord(client, note, userId, input)
        await loadData()
      },
      deleteNote: async (note: NoteItem) => {
        const client = requireSupabase()
        await deleteFamilyNoteRecord(client, note)
        await loadData()
      },
      createInventoryItem: async (
        input: Pick<
          InventoryItem,
          | 'title'
          | 'category'
          | 'location'
          | 'purchase_date'
          | 'warranty_until'
          | 'value_eur'
          | 'serial_number'
          | 'document_url'
          | 'condition'
          | 'notes'
        >,
      ) => {
        const client = requireSupabase()
        if (!familyId) {
          return
        }
        const payload = { ...input, family_id: familyId, created_by: userId }
        const { error: insertError } = await client.from('inventory_items').insert(payload)
        if (insertError) {
          if (isMissingOptionalTable(insertError)) {
            const localItem: InventoryItem = {
              id: newLocalHouseId('inventory-local'),
              ...payload,
              updated_at: new Date().toISOString(),
            }
            setLocalInventoryItems(upsertHouseFallback(familyId, 'inventoryItems', localItem))
            return
          }
          throw insertError
        }
        await loadData()
      },
      updateInventoryItem: async (
        item: InventoryItem,
        input: Pick<
          InventoryItem,
          | 'title'
          | 'category'
          | 'location'
          | 'purchase_date'
          | 'warranty_until'
          | 'value_eur'
          | 'serial_number'
          | 'document_url'
          | 'condition'
          | 'notes'
        >,
      ) => {
        const client = requireSupabase()
        const payload = { ...input, updated_at: new Date().toISOString() }
        const { error: updateError } = await client.from('inventory_items').update(payload).eq('id', item.id)
        if (updateError) {
          if (familyId && isMissingOptionalTable(updateError)) {
            setLocalInventoryItems(upsertHouseFallback(familyId, 'inventoryItems', { ...item, ...payload }))
            return
          }
          throw updateError
        }
        await loadData()
      },
      deleteInventoryItem: async (item: InventoryItem) => {
        const client = requireSupabase()
        const { error: deleteError } = await client.from('inventory_items').delete().eq('id', item.id)
        if (deleteError) {
          if (familyId && isMissingOptionalTable(deleteError)) {
            setLocalInventoryItems(deleteHouseFallback<InventoryItem>(familyId, 'inventoryItems', item.id))
            return
          }
          throw deleteError
        }
        await loadData()
      },
      createServiceContract: async (
        input: Pick<
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
        >,
      ) => {
        const client = requireSupabase()
        if (!familyId) {
          return
        }
        const payload = { ...input, family_id: familyId, created_by: userId }
        const { error: insertError } = await client.from('service_contracts').insert(payload)
        if (insertError) {
          if (isMissingOptionalTable(insertError)) {
            const localContract: ServiceContract = {
              id: newLocalHouseId('contract-local'),
              ...payload,
              updated_at: new Date().toISOString(),
            }
            setLocalServiceContracts(upsertHouseFallback(familyId, 'serviceContracts', localContract))
            return
          }
          throw insertError
        }
        await loadData()
      },
      updateServiceContract: async (
        contract: ServiceContract,
        input: Pick<
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
        >,
      ) => {
        const client = requireSupabase()
        const payload = { ...input, updated_at: new Date().toISOString() }
        const { error: updateError } = await client.from('service_contracts').update(payload).eq('id', contract.id)
        if (updateError) {
          if (familyId && isMissingOptionalTable(updateError)) {
            setLocalServiceContracts(upsertHouseFallback(familyId, 'serviceContracts', { ...contract, ...payload }))
            return
          }
          throw updateError
        }
        await loadData()
      },
      deleteServiceContract: async (contract: ServiceContract) => {
        const client = requireSupabase()
        const { error: deleteError } = await client.from('service_contracts').delete().eq('id', contract.id)
        if (deleteError) {
          if (familyId && isMissingOptionalTable(deleteError)) {
            setLocalServiceContracts(deleteHouseFallback<ServiceContract>(familyId, 'serviceContracts', contract.id))
            return
          }
          throw deleteError
        }
        await loadData()
      },
      createExpenseCategory: async (
        input: Pick<ExpenseCategory, 'title' | 'slug' | 'color' | 'icon' | 'sort_order' | 'active'>,
      ) => {
        const client = requireSupabase()
        if (!familyId) {
          throw new Error('Keine aktive Familie gefunden.')
        }
        const payload = { ...input, slug: input.slug || expenseCategorySlug(input.title), family_id: familyId, created_by: userId }
        const { data: category, error: insertError } = await client.from('expense_categories').insert(payload).select().single()
        if (insertError) {
          if (isMissingOptionalTable(insertError)) {
            const localCategory: ExpenseCategory = {
              id: newLocalHouseId('expense-category-local'),
              ...payload,
              updated_at: new Date().toISOString(),
            }
            const nextCategories = upsertHouseFallback(familyId, 'expenseCategories', localCategory)
            setLocalExpenseCategories(nextCategories)
            return localCategory
          }
          throw insertError
        }
        await loadData()
        return category as ExpenseCategory
      },
      updateExpenseCategory: async (
        category: ExpenseCategory,
        input: Pick<ExpenseCategory, 'title' | 'slug' | 'color' | 'icon' | 'sort_order' | 'active'>,
      ) => {
        const client = requireSupabase()
        const payload = { ...input, slug: input.slug || expenseCategorySlug(input.title), updated_at: new Date().toISOString() }
        const { error: updateError } = await client.from('expense_categories').update(payload).eq('id', category.id)
        if (updateError) {
          if (familyId && isMissingOptionalTable(updateError)) {
            setLocalExpenseCategories(upsertHouseFallback(familyId, 'expenseCategories', { ...category, ...payload }))
            return
          }
          throw updateError
        }
        await loadData()
      },
      createExpense: async (
        input: Pick<
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
        >,
      ) => {
        const client = requireSupabase()
        if (!familyId) {
          return
        }
        const payload = { ...input, family_id: familyId, created_by: userId }
        const { error: insertError } = await client.from('expenses').insert(payload)
        if (insertError) {
          if (isMissingOptionalTable(insertError)) {
            const localExpense: ExpenseItem = {
              id: newLocalHouseId('expense-local'),
              ...payload,
              source_contract_id: null,
              updated_at: new Date().toISOString(),
            }
            setLocalExpenses(upsertHouseFallback(familyId, 'expenses', localExpense))
            return
          }
          throw insertError
        }
        await loadData()
      },
      updateExpense: async (
        expense: ExpenseItem,
        input: Pick<
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
        >,
      ) => {
        const client = requireSupabase()
        const payload = { ...input, updated_at: new Date().toISOString() }
        const { error: updateError } = await client.from('expenses').update(payload).eq('id', expense.id)
        if (updateError) {
          if (familyId && isMissingOptionalTable(updateError)) {
            setLocalExpenses(upsertHouseFallback(familyId, 'expenses', { ...expense, ...payload }))
            return
          }
          throw updateError
        }
        await loadData()
      },
      deleteExpense: async (expense: ExpenseItem) => {
        const client = requireSupabase()
        const { error: deleteError } = await client.from('expenses').delete().eq('id', expense.id)
        if (deleteError) {
          if (familyId && isMissingOptionalTable(deleteError)) {
            setLocalExpenses(deleteHouseFallback<ExpenseItem>(familyId, 'expenses', expense.id))
            return
          }
          throw deleteError
        }
        await loadData()
      },
      markNotificationRead: async (delivery: NotificationDelivery) => {
        const client = requireSupabase()
        const { error: updateError } = await client
          .from('notification_deliveries')
          .update({ status: 'read', read_at: new Date().toISOString() })
          .eq('id', delivery.id)
        if (updateError) {
          throw updateError
        }
        await loadData()
      },
      addRecipeToShoppingList: async (listId: string, recipeId: string) => {
        const client = requireSupabase()
        const recipe = data?.recipes.find((entry) => entry.id === recipeId)
        const ingredients = data?.recipeIngredients.filter((ingredient) => ingredient.recipe_id === recipeId) ?? []
        const payload = ingredients
          .filter((ingredient) => !ingredient.optional)
          .map((ingredient, index) => ({
            list_id: listId,
            title: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            category: ingredient.shopping_category,
            source_label: recipe ? `Zutaten für ${recipe.title}` : 'Rezeptzutaten',
            checked: false,
            sort_order: Date.now() + index,
            added_by: userId,
          }))
        if (!payload.length) {
          return
        }
        const { error: insertError } = await client.from('shopping_items').insert(payload)
        if (insertError) {
          throw insertError
        }
        await loadData()
      },
      archiveRecipe: async (recipeId: string, archived: boolean) => {
        const client = requireSupabase()
        const { error: updateError } = await client.from('recipes').update({ status: archived ? 'archived' : 'active' }).eq('id', recipeId)
        if (updateError) {
          throw updateError
        }
        await loadData()
      },
      archiveActivity: async (activityId: string, archived: boolean) => {
        const client = requireSupabase()
        const { error: updateError } = await client
          .from('activity_suggestions')
          .update({ status: archived ? 'archived' : 'suggested' })
          .eq('id', activityId)
        if (updateError) {
          throw updateError
        }
        await loadData()
      },
      refreshActivities: async () => {
        const client = requireSupabase()
        if (!familyId) return
        const { error: refreshError } = await client.functions.invoke('refresh-activities', {
          body: { family_id: familyId, force: true },
        })
        if (refreshError) throw refreshError
        await loadData()
      },
      refreshRecipes: async () => {
        const client = requireSupabase()
        if (!familyId) return
        const { error: refreshError } = await client.functions.invoke('refresh-recipes', {
          body: { family_id: familyId },
        })
        if (refreshError) throw refreshError
        await loadData()
      },
      updateMembershipNavigation: async (memberUserId: string, visibleNavItems: string[]) => {
        const client = requireSupabase()
        if (!familyId) {
          return
        }
        const { error: updateError } = await client
          .from('family_memberships')
          .update({ visible_nav_items: visibleNavItems })
          .eq('family_id', familyId)
          .eq('user_id', memberUserId)
        if (updateError) {
          throw updateError
        }
        await loadData()
      },
      updateFamilyMember: async (
        memberUserId: string,
        input: { display_name: string; role: Role; active: boolean; visible_nav_items: string[] },
      ) => {
        const client = requireSupabase()
        if (!familyId) {
          return
        }
        const { error: updateError } = await client
          .from('family_memberships')
          .update({
            display_name: input.display_name,
            role: input.role,
            active: input.active,
            visible_nav_items: input.visible_nav_items,
          })
          .eq('family_id', familyId)
          .eq('user_id', memberUserId)
        if (updateError) {
          throw updateError
        }
        await loadData()
      },
      sendPasswordReset: async (email: string) => {
        const client = requireSupabase()
        const redirectTo =
          typeof window !== 'undefined' ? new URL(publicBasePath, window.location.origin).toString() : undefined
        const { error: resetError } = await client.auth.resetPasswordForEmail(email, { redirectTo })
        if (resetError) {
          throw resetError
        }
      },
      inviteFamilyMember: async (input: { email: string; display_name: string; role: Role }) => {
        const client = requireSupabase()
        if (!familyId) {
          return
        }

        const redirectTo =
          typeof window !== 'undefined' ? new URL(publicBasePath, window.location.origin).toString() : undefined
        const { error: inviteError } = await client.functions.invoke('invite-family-member', {
          body: {
            family_id: familyId,
            email: input.email,
            display_name: input.display_name,
            role: input.role,
            redirect_to: redirectTo,
          },
        })
        if (inviteError) {
          throw inviteError
        }
        await loadData()
      },
      manageFamilyMember: async (input: {
        user_id?: string
        login_name?: string
        email?: string | null
        display_name: string
        password?: string
        role: Role
        active: boolean
        visible_nav_items: string[]
      }) => {
        const client = requireSupabase()
        if (!familyId) {
          return
        }
        const { error: manageError } = await client.functions.invoke('manage-family-member', {
          body: {
            family_id: familyId,
            ...input,
          },
        })
        if (manageError) {
          throw manageError
        }
        await loadData()
      },
    }),
    [
      data?.recipeIngredients,
      data?.recipes,
      data?.shoppingItems,
      familyId,
      loadData,
      setLocalExpenseCategories,
      setLocalExpenses,
      setLocalInventoryItems,
      setLocalServiceContracts,
      userId,
    ],
  )

  return { data, loading, error, actions }
}
