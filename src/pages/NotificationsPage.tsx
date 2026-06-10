import { Bell, Check, Smartphone } from 'lucide-react'
import { useState } from 'react'
import { canUsePush, registerPushSubscription } from '../lib/push'
import { useAuth } from '../hooks/useAuth'
import { useFamilyRoute } from '../routes/context'
import { Button, Card, EmptyState, Tag } from '../components/ui'

export const NotificationsPage = () => {
  const { data, actions } = useFamilyRoute()
  const { user } = useAuth()
  const [pushMessage, setPushMessage] = useState<string | null>(null)
  const unread = data.notificationDeliveries.filter((delivery) => delivery.status !== 'read')
  const read = data.notificationDeliveries.length - unread.length
  const pushSupported = canUsePush()

  const enablePush = async () => {
    if (!user) {
      return
    }
    try {
      await registerPushSubscription(data.family.id, user.id)
      setPushMessage('Push-Subscription wurde gespeichert.')
    } catch (error) {
      setPushMessage(error instanceof Error ? error.message : 'Push konnte nicht aktiviert werden.')
    }
  }

  return (
    <div className="page-grid notifications-page">
      <section className="page-title span-3">
        <div>
          <h1>Meldungen</h1>
          <p>Wichtige Aufgaben und Notizen erscheinen hier als Familienmeldung mit Lesestatus.</p>
        </div>
        <div className="page-actions">
          <Tag tone={unread.length ? 'warn' : 'good'}>{unread.length} ungelesen</Tag>
          <Tag>{read} gelesen</Tag>
          <Tag tone={pushSupported ? 'good' : 'warn'}>{pushSupported ? 'Push möglich' : 'Push lokal nicht aktiv'}</Tag>
        </div>
      </section>

      <Card title="In-App" className="notification-status-card">
        <div className="notification-summary">
          <Bell size={28} />
          <strong>{unread.length}</strong>
          <span>ungelesene Meldungen</span>
        </div>
      </Card>

      <Card title="Web Push" className="push-status-card span-2">
        <div className="push-box">
          <Smartphone size={24} />
          <p>
            iOS Web Push braucht iOS 16.4+, HTTPS und die zum Home-Bildschirm hinzugefügte PWA. Lokal ist echte
            iOS-Zustellung nicht prüfbar.
          </p>
          <Button variant="secondary" disabled={!pushSupported} onClick={() => void enablePush()}>
            Push aktivieren
          </Button>
          {pushMessage && <small>{pushMessage}</small>}
        </div>
      </Card>

      <Card title="Meldungen" className="span-3">
        {data.notificationDeliveries.length ? (
          <div className="notification-list">
            {data.notificationDeliveries.map((delivery) => (
              <article key={delivery.id} className={delivery.status === 'read' ? 'read' : ''}>
                <div>
                  <strong>{delivery.notification?.title ?? 'Meldung'}</strong>
                  <span>{delivery.notification?.body ?? ''}</span>
                  <Tag tone={delivery.notification?.priority === 'urgent' ? 'warn' : 'info'}>
                    {delivery.notification?.priority ?? delivery.status}
                  </Tag>
                </div>
                {delivery.status !== 'read' && (
                  <Button variant="ghost" onClick={() => void actions.markNotificationRead(delivery)}>
                    <Check size={18} />
                    Gelesen
                  </Button>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Keine Meldungen" body="Wichtige Aufgaben und Notizen erzeugen hier Einträge." />
        )}
      </Card>
    </div>
  )
}
