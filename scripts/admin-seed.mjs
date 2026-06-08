import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

const loadEnv = () => {
  const envPath = resolve(root, '.env')
  try {
    const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
      const [key, ...valueParts] = trimmed.split('=')
      process.env[key.trim()] ??= valueParts.join('=').trim().replace(/^"|"$/g, '')
    }
  } catch {
    // .env ist optional. CI kann Variablen direkt setzen.
  }
}

const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'))

loadEnv()

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SEED_ADMIN_EMAIL', 'SEED_SECOND_EMAIL', 'SEED_TEST_PASSWORD']
const missing = required.filter((key) => !process.env[key])
if (missing.length) {
  console.error(`Fehlende Umgebungsvariablen: ${missing.join(', ')}`)
  process.exit(1)
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const createUser = async (email, displayName) => {
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) throw listError
  const existing = listData.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
  if (existing) return existing

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: process.env.SEED_TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  })
  if (error) throw error
  return data.user
}

const upsertFamilyBase = async (adminUser, secondUser) => {
  const familyName = process.env.SEED_FAMILY_NAME || 'Familie Klein'
  const { data: existingMembership } = await supabase
    .from('family_memberships')
    .select('family_id')
    .eq('user_id', adminUser.id)
    .maybeSingle()

  const familyId = existingMembership?.family_id
  const family = familyId
    ? { id: familyId }
    : (
        await supabase
          .from('families')
          .insert({ name: familyName, default_timezone: 'Europe/Berlin' })
          .select()
          .single()
      ).data

  if (!family?.id) throw new Error('Familie konnte nicht erzeugt werden.')

  const members = [
    {
      user: adminUser,
      role: 'admin',
      displayName: process.env.SEED_ADMIN_NAME || 'Admin',
      avatarColor: '#345c52',
    },
  ]

  if (secondUser.id !== adminUser.id) {
    members.push({
      user: secondUser,
      role: 'adult',
      displayName: process.env.SEED_SECOND_NAME || 'Erwachsene Person',
      avatarColor: '#c76f4a',
    })
  }

  const { error: profileError } = await supabase.from('profiles').upsert(
    members.map((member) => ({
      id: member.user.id,
      email: member.user.email,
      display_name: member.displayName,
      avatar_color: member.avatarColor,
    })),
  )
  if (profileError) throw profileError

  const { error: membershipError } = await supabase.from('family_memberships').upsert(
    members.map((member) => ({
      family_id: family.id,
      user_id: member.user.id,
      role: member.role,
      display_name: member.displayName,
      active: true,
    })),
  )
  if (membershipError) throw membershipError

  return family.id
}

const seedCore = async (familyId, adminUserId) => {
  const { data: calendars } = await supabase
    .from('calendars')
    .upsert(
      [
        { family_id: familyId, name: 'Familie', color: '#345c52', visibility: 'family', type: 'family' },
        { family_id: familyId, name: 'Schule/Kita', color: '#2f73b7', visibility: 'family', type: 'school' },
        { family_id: familyId, name: 'Abfall', color: '#4b7f52', visibility: 'family', type: 'waste' },
      ],
      { onConflict: 'family_id,name' },
    )
    .select()

  const familyCalendar = calendars?.find((calendar) => calendar.name === 'Familie')
  await supabase.from('events').upsert(
    [
      {
        family_id: familyId,
        calendar_id: familyCalendar?.id ?? null,
        title: 'Familienrunde',
        starts_at: '2026-06-14T17:00:00.000Z',
        ends_at: '2026-06-14T17:30:00.000Z',
        category: 'Familie',
        is_important: false,
        notify_family: false,
        created_by: adminUserId,
      },
    ],
    { onConflict: 'family_id,title,starts_at' },
  )

  await supabase.from('tasks').upsert(
    [
      {
        family_id: familyId,
        title: 'Wochenplanung prüfen',
        description: 'Termine, Einkauf und Aufgaben für die kommende Woche kurz durchgehen.',
        status: 'open',
        due_at: '2026-06-09T17:00:00.000Z',
        category: 'Familie',
        is_important: true,
        notify_family: false,
        created_by: adminUserId,
      },
      {
        family_id: familyId,
        title: 'Einkaufsliste füllen',
        description: 'Standardartikel und Rezeptzutaten ergänzen.',
        status: 'open',
        due_at: null,
        category: 'Einkauf',
        is_important: false,
        notify_family: false,
        created_by: adminUserId,
      },
    ],
    { onConflict: 'family_id,title' },
  )

  const { data: shoppingLists } = await supabase
    .from('shopping_lists')
    .upsert(
      [
        { family_id: familyId, title: 'Supermarkt', store_type: 'supermarkt', archived: false },
        { family_id: familyId, title: 'Drogerie', store_type: 'drogerie', archived: false },
      ],
      { onConflict: 'family_id,title' },
    )
    .select()

  const supermarket = shoppingLists?.find((list) => list.title === 'Supermarkt')
  if (supermarket) {
    await supabase.from('shopping_items').upsert([
      { list_id: supermarket.id, title: 'Milch', quantity: '2', unit: 'l', category: 'Kühlregal', source_label: null, sort_order: 1 },
      { list_id: supermarket.id, title: 'Äpfel', quantity: '1', unit: 'kg', category: 'Obst', source_label: null, sort_order: 2 },
    ], { onConflict: 'list_id,title' })
  }

  const { data: collections } = await supabase
    .from('link_collections')
    .upsert(
      [
        { family_id: familyId, title: 'Alltag', sort_order: 1 },
        { family_id: familyId, title: 'Schule und Freizeit', sort_order: 2 },
      ],
      { onConflict: 'family_id,title' },
    )
    .select()
  const everyday = collections?.find((collection) => collection.title === 'Alltag')
  if (everyday) {
    await supabase.from('links').upsert([
      {
        collection_id: everyday.id,
        title: 'Wetter',
        url: 'https://www.dwd.de/',
        description: 'Wetter und Warnlage',
        favorite: true,
      },
      {
        collection_id: everyday.id,
        title: 'Stadt Pulheim',
        url: 'https://www.pulheim.de/',
        description: 'Kommunale Informationen',
        favorite: true,
      },
    ], { onConflict: 'collection_id,title' })
  }

  await supabase.from('notes').upsert(
    [
      {
        family_id: familyId,
        title: 'Notfallzettel prüfen',
        body: 'Kontakte, Medikamente und wichtige Nummern nicht ungeprüft speichern. Erst Datenschutzniveau klären.',
        category: 'Sicherheit',
        visibility: 'adults',
        is_important: true,
        notify_family: false,
        updated_by: adminUserId,
      },
    ],
    { onConflict: 'family_id,title' },
  )
}

