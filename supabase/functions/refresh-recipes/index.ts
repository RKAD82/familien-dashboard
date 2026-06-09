import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'content-type': 'application/json' } })

const getServiceKey = () => {
  const explicit = Deno.env.get('PROJECT_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (explicit) return explicit
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (!secretKeys) throw new Error('PROJECT_SERVICE_ROLE_KEY oder SUPABASE_SECRET_KEYS fehlt.')
  return JSON.parse(secretKeys).default
}

const getWeekKey = () => {
  const now = new Date()
  const copy = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const day = copy.getUTCDay() || 7
  copy.setUTCDate(copy.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((copy.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${copy.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

const isAdmin = async (supabase: ReturnType<typeof createClient>, familyId: string, jwt: string) => {
  const { data: requester, error: userError } = await supabase.auth.getUser(jwt)
  if (userError || !requester.user) return false
  const { data } = await supabase
    .from('family_memberships')
    .select('role,active')
    .eq('family_id', familyId)
    .eq('user_id', requester.user.id)
    .eq('active', true)
    .single()
  return data?.role === 'admin'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const supabaseUrl = Deno.env.get('PROJECT_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL')
  if (!supabaseUrl) return json({ error: 'missing_supabase_url' }, 500)

  const supabase = createClient(supabaseUrl, getServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { family_id: familyId } = await req.json().catch(() => ({ family_id: null }))
  if (!familyId) return json({ error: 'family_id_required' }, 400)

  const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!jwt || !(await isAdmin(supabase, familyId, jwt))) return json({ error: 'admin_membership_required' }, 403)

  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('family_id', familyId)
    .eq('status', 'active')
    .order('is_vegetarian', { ascending: false })
    .order('title')

  if (error) return json({ error: error.message }, 500)

  const selected = [
    ...(recipes ?? []).filter((recipe) => recipe.is_vegetarian).slice(0, 2),
    ...(recipes ?? []).filter((recipe) => !recipe.is_vegetarian).slice(0, 3),
  ].slice(0, 5)

  const week = getWeekKey()
  await supabase.from('recipe_suggestions').update({ status: 'archived' }).eq('family_id', familyId).eq('suggestion_week', week)
  const { error: insertError } = await supabase.from('recipe_suggestions').upsert(
    selected.map((recipe, index) => ({
      family_id: familyId,
      recipe_id: recipe.id,
      suggestion_week: week,
      rank: index + 1,
      reason: recipe.is_vegetarian ? 'Vegetarische Mindestabdeckung' : 'Abwechslung für die Woche',
      status: 'suggested',
      generated_by: 'seed-generator',
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })),
    { onConflict: 'family_id,recipe_id,suggestion_week' },
  )

  if (insertError) return json({ error: insertError.message }, 500)

  const now = new Date().toISOString()
  await supabase.from('activity_agent_runs').insert({
    family_id: familyId,
    run_type: 'recipes',
    status: 'ok',
    finished_at: now,
    sources_checked: recipes?.length ?? 0,
    items_found: recipes?.length ?? 0,
    items_saved: selected.length,
    error_summary: null,
  })

  return json({ status: 'ok', week, suggestions: selected.length })
})
