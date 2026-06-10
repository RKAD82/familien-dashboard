import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { requireSupabase, supabase } from '../lib/supabase'
import type {
  ActivitySuggestion,
  ActivityAgentRun,
  DashboardData,
  EmergencyItem,
  EventItem,
  Family,
  FamilyContact,
  FamilyLink,
  LinkCollection,
  NoteItem,
  NotificationDelivery,
  Recipe,
  RecipeIngredient,
  RecipeSuggestion,
  Role,
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

export const useFamilyData = (family: Family | null, userId: string | null) => {
  const [data, setData] = useState<DashboardData | null>(family ? emptyData(family) : null)
  const [loading, setLoading] = useState(Boolean(family))
  const [error, setError] = useState<string | null>(null)

  const familyId = family?.id ?? null

  const loadData = useCallback(async () => {
    if (!familyId || !family || !supabase) {
      setData(null)
      setLoading(false)
      return
    }

    setLoading(true)
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
      districts,
      recipes,
      recipeSuggestions,
      activities,
      activityRuns,
      deliveries,
    ].find((result) => result.error && !isMissingOptionalTable(result.error))

    if (firstError?.error) {
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
      setError(secondError.error.message)
      setLoading(false)
      return
    }

    const normalizedSortingItems =
      (wasteSortingItems.data as Array<WasteSortingItem & { category?: { name?: string } }> | null)?.map((item) => ({
        ...item,
        category_name: item.category?.name ?? item.category_name,
      })) ?? []

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
      contacts: isMissingOptionalTable(contacts.error) ? [] : ((contacts.data as FamilyContact[] | null) ?? []),
      emergencyItems: isMissingOptionalTable(emergencyItems.error) ? [] : ((emergencyItems.data as EmergencyItem[] | null) ?? []),
      notes: (notes.data as NoteItem[] | null) ?? [],
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
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [familyId, loadData])

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
          return
        }
        const { error: insertError } = await client.from('shopping_lists').insert({ ...input, family_id: familyId, archived: false })
        if (insertError) {
          throw insertError
        }
        await loadData()
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
    [data?.recipeIngredients, data?.recipes, data?.shoppingItems, familyId, loadData, userId],
  )

  return { data, loading, error, actions }
}
