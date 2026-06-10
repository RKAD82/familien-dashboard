import { Eye, KeyRound, Save, UserRound } from 'lucide-react'
import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { Button, Card, Field, Select, Tag, TextInput } from '../components/ui'
import { appConfig } from '../config'
import { useAuth } from '../hooks/useAuth'
import { memberAvatarColor, memberInitials } from '../lib/assignments'
import { navigationItems, visibleNavIdsForMembership } from '../navigation'
import { useFamilyRoute } from '../routes/context'
import type { NavItemId, Role } from '../types'

const roleLabel: Record<Role, string> = {
  admin: 'Admin',
  adult: 'Erwachsene Person',
  child: 'Kind',
}

const uniqueNavItems = (ids: NavItemId[]) => navigationItems.filter((item) => ids.includes(item.id)).map((item) => item.id)

export const ProfilePage = () => {
  const { actions, actualMembership, currentMembership, data, setSimulatedMembershipId, simulatedMembershipId } = useFamilyRoute()
  const { configured, updatePassword, user } = useAuth()
  const [displayName, setDisplayName] = useState(currentMembership?.display_name ?? '')
  const [loginName, setLoginName] = useState(currentMembership?.login_name ?? '')
  const [password, setPassword] = useState('')
  const [passwordRepeat, setPasswordRepeat] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const activeMembers = data.memberships.filter((member) => member.active)
  const isAdmin = actualMembership?.role === 'admin'
  const isOwnProfile = currentMembership?.user_id === user?.id
  const canManageViewedMember = Boolean(configured && isAdmin && actions.manageFamilyMember && currentMembership)
  const canChangePassword = Boolean(configured && currentMembership && (isOwnProfile || canManageViewedMember))
  const viewedNavItems = currentMembership ? visibleNavIdsForMembership(currentMembership) : []

  useEffect(() => {
    setDisplayName(currentMembership?.display_name ?? '')
    setLoginName(currentMembership?.login_name ?? '')
    setPassword('')
    setPasswordRepeat('')
    setMessage(null)
    setError(null)
  }, [currentMembership?.id, currentMembership?.display_name, currentMembership?.login_name])

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault()
    setMessage(null)
    setError(null)
    if (!currentMembership || !actions.manageFamilyMember) return
    try {
      await actions.manageFamilyMember({
        user_id: currentMembership.user_id,
        email: currentMembership.email ?? null,
        display_name: displayName.trim() || currentMembership.display_name,
        login_name: loginName.trim() || (currentMembership.login_name ?? undefined),
        role: currentMembership.role,
        active: currentMembership.active,
        visible_nav_items: uniqueNavItems(viewedNavItems),
      })
      setMessage('Profil wurde gespeichert.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Profil konnte nicht gespeichert werden.')
    }
  }

  const savePassword = async (event: FormEvent) => {
    event.preventDefault()
    setMessage(null)
    setError(null)
    if (!currentMembership) return
    if (password.length < 8) {
      setError('Das neue Passwort muss mindestens 8 Zeichen haben.')
      return
    }
    if (password !== passwordRepeat) {
      setError('Die Passwörter stimmen nicht überein.')
      return
    }

    try {
      if (isOwnProfile) {
        await updatePassword(password)
      } else if (actions.manageFamilyMember) {
        await actions.manageFamilyMember({
          user_id: currentMembership.user_id,
          email: currentMembership.email ?? null,
          display_name: currentMembership.display_name,
          login_name: currentMembership.login_name ?? undefined,
          password,
          role: currentMembership.role,
          active: currentMembership.active,
          visible_nav_items: uniqueNavItems(viewedNavItems),
        })
      }
      setPassword('')
      setPasswordRepeat('')
      setMessage('Passwort wurde gespeichert.')
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : 'Passwort konnte nicht gespeichert werden.')
    }
  }

  return (
    <div className="page-grid profile-page">
      <section className="page-title span-3">
        <div>
          <h1>Profil</h1>
          <p>{currentMembership ? `${currentMembership.display_name}, Zugang und Ansicht.` : 'Aktueller Zugang konnte nicht gelesen werden.'}</p>
        </div>
        <div className="page-actions">
          <Tag tone={isAdmin ? 'good' : 'neutral'}>{currentMembership ? roleLabel[currentMembership.role] : 'ohne Rolle'}</Tag>
          <Tag tone={simulatedMembershipId ? 'info' : 'neutral'}>{simulatedMembershipId ? 'Simulation aktiv' : 'Eigene Ansicht'}</Tag>
        </div>
      </section>

      <Card title="Person" className="profile-overview-card">
        <div className="profile-person-card">
          <span
            className="profile-avatar"
            style={{ '--avatar-color': memberAvatarColor(currentMembership, activeMembers) } as CSSProperties}
          >
            {memberInitials(currentMembership) || <UserRound size={22} />}
          </span>
          <div>
            <strong>{currentMembership?.display_name ?? 'Unbekannt'}</strong>
            <span>{currentMembership?.email ?? currentMembership?.login_name ?? 'Kein Login angezeigt'}</span>
          </div>
          <Tag tone={currentMembership?.role === 'admin' ? 'good' : 'neutral'}>{currentMembership ? roleLabel[currentMembership.role] : 'ohne Rolle'}</Tag>
        </div>
      </Card>

      <Card title="Profildaten" className="span-2 profile-form-card">
        <form className="form-stack" onSubmit={saveProfile}>
          <div className="two-column-fields">
            <Field label="Name">
              <TextInput disabled={!canManageViewedMember} value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </Field>
            <Field label="Loginname (Kurzname)">
              <TextInput disabled={!canManageViewedMember} value={loginName} onChange={(event) => setLoginName(event.target.value)} />
            </Field>
          </div>
          <div className="compact-list">
            <article>
              <strong>E-Mail</strong>
              <span>{currentMembership?.email ?? 'Kein E-Mail-Zugang hinterlegt.'}</span>
            </article>
            <article>
              <strong>Sichtbare Bereiche</strong>
              <span>{viewedNavItems.length ? viewedNavItems.join(', ') : 'Standardnavigation'}</span>
            </article>
          </div>
          <Button disabled={!canManageViewedMember} type="submit">
            <Save size={17} />
            Profildaten speichern
          </Button>
        </form>
      </Card>

      <Card title={isOwnProfile ? 'Eigenes Passwort' : 'Passwort setzen'} className="span-2 profile-password-card">
        <form className="form-stack" onSubmit={savePassword}>
          <div className="two-column-fields">
            <Field label="Neues Passwort">
              <TextInput autoComplete="new-password" disabled={!canChangePassword} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </Field>
            <Field label="Wiederholen">
              <TextInput autoComplete="new-password" disabled={!canChangePassword} type="password" value={passwordRepeat} onChange={(event) => setPasswordRepeat(event.target.value)} />
            </Field>
          </div>
          <Button disabled={!canChangePassword} type="submit">
            <KeyRound size={17} />
            Passwort speichern
          </Button>
        </form>
      </Card>

      {isAdmin && (
        <Card title="Ansicht simulieren" className="profile-simulation-card">
          <div className="form-stack">
            <div className="form-intro">
              <Eye size={22} />
              <span>Die Simulation ändert die Ansicht, nicht den echten Login.</span>
            </div>
            <Field label="Person">
              <Select value={simulatedMembershipId ?? ''} onChange={(event) => setSimulatedMembershipId?.(event.target.value || null)}>
                <option value="">Eigene Ansicht</option>
                {activeMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.display_name}
                  </option>
                ))}
              </Select>
            </Field>
            {simulatedMembershipId && (
              <Button type="button" variant="secondary" onClick={() => setSimulatedMembershipId?.(null)}>
                Simulation beenden
              </Button>
            )}
          </div>
        </Card>
      )}

      <Card title="Status" className="span-3 profile-status-card">
        <div className="quality-grid">
          <article>
            <strong>Speicher</strong>
            <span>{configured ? 'Onlinebetrieb mit Supabase.' : 'Demo-Vorschau ohne Supabase.'}</span>
            <Tag tone={configured ? 'good' : 'warn'}>{configured ? 'aktiv' : 'Demo'}</Tag>
          </article>
          <article>
            <strong>Veröffentlichung</strong>
            <code>{appConfig.basePath}</code>
            <Tag tone="info">GitHub Pages</Tag>
          </article>
        </div>
      </Card>

      {error && <p className="form-error span-3">{error}</p>}
      {message && <p className="form-success span-3">{message}</p>}
    </div>
  )
}
