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
    input: { display_name: string; role: Role; active: boolean; visible_nav_items: NavItemId[]; login_name?: string; password?: string },
  ) => Promise<void>
}) => {
  const [displayName, setDisplayName] = useState(member.display_name)
  const [loginName, setLoginName] = useState(member.login_name ?? '')
  const [newPassword, setNewPassword] = useState('')
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
      if (checked) next.add(navId)
      else next.delete(navId)
      if (role === 'admin') next.add('system')
      return next
    })
  }

  const save = async () => {
    setError(null)
    setMessage(null)
    setSaving(true)
    const nextVisible = new Set(visible)
    if (role === 'admin') nextVisible.add('system')
    try {
      await onSave(member, {
        display_name: displayName.trim() || member.display_name,
        login_name: loginName.trim() || undefined,
        password: newPassword || undefined,
        role,
        active,
        visible_nav_items: uniqueNavItems([...nextVisible]),
      })
      setNewPassword('')
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
          <span>{member.login_name ? `Login: ${member.login_name}` : member.email ?? 'Kein Loginname'}</span>
        </div>
        <Tag tone={isCurrentUser ? 'good' : member.active ? 'info' : 'neutral'}>
          {isCurrentUser ? 'Du' : member.active ? 'aktiv' : 'inaktiv'}
        </Tag>
      </div>

      <div className="two-column-fields">
        <Field label="Name">
          <TextInput disabled={!canManage || saving} value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </Field>
        <Field label="Loginname">
          <TextInput disabled={!canManage || saving} value={loginName} onChange={(event) => setLoginName(event.target.value)} />
        </Field>
      </div>
      <div className="two-column-fields">
        <Field label="Rolle">
          <Select disabled={!canManage || saving} value={role} onChange={(event) => setRole(event.target.value as Role)}>
            {(['adult', 'child', 'admin'] as Role[]).map((entry) => (
              <option key={entry} value={entry}>
                {roleLabel[entry]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Neues Passwort">
          <TextInput
            disabled={!canManage || saving}
            minLength={8}
            placeholder="leer lassen = unverändert"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </Field>
      </div>

      <label className="member-active-toggle">
        <input checked={active} disabled={!canManage || saving || isCurrentUser} type="checkbox" onChange={(event) => setActive(event.target.checked)} />
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
        <Button disabled={!canManage || saving || !member.email || member.email.endsWith('@familie.local')} type="button" variant="secondary" onClick={() => void sendReset()}>
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
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newLoginName, setNewLoginName] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newRole, setNewRole] = useState<Role>('adult')
  const [userMessage, setUserMessage] = useState<string | null>(null)
  const [userError, setUserError] = useState<string | null>(null)

  const activeMembers = data.memberships.filter((entry) => entry.active)
  const currentMembership = activeMembers.find((entry) => entry.user_id === user?.id) ?? membership ?? activeMembers[0] ?? null
  const isAdmin = currentMembership?.role === 'admin'
  const canManageMembers = Boolean(configured && isAdmin && actions.manageFamilyMember)
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

  const onCreateUserSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setUserError(null)
    setUserMessage(null)
    if (!actions.manageFamilyMember) {
      setUserError('Direkte Nutzeranlage ist nicht aktiv.')
      return
    }
    if (!newName.trim() || !newLoginName.trim() || newUserPassword.length < 8) {
      setUserError('Bitte Name, Loginname und Passwort mit mindestens 8 Zeichen eintragen.')
      return
    }
    try {
      await actions.manageFamilyMember({
        login_name: newLoginName.trim(),
        email: newEmail.trim() || null,
        display_name: newName.trim(),
        password: newUserPassword,
        role: newRole,
        active: true,
        visible_nav_items: uniqueNavItems(navigationItems.filter((item) => item.defaultVisible || item.id === 'system').map((item) => item.id)),
      })
      setUserMessage(`Nutzer ${newLoginName.trim()} wurde angelegt.`)
      setNewEmail('')
      setNewName('')
      setNewLoginName('')
      setNewUserPassword('')
      setNewRole('adult')
    } catch (error) {
      setUserError(error instanceof Error ? error.message : 'Nutzer konnte nicht angelegt werden.')
    }
  }

  const saveMember = async (
    member: FamilyMembership,
    input: { display_name: string; role: Role; active: boolean; visible_nav_items: NavItemId[]; login_name?: string; password?: string },
  ) => {
    if (!actions.manageFamilyMember) throw new Error('Nutzerverwaltung ist in dieser Umgebung nicht aktiv.')
    await actions.manageFamilyMember({
      user_id: member.user_id,
      email: member.email ?? null,
      display_name: input.display_name,
      login_name: input.login_name,
      password: input.password,
      role: input.role,
      active: input.active,
      visible_nav_items: input.visible_nav_items,
    })
  }

  const sendResetMail = async (member: FamilyMembership) => {
    if (!member.email || member.email.endsWith('@familie.local')) throw new Error('Für diesen Nutzer gibt es keine echte E-Mail.')
    if (!actions.sendPasswordReset) throw new Error('Passwort-Reset ist in dieser Umgebung nicht aktiv.')
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
          <span>{currentMembership?.login_name ? `Login: ${currentMembership.login_name}` : user?.email ?? 'Aktueller Zugang konnte nicht gelesen werden.'}</span>
          <Tag tone={isAdmin ? 'good' : 'neutral'}>{currentMembership ? roleLabel[currentMembership.role] : 'ohne Rolle'}</Tag>
        </div>
      </Card>

      <Card title="Speicher">
        <div className="setup-card">
          <Database size={24} />
          <strong>{data.family.name}</strong>
          <span>{configured ? 'Onlinebetrieb mit Supabase.' : 'Demo-Vorschau ohne Supabase.'}</span>
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

      <Card title="Nutzer direkt anlegen">
        <form className="form-stack" onSubmit={onCreateUserSubmit}>
          <div className="form-intro">
            <Send size={22} />
            <span>Für Kinder reicht ein Loginname. E-Mail ist optional.</span>
          </div>
          <Field label="Name">
            <TextInput disabled={!canManageMembers} value={newName} onChange={(event) => setNewName(event.target.value)} />
          </Field>
          <Field label="Loginname">
            <TextInput disabled={!canManageMembers} placeholder="max" value={newLoginName} onChange={(event) => setNewLoginName(event.target.value)} />
          </Field>
          <Field label="Passwort">
            <TextInput disabled={!canManageMembers} minLength={8} type="password" value={newUserPassword} onChange={(event) => setNewUserPassword(event.target.value)} />
          </Field>
          <Field label="E-Mail optional">
            <TextInput disabled={!canManageMembers} type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} />
          </Field>
          <Field label="Rolle">
            <Select disabled={!canManageMembers} value={newRole} onChange={(event) => setNewRole(event.target.value as Role)}>
              {(['adult', 'child', 'admin'] as Role[]).map((role) => (
                <option key={role} value={role}>
                  {roleLabel[role]}
                </option>
              ))}
            </Select>
          </Field>
          {userError && <p className="form-error">{userError}</p>}
          {userMessage && <p className="form-success">{userMessage}</p>}
          <Button disabled={!canManageMembers} type="submit">
            Nutzer anlegen
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
              <TextInput autoComplete="new-password" disabled={!configured} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </Field>
            <Field label="Wiederholen">
              <TextInput autoComplete="new-password" disabled={!configured} type="password" value={passwordRepeat} onChange={(event) => setPasswordRepeat(event.target.value)} />
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
            <span>Admins verwalten Name, Login, Rolle, Status, Menüpunkte und Passwörter.</span>
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
              {data.activitySuggestions.length} Vorschläge, davon {activitiesWithSource} mit Link. Automatik läuft täglich und archiviert
              abgelaufene Einträge.
            </span>
            <Tag tone="good">täglich geplant</Tag>
          </article>
          <article>
            <ShieldCheck size={22} />
            <strong>Rezepte</strong>
            <span>Rezepte werden aus aktiven Familiendaten wöchentlich neu vorgeschlagen. Alte Wochenvorschläge werden archiviert.</span>
            <Tag tone="good">montags geplant</Tag>
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
