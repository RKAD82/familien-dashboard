import { createClient } from 'npm:@supabase/supabase-js@2'

type Role = 'admin' | 'adult' | 'child'

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

const isRole = (value: unknown): value is Role => value === 'admin' || value === 'adult' || value === 'child'

const normalizeLogin = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const supabaseUrl = Deno.env.get('PROJECT_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL')
  if (!supabaseUrl) return json({ error: 'missing_supabase_url' }, 500)

  const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!jwt) return json({ error: 'missing_authorization' }, 401)

  const supabase = createClient(supabaseUrl, getServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: requester, error: userError } = await supabase.auth.getUser(jwt)
  if (userError || !requester.user) return json({ error: userError?.message ?? 'invalid_authorization' }, 401)

  const body = await req.json().catch(() => null)
  const familyId = typeof body?.family_id === 'string' ? body.family_id : ''
  const displayName = typeof body?.display_name === 'string' ? body.display_name.trim() : ''
  const loginName = typeof body?.login_name === 'string' ? normalizeLogin(body.login_name) : ''
  const email = typeof body?.email === 'string' && body.email.trim() ? body.email.trim().toLowerCase() : null
  const password = typeof body?.password === 'string' && body.password ? body.password : null
  const role = body?.role
  const userId = typeof body?.user_id === 'string' && body.user_id ? body.user_id : null
  const active = typeof body?.active === 'boolean' ? body.active : true
  const visibleNavItems = Array.isArray(body?.visible_nav_items) ? body.visible_nav_items : null

  if (!familyId || !displayName || !isRole(role)) {
    return json({ error: 'family_id_display_name_role_required' }, 400)
  }

  const { data: adminMembership, error: adminError } = await supabase
    .from('family_memberships')
    .select('role,active')
    .eq('family_id', familyId)
    .eq('user_id', requester.user.id)
    .eq('active', true)
    .single()

  if (adminError || adminMembership?.role !== 'admin') return json({ error: 'admin_membership_required' }, 403)

  let managedUserId = userId
  const authEmail = email ?? `${loginName}@familie.local`
  if (!managedUserId) {
    if (!loginName || !password || password.length < 8) return json({ error: 'login_name_password_required' }, 400)
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName, family_id: familyId, login_name: loginName },
    })
    if (createError || !created.user) return json({ error: createError?.message ?? 'create_user_failed' }, 400)
    managedUserId = created.user.id
  } else if (password) {
    const { error: passwordError } = await supabase.auth.admin.updateUserById(managedUserId, { password })
    if (passwordError) return json({ error: passwordError.message }, 400)
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: managedUserId,
    email: authEmail,
    display_name: displayName,
  })
  if (profileError) return json({ error: profileError.message }, 500)

  const membershipPayload: Record<string, unknown> = {
    family_id: familyId,
    user_id: managedUserId,
    role,
    display_name: displayName,
    active,
    login_name: loginName || null,
  }
  if (visibleNavItems) membershipPayload.visible_nav_items = visibleNavItems

  const { error: memberError } = await supabase.from('family_memberships').upsert(membershipPayload)
  if (memberError) return json({ error: memberError.message }, 500)

  return json({ status: userId ? 'updated' : 'created', user_id: managedUserId, login_name: loginName || null })
})
