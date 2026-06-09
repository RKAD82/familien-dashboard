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
  const { family_id: familyId, force = false } = await req.json().catch(() => ({ family_id: null }))
  if (!familyId) return json({ error: 'family_id_required' }, 400)

  const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!jwt || !(await isAdmin(supabase, familyId, jwt))) return json({ error: 'admin_membership_required' }, 403)

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: existing } = await supabase
    .from('activity_agent_runs')
    .select('*')
    .eq('family_id', familyId)
    .eq('run_type', 'activities')
    .gte('started_at', since)
    .eq('status', 'ok')
    .limit(1)

  if (existing?.length && !force) {
    return json({ status: 'skipped', reason: 'already_ran_this_week' })
  }

  const now = new Date().toISOString()
  const { data: sources } = await supabase.from('activity_sources').select('*').eq('active', true)
  const { data: allSuggestions } = await supabase.from('activity_suggestions').select('*').eq('family_id', familyId)
  const stale = (allSuggestions ?? []).filter((item) => {
    const expired = item.expires_at && item.expires_at < now
    const eventPast = item.starts_at && item.starts_at < now
    return item.status === 'suggested' && (expired || eventPast)
  })

  if (stale.length) {
    await supabase.from('activity_suggestions').update({ status: 'archived' }).in('id', stale.map((item) => item.id))
  }

  if (sources?.length) {
    await supabase.from('activity_sources').update({ last_checked_at: now }).in('id', sources.map((source) => source.id))
  }

  const activeCount = (allSuggestions ?? []).filter((item) => item.status !== 'archived').length - stale.length
  const { error: runError } = await supabase.from('activity_agent_runs').insert({
    family_id: familyId,
    run_type: 'activities',
    status: 'ok',
    finished_at: now,
    sources_checked: sources?.length ?? 0,
    items_found: allSuggestions?.length ?? 0,
    items_saved: Math.max(0, activeCount),
    error_summary: stale.length ? `${stale.length} alte Vorschläge archiviert.` : null,
  })

  if (runError) return json({ error: runError.message }, 500)
  return json({
    status: 'ok',
    mode: 'stored-sources',
    sources_checked: sources?.length ?? 0,
    archived: stale.length,
    active: Math.max(0, activeCount),
  })
})
