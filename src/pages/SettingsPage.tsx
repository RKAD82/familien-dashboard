import { Database, GitBranch, KeyRound, Mail, Save, Send, ShieldCheck, UserCheck, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button, Card, Field, Select, Tag, TextInput } from '../components/ui'
import { appConfig } from '../config'
import { useAuth } from '../hooks/useAuth'
import { navigationItems, visibleNavIdsForMembership } from '../navigation'
import { useFamilyRoute } from '../routes/context'
import type { FamilyMembership, NavItemId, Role } from '../types'

const roleLabel: Record<Role, string> = {
  admin: 'Admin',
  adult: 'Erwachsene Person',
  child: 'Kind',
}

const uniqueNavItems = (ids: NavItemId[]) => navigationItems.filter((item) => ids.includes(item.id)).map((item) => item.id)

const MemberAdminCard = ({
  canManage,
  currentUserId,
  member,
  onReset,
  onSave,
}: {
  canManage: boolean
  currentUserId?: string
  member: FamilyMembership
  onReset: (member: FamilyMembership) => Promise<void>
  onSave: (
    member: FamilyMembership,
    input: { display_name: string; role: Role; active: boolean; visible_nav_items: NavItemId[] },
  ) => Promise<void>
}) => {
  const [displayName, setDisplayName] = useState(member.display_name)
  const [role, setRole] = useState<Role>(member.role)
  const [active, setActive] = useState(member.active)
  const [visible, setVisible] = useState(() => new Set(visibleNavIdsForMembership(member)))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isCurrentUser = currentUserId === member.user_id

  const toggleNav = (navId: NavItemId, checked: boolean) => {
    setVisible((current) => {
      const next = new Set(current)
      if (checked) {
        next.add(navId)
      } else {
        next.delete(navId)
      }
      if (role === 'admin') {
        next.add('system')
      }
      return next
    })
  }

  const save = async () => {
    setError(null)
    setMessage(null)
    setSaving(true)
    const nextVisible = new Set(visible)
    if (role === 'admin') {
      nextVisible.add('system')
    }
    try {
      await onSave(member, {
        display_name: displayName.trim() || member.display_name,
        role,
        active,
        visible_nav_items: uniqueNavItems([...nextVisible]),
      })
      setMessage('Gespeichert.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Mitglied konnte nicht gespeichert werden.')
    } finally {
      setSaving(false)
    }
  }

  const sendReset = async () => {
    setError(null)
    setMessage(null)
    setSaving(true)
    try {
      await onReset(member)
      setMessage('Reset-Mail wurde versendet.')
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Reset-Mail konnte nicht versendet werden.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className={`member-admin-card ${!member.active ? 'is-inactive' : ''}`}>
      <div className="member-admin-header">
        <div>
          <strong>{member.display_name}</strong>
          <span>{member.email ?? 'Keine E-Mail im Profil'}</span>
        </div>
        <Tag tone={isCurrentUser ? 'good' : member.active ? 'info' : 'neutral'}>
          {isCurrentUser ? 'Du' : member.active ? 'aktiv' : 'inaktiv'}
        </Tag>
      </div>

      <div className="two-column-fields">
        <Field label="Name">
          <TextInput disabled={!canManage || saving} value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </Field>
        <Field label="Rolle">
          <Select disabled={!canManage || saving} value={role} onChange={(event) => setRole(event.target.value as Role)}>
            {(['adult', 'child', 'admin'] as Role[]).map((entry) => (
              <option key={entry} value={entry}>
                {roleLabel[entry]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <label className="member-active-toggle">
        <input
          checked={active}
          disabled={!canManage || saving || isCurrentUser}
          type="checkbox"
          onChange={(event) => setActive(event.target.checked)}
        />
        <span>Mitglied aktiv</span>
      </label>

      <div className="visibility-options">
        {navigationItems.map((item) => {
          const lockedSystem = role === 'admin' && item.id === 'system'
          return (
            <label key={item.id} className={!item.defaultVisible && !visible.has(item.id) ? 'is-muted' : ''}>
              <input
                checked={visible.has(item.id)}
                disabled={!canManage || saving || lockedSystem}
                type="checkbox"
                onChange={(event) => toggleNav(item.id, event.target.checked)}
              />
              <span>{item.label}</span>
              {!item.defaultVisible && <small>optional</small>}
            </label>
          )
        })}
      </div>

      {error && <p className="form-error">{error}</p>}
      {message && <p className="form-success">{message}</p>}
      <div className="member-admin-actions">
        <Button disabled={!canManage || saving} type="button" onClick={() => void save()}>
          <Save size={17} />
          Speichern
        </Button>
        <Button disabled={!canManage || saving || !member.email} type="button" variant="secondary" onClick={() => void sendReset()}>
          <Mail size={17} />
          Reset-Mail
        </Button>
      </div>
    </article>
  )
}

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

  const activeMembers = data.memberships.filter((entry) => entry.active)
  const currentMembership =
    activeMembers.find((entry) => entry.user_id === user?.id) ?? membership ?? activeMembers[0] ?? null
  const isAdmin = currentMembership?.role === 'admin'
  const canInvite = Boolean(configured && isAdmin && actions.inviteFamilyMember)
  const canManageMembers = Boolean(configured && isAdmin && actions.updateFamilyMember)
  const district = data.wasteDistricts[0]
  const activitiesWithSource = data.activitySuggestions.filter((activity) => activity.url).length
  const pushReady = Boolean(appConfig.vapidPublicKey)

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
      setInviteMessage(`Einladung für ${inviteEmail.trim()} wurde vorbereitet. Bitte auch den Junk-Ordner prüfen.`)
      setInviteEmail('')
      setInviteName('')
      setInviteRole('adult')
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Einladung konnte nicht verschickt werden.')
    }
  }

  const saveMember = async (
    member: FamilyMembership,
    input: { display_name: string; role: Role; active: boolean; visible_nav_items: NavItemId[] },
  ) => {
    if (!actions.updateFamilyMember) {
      throw new Error('Nutzerverwaltung ist in dieser Umgebung nicht aktiv.')
    }
    await actions.updateFamilyMember(member.user_id, input)
  }

  const sendResetMail = async (member: FamilyMembership) => {
    if (!member.email) {
      throw new Error('Für dieses Mitglied ist keine E-Mail im Profil gespeichert.')
    }
    if (!actions.sendPasswordReset) {
      throw new Error('Passwort-Reset ist in dieser Umgebung nicht aktiv.')
    }
    await actions.sendPasswordReset(member.email)
  }

  return (
    <div className="page-grid settings-page">
      <section className="page-title span-3">
        <div>
          <h1>System</h1>
          <p>Status, Zugang, Nutzerverwaltung, Quellenqualität und Veröffentlichung.</p>
        </div>
      </section>

      <Card title="Angemeldet als">
        <div className="setup-card">
          <UserCheck size={24} />
          <strong>{currentMembership?.display_name ?? user?.email ?? 'Nicht angemeldet'}</strong>
          <span>{user?.email ? user.email : 'Aktueller Zugang konnte nicht gelesen werden.'}</span>
          <Tag tone={isAdmin ? 'good' : 'neutral'}>{currentMembership ? roleLabel[currentMembership.role] : 'ohne Rolle'}</Tag>
        </div>
      </Card>

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

      <Card title="Person einladen">
        <form className="form-stack" onSubmit={onInviteSubmit}>
          <div className="form-intro">
            <Send size={22} />
            <span>Einladungen laufen über Supabase. Die Mail kann im Junk-Ordner landen.</span>
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

      <Card title="Passwort ändern" className="span-2">
        <form className="form-stack" onSubmit={onPasswordSubmit}>
          <div className="form-intro">
            <KeyRound size={22} />
            <span>Ändert das Passwort für den aktuell angemeldeten Zugang.</span>
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

      <Card title="Nutzerverwaltung" className="span-3">
        <div className="visibility-admin">
          <div className="form-intro">
            <UserPlus size={22} />
            <span>Admins verwalten Name, Rolle, Status, Menüpunkte und Passwort-Reset pro Mitglied.</span>
          </div>
          <div className="member-admin-grid">
            {data.memberships.map((member) => (
              <MemberAdminCard
                key={member.user_id}
                canManage={canManageMembers}
                currentUserId={user?.id}
                member={member}
                onReset={sendResetMail}
                onSave={saveMember}
              />
            ))}
          </div>
          {!canManageMembers && <p className="form-hint">Nutzerverwaltung ist nur für Admins aktiv.</p>}
        </div>
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
              {data.activitySuggestions.length} Vorschläge, davon {activitiesWithSource} mit Link. Aktualisieren lädt aktuell nur
              Supabase-Daten neu.
            </span>
            <Tag tone="warn">keine automatische Internetsuche</Tag>
          </article>
          <article>
            <ShieldCheck size={22} />
            <strong>Rezepte</strong>
            <span>Rezepte kommen aktuell aus Seed- oder Familiendaten und werden nicht automatisch neu generiert.</span>
            <Tag tone="neutral">manuell / Seed</Tag>
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
