/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { appPath, clientUrlMatchesBasePath, normalizeBasePath } from './lib/basePath'

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Parameters<typeof precacheAndRoute>[0]
}

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
clientsClaim()

const basePath = normalizeBasePath(__APP_BASE_PATH__)

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    void self.skipWaiting()
  }
})

self.addEventListener('push', (event) => {
  const fallback = {
    title: 'Neue Familienmeldung',
    body: 'Öffne das Familien-Dashboard für Details.',
    icon: appPath(basePath, 'icons/family-dashboard.svg'),
    badge: appPath(basePath, 'icons/family-dashboard.svg'),
    data: { url: appPath(basePath, '#/') },
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
  const targetUrl = url.startsWith('http') || url.startsWith(basePath) ? url : appPath(basePath, url)

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => clientUrlMatchesBasePath(client.url, basePath))
      if (existing && 'focus' in existing) {
        return existing.focus()
      }
      return self.clients.openWindow(targetUrl)
    }),
  )
})
