import { Database, GitBranch, KeyRound, Send, ShieldCheck, SlidersHorizontal, UserPlus } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Button, Card, Field, Select, Tag, TextInput } from '../components/ui'
import { appConfig } from '../config'
import { useAuth } from '../hooks/useAuth'
import { defaultVisibleNavItemIds, navigationItems, visibleNavIdsForMembership } from '../navigation'
import { useFamilyRoute } from '../routes/context'
import type { NavItemId, Role } from '../types'

const roleLabel: Record<Role, string> = {
  admin: 'Admin',
  adult: 'Erwachsene Person',
  child: 'Kind',
}

const uniqueNavItems = (ids: NavItemId[]) => navigationItems.filter((item) => ids.includes(item.id)).map((item) => item.id)

export const SettingsPage = () => {
  const { data, actions } = useFamilyRoute()
  const { configured, membership, updatePassword, user } = useAuth()
  const [password, setPassword] = useState('')
  const [passwordRepeat, setPasswordRepeat] = useState('')
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('adult')
  const [inviteMessage, setInviteMessage] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [navMessage, setNavMessage] = useState<string | null>(null)
  const [navError, setNavError] = useState<string | null>(null)
  const [savingNavFor, setSavingNavFor] = useState<string | null>(null)

  const activeMembers = data.memberships.filter((entry) => entry.active)
  const currentMembership =
    activeMembers.find((entry) => entry.user_id === user?.id) ?? membership ?? activeMembers[0] ?? null
  const isAdmin = currentMembership?.role === 'admin'
  const canInvite = Boolean(configured && isAdmin && actions.inviteFamilyMember)
  const canManageNavigation = Boolean(isAdmin && actions.updateMembershipNavigation)
  const district = data.wasteDistricts[0]
  const activitiesWithSource = data.activitySuggestions.filter((activity) => activity.url).length
  const pushReady = Boolean(appConfig.vapidPublicKey)
  const defaultVisible = useMemo(() => new Set(defaultVisibleNavItemIds), [])

  const onPasswordSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setPasswordError(null)
    setPasswordMessage(null)

    if (password.length < 8) {
      setPasswordError('Das neue Passwort muss mindestens 8 Zeichen haben.')
      return
    }
    if (password !== passwordRepeat) {
      setPasswordError('Die Passwörter stimmen nicht überein.')
      return
    }

    try {
      await updatePassword(password)
      setPassword('')
      setPasswordRepeat('')
      setPasswordMessage('Passwort wurde geändert.')
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Passwort konnte nicht geändert werden.')
    }
  }

  const onInviteSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setInviteError(null)
    setInviteMessage(null)

    if (!actions.inviteFamilyMember) {
      setInviteError('Die Einladungsfunktion ist in dieser Umgebung nicht aktiv.')
      return
    }

    try {
      await actions.inviteFamilyMember({
        email: inviteEmail.trim(),
        display_name: inviteName.trim(),
        role: inviteRole,
      })
      setInviteMessage(`Einladung für ${inviteEmail.trim()} wurde vorbereitet.`)
      setInviteEmail('')
      setInviteName('')
      setInviteRole('adult')
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Einladung konnte nicht verschickt werden.')
    }
  }

  const updateMemberNav = async (memberUserId: string, navId: NavItemId, checked: boolean) => {
    const member = activeMembers.find((entry) => entry.user_id === memberUserId)
    if (!member || !actions.updateMembershipNavigation) {
      return
    }

    setNavError(null)
    setNavMessage(null)
    setSavingNavFor(memberUserId)

    const current = new Set(visibleNavIdsForMembership(member))
    if (checked) {
      current.add(navId)
    } else {
      current.delete(navId)
    }
    if (member.role === 'admin') {
      current.add('system')
    }

    try {
      await actions.updateMembershipNavigation(memberUserId, uniqueNavItems([...current]))
      setNavMessage('Menü-Sichtbarkeit wurde gespeichert.')
    } catch (error) {
      setNavError(error instanceof Error ? error.message : 'Menü-Sichtbarkeit konnte nicht gespeichert werden.')
    } finally {
      setSavingNavFor(null)
    }
  }

  return (
    <div className="page-grid settings-page">
      <section className="page-title span-3">
        <div>
          <h1>System</h1>
          <p>Status, Zugang, Sichtbarkeit, Quellenqualität und Veröffentlichung.</p>
        </div>
      </section>

      <Card title="Speicher">
        <div className="setup-card">
          <Database size={24} />
          <strong>{data.family.name}</strong>
          <span>
            {configured
              ? 'Onlinebetrieb mit Supabase. Familien-Daten werden pro Familie getrennt gespeichert.'
              : 'Demo-Vorschau ohne Supabase. Änderungen bleiben nur lokal in dieser Sitzung.'}
          </span>
          <Tag tone="good">Zugriff pro Familie getrennt</Tag>
        </div>
      </Card>

      <Card title="Veröffentlichung">
        <div className="setup-card">
          <GitBranch size={24} />
          <strong>GitHub Pages</strong>
          <code>{appConfig.basePath}</code>
          <span>Vor jedem Upload lokal prüfen: Typecheck, Lint, Tests und Build.</span>
        </div>
      </Card>

      <Card title="Mitglieder">
        <div className="setup-card">
          <UserPlus size={24} />
          <strong>{activeMembers.length} aktive Mitglieder</strong>
          <span>{isAdmin ? 'Du kannst weitere Personen einladen.' : 'Einladungen sind Admins vorbehalten.'}</span>
          <Tag tone={canInvite ? 'good' : 'warn'}>{canInvite ? 'Einladung aktiv' : 'Setup nötig'}</Tag>
        </div>
      </Card>

      <Card title="Menü-Sichtbarkeit" className="span-3">
        <div className="visibility-admin">
          <div className="form-intro">
            <SlidersHorizontal size={22} />
            <span>Admins können pro Familienmitglied festlegen, welche Menüpunkte in der App sichtbar sind.</span>
          </div>
          <div className="visibility-grid">
            {activeMembers.map((member) => {
              const visible = new Set(visibleNavIdsForMembership(member))
              return (
                <article key={member.user_id}>
                  <div className="visibility-member-title">
                    <strong>{member.display_name}</strong>
                    <Tag tone={member.role === 'admin' ? 'info' : 'neutral'}>{roleLabel[member.role]}</Tag>
                  </div>
                  <div className="visibility-options">
                    {navigationItems.map((item) => {
                      const lockedSystem = member.role === 'admin' && item.id === 'system'
                      return (
                        <label key={item.id} className={!item.defaultVisible && !visible.has(item.id) ? 'is-muted' : ''}>
                          <input
                            checked={visible.has(item.id)}
                            disabled={!canManageNavigation || savingNavFor === member.user_id || lockedSystem}
                            type="checkbox"
                            onChange={(event) => updateMemberNav(member.user_id, item.id, event.target.checked)}
                          />
                          <span>{item.label}</span>
                          {!item.defaultVisible && defaultVisible.has(item.id) === false && <small>ausgeblendet</small>}
                        </label>
                      )
                    })}
                  </div>
                </article>
              )
            })}
          </div>
          {navError && <p className="form-error">{navError}</p>}
          {navMessage && <p className="form-success">{navMessage}</p>}
          {!canManageNavigation && <p className="form-hint">Menü-Sichtbarkeit ist nur für Admins aktiv und benötigt die neue Supabase-Migration.</p>}
        </div>
      </Card>

      <Card title="Passwort ändern" className="span-2">
        <form className="form-stack" onSubmit={onPasswordSubmit}>
          <div className="form-intro">
            <KeyRound size={22} />
            <span>Ändert das Passwort für den aktuell angemeldeten Supabase-Zugang.</span>
          </div>
          <div className="two-column-fields">
            <Field label="Neues Passwort">
              <TextInput
                autoComplete="new-password"
                disabled={!configured}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            <Field label="Wiederholen">
              <TextInput
                autoComplete="new-password"
                disabled={!configured}
                type="password"
                value={passwordRepeat}
                onChange={(event) => setPasswordRepeat(event.target.value)}
              />
            </Field>
          </div>
          {passwordError && <p className="form-error">{passwordError}</p>}
          {passwordMessage && <p className="form-success">{passwordMessage}</p>}
          <Button disabled={!configured} type="submit">
            Passwort speichern
          </Button>
        </form>
      </Card>

      <Card title="Person einladen">
        <form className="form-stack" onSubmit={onInviteSubmit}>
          <div className="form-intro">
            <Send size={22} />
            <span>Einladungen laufen über eine Supabase Edge Function, nicht über Admin-Schlüssel im Browser.</span>
          </div>
          <Field label="E-Mail">
            <TextInput
              autoComplete="email"
              disabled={!canInvite}
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
            />
          </Field>
          <Field label="Anzeigename">
            <TextInput disabled={!canInvite} value={inviteName} onChange={(event) => setInviteName(event.target.value)} />
          </Field>
          <Field label="Rolle">
            <Select disabled={!canInvite} value={inviteRole} onChange={(event) => setInviteRole(event.target.value as Role)}>
              {(['adult', 'child', 'admin'] as Role[]).map((role) => (
                <option key={role} value={role}>
                  {roleLabel[role]}
                </option>
              ))}
            </Select>
          </Field>
          {inviteError && <p className="form-error">{inviteError}</p>}
          {inviteMessage && <p className="form-success">{inviteMessage}</p>}
          <Button disabled={!canInvite} type="submit">
            Einladung senden
          </Button>
        </form>
      </Card>

      <Card title="Datenqualität" className="span-3">
        <div className="quality-grid">
          <article>
            <ShieldCheck size={22} />
            <strong>Abfallkalender</strong>
            <span>{district ? `${district.district_name}, Seed-Stand ${district.source_checked_at}` : 'Kein Bezirk geladen.'}</span>
            <Tag tone="warn">Originalprüfung offen</Tag>
          </article>
          <article>
            <ShieldCheck size={22} />
            <strong>Aktivitäten</strong>
            <span>
              {data.activitySuggestions.length} Vorschläge, davon {activitiesWithSource} mit Link.
            </span>
            <Tag tone="warn">Preise und Termine vor Buchung prüfen</Tag>
          </article>
          <article>
            <ShieldCheck size={22} />
            <strong>Push</strong>
            <span>{pushReady ? 'VAPID Public Key ist gesetzt.' : 'VAPID Public Key fehlt oder ist Platzhalter.'}</span>
            <Tag tone={pushReady ? 'good' : 'warn'}>{pushReady ? 'vorbereitet' : 'nicht produktiv'}</Tag>
          </article>
        </div>
      </Card>
    </div>
  )
}
