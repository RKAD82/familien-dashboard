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

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, getServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { family_id: familyId } = await req.json().catch(() => ({ family_id: null }))
  if (!familyId) return json({ error: 'family_id_required' }, 400)

  const { data: existing } = await supabase
    .from('activity_agent_runs')
    .select('*')
    .gte('started_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .eq('status', 'ok')
    .limit(1)

  if (existing?.length) {
    return json({ status: 'already_ran_this_week' })
  }

  const { data: sources } = await supabase.from('activity_sources').select('*').eq('active', true)
  const { data: suggestions } = await supabase.from('activity_suggestions').select('*').eq('family_id', familyId)

  const { error: runError } = await supabase.from('activity_agent_runs').insert({
    status: 'ok',
    finished_at: new Date().toISOString(),
    sources_checked: sources?.length ?? 0,
    items_found: suggestions?.length ?? 0,
    items_saved: suggestions?.length ?? 0,
    error_summary: null,
  })

  if (runError) return json({ error: runError.message }, 500)
  return json({ status: 'ok', mode: 'seed-only', sources_checked: sources?.length ?? 0, suggestions: suggestions?.length ?? 0 })
})