const seedWaste = async () => {
  const wasteSeed = readJson('data/seed/abfall-pulheim-2026-brauweiler.json')
  const sortingSeed = readJson('data/seed/waste-sorting-pulheim.json')

  const { data: district, error: districtError } = await supabase
    .from('waste_districts')
    .upsert(wasteSeed.district, { onConflict: 'municipality,district_name' })
    .select()
    .single()
  if (districtError) throw districtError

  const sourceUid = 'pulheim-2026-manual'
  const { data: source } = await supabase
    .from('waste_sources')
    .upsert(
      {
        source_type: 'manual-seed',
        url: null,
        fetched_at: new Date().toISOString(),
        checksum: sourceUid,
        notes: 'Manuell übernommen, vor Produktivbetrieb gegen Original-PDF prüfen.',
      },
      { onConflict: 'checksum' },
    )
    .select()
    .single()

  await supabase.from('waste_events').upsert(
    wasteSeed.events.map((event) => ({
      ...event,
      district_id: district.id,
      source_id: source?.id ?? null,
      source_event_uid: `${event.date}-${event.waste_type}`,
    })),
    { onConflict: 'district_id,date,waste_type' },
  )

  for (const category of sortingSeed.categories) {
    await supabase.from('waste_sorting_categories').upsert(category, { onConflict: 'name' })
  }
  const { data: categories } = await supabase.from('waste_sorting_categories').select('*')
  const categoryByName = new Map(categories?.map((category) => [category.name, category.id]) ?? [])
  await supabase.from('waste_sorting_items').upsert(
    sortingSeed.items.map((item) => ({
      category_id: categoryByName.get(item.category_name),
      term: item.term,
      aliases: item.aliases,
      description: item.description,
      allowed: item.allowed,
      warning: item.warning,
      source_note: item.source_note,
    })),
    { onConflict: 'category_id,term' },
  )
  await supabase.from('waste_locations').upsert(
    sortingSeed.locations.map((location) => ({
      ...location,
      district_id: district.id,
    })),
    { onConflict: 'district_id,name' },
  )
}

const seedRecipes = async (familyId, adminUserId) => {
  const recipeSeed = readJson('data/seed/recipes-seed.json')
  await supabase.from('recipe_preferences').upsert({ family_id: familyId }, { onConflict: 'family_id' })
  const recipeIds = []

  for (const recipe of recipeSeed.recipes) {
    const { ingredients, ...recipeRow } = recipe
    const { data: savedRecipe, error } = await supabase
      .from('recipes')
      .upsert(
        {
          ...recipeRow,
          family_id: familyId,
          source_type: 'seed',
          visibility: 'family',
          status: 'active',
          created_by: adminUserId,
        },
        { onConflict: 'family_id,title' },
      )
      .select()
      .single()
    if (error) throw error
    recipeIds.push(savedRecipe.id)
    await supabase.from('recipe_ingredients').upsert(
      ingredients.map((ingredient, index) => ({
        ...ingredient,
        recipe_id: savedRecipe.id,
        note: null,
        optional: false,
        sort_order: index + 1,
      })),
      { onConflict: 'recipe_id,name' },
    )
  }

  const week = '2026-W24'
  await supabase.from('recipe_suggestions').upsert(
    recipeIds.slice(0, 5).map((recipeId, index) => ({
      family_id: familyId,
      recipe_id: recipeId,
      suggestion_week: week,
      rank: index + 1,
      reason: index < 2 ? 'Vegetarische Mindestabdeckung' : 'Abwechslung für die Woche',
      status: 'suggested',
      generated_by: 'seed-generator',
    })),
    { onConflict: 'family_id,recipe_id,suggestion_week' },
  )
}

const seedActivities = async (familyId) => {
  const activitySeed = readJson('data/seed/activity-sources.json')
  const { data: sources } = await supabase
    .from('activity_sources')
    .upsert(activitySeed.sources, { onConflict: 'name' })
    .select()
  const firstSource = sources?.[0]

  await supabase.from('activity_suggestions').upsert(
    activitySeed.suggestions.map((suggestion) => ({
      ...suggestion,
      family_id: familyId,
      source_id: firstSource?.id ?? null,
      expires_at: '2026-12-31T23:00:00.000Z',
    })),
    { onConflict: 'family_id,external_id' },
  )
}

const main = async () => {
  const adminUser = await createUser(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_NAME || 'Admin')
  const secondUser = await createUser(process.env.SEED_SECOND_EMAIL, process.env.SEED_SECOND_NAME || 'Erwachsene Person')
  const familyId = await upsertFamilyBase(adminUser, secondUser)
  await seedCore(familyId, adminUser.id)
  await seedWaste()
  await seedRecipes(familyId, adminUser.id)
  await seedActivities(familyId)
  console.log(`Seed abgeschlossen. Familie: ${familyId}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
