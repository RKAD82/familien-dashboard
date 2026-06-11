/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Parameters<typeof precacheAndRoute>[0]
}

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
clientsClaim()

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    void self.skipWaiting()
  }
})

self.addEventListener('push', (event) => {
  const fallback = {
    title: 'Neue Familienmeldung',
    body: 'Öffne das Familien-Dashboard für Details.',
    icon: './icons/family-dashboard.svg',
    badge: './icons/family-dashboard.svg',
    data: { url: './#/' },
  }

  const payload = event.data ? (event.data.json() as Partial<typeof fallback>) : fallback
  const title = payload.title ?? fallback.title
  const options: NotificationOptions = {
    body: payload.body ?? fallback.body,
    icon: payload.icon ?? fallback.icon,
    badge: payload.badge ?? fallback.badge,
    data: payload.data ?? fallback.data,
    tag: 'familien-dashboard-important',
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? './#/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url.includes('/familien-dashboard/'))
      if (existing && 'focus' in existing) {
        return existing.focus()
      }
      return self.clients.openWindow(url)
    }),
  )
})
