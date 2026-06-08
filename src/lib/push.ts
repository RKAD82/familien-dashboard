import { appConfig, publicBasePath } from '../config'
import { requireSupabase } from './supabase'

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export const canUsePush = () =>
  Boolean('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && appConfig.vapidPublicKey)

export const registerPushSubscription = async (familyId: string, userId: string) => {
  if (!canUsePush()) {
    throw new Error('Web Push ist auf diesem Gerät oder ohne VAPID Public Key nicht verfügbar.')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Push-Benachrichtigungen wurden nicht erlaubt.')
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(appConfig.vapidPublicKey),
  })
  const json = subscription.toJSON()
  const client = requireSupabase()

  const { data: device, error: deviceError } = await client
    .from('user_devices')
    .insert({
      user_id: userId,
      family_id: familyId,
      device_label: navigator.userAgent.slice(0, 120),
      platform: navigator.platform,
      browser: navigator.userAgent,
      push_enabled: true,
    })
    .select()
    .single()

  if (deviceError) {
    throw deviceError
  }

  const { error: subscriptionError } = await client.from('push_subscriptions').insert({
    user_id: userId,
    device_id: device.id,
    endpoint: json.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
    expiration_time: subscription.expirationTime ? new Date(subscription.expirationTime).toISOString() : null,
  })

  if (subscriptionError) {
    throw subscriptionError
  }
}

export const appUrlForTarget = (targetType: string, targetId?: string | null) => {
  const hash = targetType === 'task' ? '/aufgaben' : targetType === 'note' ? '/notizen' : '/heute'
  const suffix = targetId ? `?id=${encodeURIComponent(targetId)}` : ''
  return `${publicBasePath}#${hash}${suffix}`
}
