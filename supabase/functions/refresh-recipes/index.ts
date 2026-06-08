import { createClient } from 'npm:@supabase/supabase-js@2'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const getServiceKey = () => {
  const explicit = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (explicit) return explicit
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (!secretKeys) throw new Error('SUPABASE_SERVICE_ROLE_KEY oder SUPABASE_SECRET_KEYS fehlt.')
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

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, getServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { family_id: familyId } = await req.json().catch(() => ({ family_id: null }))
  if (!familyId) return json({ error: 'family_id_required' }, 400)

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
  await supabase.from('recipe_suggestions').delete().eq('family_id', familyId).eq('suggestion_week', week)
  const { error: insertError } = await supabase.from('recipe_suggestions').insert(
    selected.map((recipe, index) => ({
      family_id: familyId,
      recipe_id: recipe.id,
      suggestion_week: week,
      rank: index + 1,
      reason: recipe.is_vegetarian ? 'Vegetarische Mindestabdeckung' : 'Abwechslung für die Woche',
      status: 'suggested',
      generated_by: 'seed-generator',
    })),
  )

  if (insertError) return json({ error: insertError.message }, 500)
  return json({ status: 'ok', week, suggestions: selected.length })
})
