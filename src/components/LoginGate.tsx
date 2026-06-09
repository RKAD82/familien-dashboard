import { ArrowLeft, KeyRound, Mail, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Button, Card, Field, TextInput } from './ui'

export const LoginGate = ({ children }: { children: ReactNode }) => {
  const { configured, session, signIn, loading, passwordRecovery, resetPasswordForEmail, updatePassword } = useAuth()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordRepeat, setNewPasswordRepeat] = useState('')
  const [mode, setMode] = useState<'login' | 'reset'>('login')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  if (!configured) {
    return (
      <main className="setup-screen">
        <Card title="Supabase-Schlüssel fehlen">
          <p>
            Das Projekt ist gebaut, aber noch nicht mit einem gehosteten Supabase-Projekt verbunden. Trage die Werte aus
            `.env.example` in eine lokale `.env` ein und führe danach die Migrationen und das Admin-Seed-Skript aus.
          </p>
          <div className="setup-list">
            <code>VITE_SUPABASE_URL</code>
            <code>VITE_SUPABASE_ANON_KEY</code>
            <code>VITE_VAPID_PUBLIC_KEY</code>
          </div>
        </Card>
      </main>
    )
  }

  if (loading) {
    return <main className="loading-screen">Familien-Dashboard wird geladen...</main>
  }

  const onPasswordRecoverySubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (newPassword.length < 8) {
      setError('Das neue Passwort muss mindestens 8 Zeichen haben.')
      return
    }
    if (newPassword !== newPasswordRepeat) {
      setError('Die Passwörter stimmen nicht überein.')
      return
    }
    try {
      await updatePassword(newPassword)
      setNewPassword('')
      setNewPasswordRepeat('')
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : 'Passwort konnte nicht geändert werden.')
    }
  }

  if (session && passwordRecovery) {
    return (
      <main className="login-screen">
        <form className="login-panel" onSubmit={onPasswordRecoverySubmit}>
          <div className="login-mark">
            <ShieldCheck size={24} />
          </div>
          <h1>Neues Passwort</h1>
          <p>Lege ein neues Passwort für deinen Familien-Dashboard-Zugang fest.</p>
          <Field label="Neues Passwort">
            <TextInput
              autoComplete="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </Field>
          <Field label="Neues Passwort wiederholen">
            <TextInput
              autoComplete="new-password"
              type="password"
              value={newPasswordRepeat}
              onChange={(event) => setNewPasswordRepeat(event.target.value)}
            />
          </Field>
          {error && <p className="form-error">{error}</p>}
          <Button type="submit">Passwort speichern</Button>
        </form>
      </main>
    )
  }

  if (session) {
    return <>{children}</>
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    try {
      await signIn(login, password)
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login fehlgeschlagen.')
    }
  }

  const onResetSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)
    try {
      await resetPasswordForEmail(resetEmail)
      setMessage('Wenn die Adresse registriert ist, wurde eine E-Mail zum Zurücksetzen verschickt.')
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'E-Mail konnte nicht verschickt werden.')
    }
  }

  if (mode === 'reset') {
    return (
      <main className="login-screen">
        <form className="login-panel" onSubmit={onResetSubmit}>
          <button className="text-button login-back" type="button" onClick={() => setMode('login')}>
            <ArrowLeft size={18} />
            Zurück zum Login
          </button>
          <div className="login-mark">
            <Mail size={24} />
          </div>
          <h1>Passwort vergessen</h1>
          <p>Du erhältst einen Link, mit dem du im Browser ein neues Passwort setzen kannst.</p>
          <Field label="E-Mail">
            <TextInput
              autoComplete="email"
              type="email"
              value={resetEmail}
              onChange={(event) => setResetEmail(event.target.value)}
            />
          </Field>
          {error && <p className="form-error">{error}</p>}
          {message && <p className="form-success">{message}</p>}
          <Button type="submit">Reset-Link senden</Button>
        </form>
      </main>
    )
  }

  return (
    <main className="login-screen">
      <form className="login-panel" onSubmit={onSubmit}>
        <div className="login-mark">
          <KeyRound size={24} />
        </div>
        <h1>Familien-Dashboard</h1>
        <p>Privater Zugang für Kalender, Aufgaben, Einkauf und Familienmeldungen.</p>
        <Field label="Loginname oder E-Mail">
          <TextInput autoComplete="username" value={login} onChange={(event) => setLogin(event.target.value)} />
        </Field>
        <Field label="Passwort">
          <TextInput
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        {error && <p className="form-error">{error}</p>}
        {message && <p className="form-success">{message}</p>}
        <Button type="submit">Einloggen</Button>
        <button className="text-button login-reset-link" type="button" onClick={() => setMode('reset')}>
          Passwort vergessen?
        </button>
        <small>Zugangsdaten stehen lokal in `.env`, landen aber nicht im Client-Bundle.</small>
      </form>
    </main>
  )
}
