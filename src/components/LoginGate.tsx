import { useState, type FormEvent, type ReactNode } from 'react'
import { KeyRound } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Button, Card, Field, TextInput } from './ui'

export const LoginGate = ({ children }: { children: ReactNode }) => {
  const { configured, session, signIn, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

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

  if (session) {
    return <>{children}</>
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    try {
      await signIn(email, password)
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login fehlgeschlagen.')
    }
  }

  return (
    <main className="login-screen">
      <form className="login-panel" onSubmit={onSubmit}>
        <div className="login-mark">
          <KeyRound size={24} />
        </div>
        <h1>Familien-Dashboard</h1>
        <p>Privater Zugang für Kalender, Aufgaben, Einkauf und Familienmeldungen.</p>
        <Field label="E-Mail">
          <TextInput autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
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
        <Button type="submit">Einloggen</Button>
        <small>Seed-Zugangsdaten stehen in `.env.example`, landen aber nicht im Client-Bundle.</small>
      </form>
    </main>
  )
}
