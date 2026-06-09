import { createClient } from 'npm:@supabase/supabase-js@2'

type InviteRole = 'admin' | 'adult' | 'child'

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })

const getServiceKey = () => {
  const explicit = Deno.env.get('PROJECT_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (explicit) return explicit
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (!secretKeys) throw new Error('PROJECT_SERVICE_ROLE_KEY oder SUPABASE_SECRET_KEYS fehlt.')
  return JSON.parse(secretKeys).default
}

const isRole = (value: unknown): value is InviteRole => value === 'admin' || value === 'adult' || value === 'child'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('PROJECT_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL')
  if (!supabaseUrl) {
    return json({ error: 'missing_supabase_url' }, 500)
  }

  const authHeader = req.headers.get('authorization')
  const jwt = authHeader?.replace(/^Bearer\s+/i, '')
  if (!jwt) {
    return json({ error: 'missing_authorization' }, 401)
  }

  const supabase = createClient(supabaseUrl, getServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: requester, error: userError } = await supabase.auth.getUser(jwt)
  if (userError || !requester.user) {
    return json({ error: userError?.message ?? 'invalid_authorization' }, 401)
  }

  const body = await req.json().catch(() => null)
  const familyId = body?.family_id
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const displayName = typeof body?.display_name === 'string' ? body.display_name.trim() : ''
  const role = body?.role
  const redirectTo = typeof body?.redirect_to === 'string' ? body.redirect_to : undefined

  if (!familyId || !email || !displayName || !isRole(role)) {
    return json({ error: 'family_id_email_display_name_role_required' }, 400)
  }

  const { data: membership, error: membershipError } = await supabase
    .from('family_memberships')
    .select('role,active')
    .eq('family_id', familyId)
    .eq('user_id', requester.user.id)
    .eq('active', true)
    .single()

  if (membershipError || membership?.role !== 'admin') {
    return json({ error: 'admin_membership_required' }, 403)
  }

  const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { display_name: displayName, family_id: familyId },
    redirectTo,
  })

  if (inviteError || !invited.user) {
    return json({ error: inviteError?.message ?? 'invite_failed' }, 400)
  }

  const userId = invited.user.id
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    email,
    display_name: displayName,
  })
  if (profileError) {
    return json({ error: profileError.message }, 500)
  }

  const { error: memberError } = await supabase.from('family_memberships').upsert({
    family_id: familyId,
    user_id: userId,
    role,
    display_name: displayName,
    active: true,
  })
  if (memberError) {
    return json({ error: memberError.message }, 500)
  }

  return json({ status: 'invited', user_id: userId })
})
