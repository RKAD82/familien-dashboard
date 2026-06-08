import { createClient } from 'npm:@supabase/supabase-js@2'
import { buildPushHTTPRequest } from 'npm:@pushforge/builder@2'

type PushSubscriptionRow = {
  id: string
  user_id: string
  device_id: string
  endpoint: string
  p256dh: string
  auth: string
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const getServiceKey = () => {
  const explicit = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (explicit) return explicit
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (!secretKeys) throw new Error('SUPABASE_SERVICE_ROLE_KEY oder SUPABASE_SECRET_KEYS fehlt.')
  return JSON.parse(secretKeys).default
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const privateJWK = Deno.env.get('VAPID_PRIVATE_KEY')
  const adminContact = Deno.env.get('VAPID_ADMIN_CONTACT') ?? 'mailto:admin@example.invalid'

  if (!supabaseUrl || !privateJWK) {
    return json({ error: 'missing_edge_secrets' }, 500)
  }

  const supabase = createClient(supabaseUrl, getServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { notification_id: notificationId } = await req.json().catch(() => ({ notification_id: null }))
  if (!notificationId) {
    return json({ error: 'notification_id_required' }, 400)
  }

  const { data: notification, error: notificationError } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', notificationId)
    .single()

  if (notificationError || !notification) {
    return json({ error: notificationError?.message ?? 'notification_not_found' }, 404)
  }

  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('family_id', notification.family_id)
    .gte('created_at', since)

  if ((count ?? 0) > 20) {
    return json({ error: 'rate_limited' }, 429)
  }

  const { data: subscriptions, error: subscriptionError } = await supabase
    .from('push_subscriptions')
    .select('id,user_id,device_id,endpoint,p256dh,auth')
    .is('revoked_at', null)

  if (subscriptionError) {
    return json({ error: subscriptionError.message }, 500)
  }

  const deliveries = subscriptions as PushSubscriptionRow[]
  const results = []

  for (const subscription of deliveries) {
    const payload = {
      title: notification.title,
      body: notification.body,
      icon: '/familien-dashboard/icons/family-dashboard.svg',
      badge: '/familien-dashboard/icons/family-dashboard.svg',
      data: {
        url: `/familien-dashboard/#/${notification.target_type === 'task' ? 'aufgaben' : 'meldungen'}`,
        notificationId,
      },
    }

    try {
      const request = await buildPushHTTPRequest({
        privateJWK: JSON.parse(privateJWK),
        subscription: {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        message: {
          payload,
          adminContact,
          options: {
            ttl: 86400,
            urgency: notification.priority === 'urgent' ? 'high' : 'normal',
            topic: `family-${notification.family_id}`,
          },
        },
      })

      const response = await fetch(request.endpoint, {
        method: 'POST',
        headers: request.headers,
        body: request.body,
      })

      await supabase.from('notification_deliveries').upsert(
        {
          notification_id: notificationId,
          user_id: subscription.user_id,
          device_id: subscription.device_id,
          channel: 'push',
          status: response.ok ? 'sent' : 'failed',
          sent_at: new Date().toISOString(),
          error: response.ok ? null : `${response.status} ${response.statusText}`,
        },
        { onConflict: 'notification_id,user_id,channel' },
      )

      results.push({ endpoint: subscription.endpoint, ok: response.ok, status: response.status })
    } catch (error) {
      await supabase.from('notification_deliveries').upsert(
        {
          notification_id: notificationId,
          user_id: subscription.user_id,
          device_id: subscription.device_id,
          channel: 'push',
          status: 'failed',
          sent_at: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'unknown_error',
        },
        { onConflict: 'notification_id,user_id,channel' },
      )
      results.push({ endpoint: subscription.endpoint, ok: false, status: 'exception' })
    }
  }

  return json({ sent: results.filter((result) => result.ok).length, attempted: results.length, results })
})
