import type { Session, User } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { hasSupabaseConfig, publicBasePath } from '../config'
import { supabase } from '../lib/supabase'
import type { FamilyMembership, Profile } from '../types'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  membership: FamilyMembership | null
  memberships: FamilyMembership[]
  loading: boolean
  configured: boolean
  passwordRecovery: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPasswordForEmail: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [memberships, setMemberships] = useState<FamilyMembership[]>([])
  const [loading, setLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    const client = supabase
    let active = true

    const loadInitialSession = async () => {
      const { data, error } = await client.auth.getSession()
      if (error) {
        console.warn(error.message)
      }
      if (active) {
        setSession(data.session)
      }
    }

    const { data: authListener } = client.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true)
      }
      if (event === 'SIGNED_OUT') {
        setPasswordRecovery(false)
      }
      setSession(nextSession)
    })

    void loadInitialSession()

    return () => {
      active = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabase || !session?.user) {
      setProfile(null)
      setMemberships([])
      setLoading(false)
      return
    }

    const client = supabase
    let active = true

    const loadProfile = async () => {
      setLoading(true)
      const [{ data: profileData, error: profileError }, { data: membershipData, error: membershipError }] =
        await Promise.all([
          client.from('profiles').select('*').eq('id', session.user.id).maybeSingle(),
          client.from('family_memberships').select('*, family:families(*)').eq('user_id', session.user.id).eq('active', true),
        ])

      if (profileError) {
        console.warn(profileError.message)
      }
      if (membershipError) {
        console.warn(membershipError.message)
      }

      if (active) {
        setProfile((profileData as Profile | null) ?? null)
        setMemberships((membershipData as FamilyMembership[] | null) ?? [])
        setLoading(false)
      }
    }

    void loadProfile()

    return () => {
      active = false
    }
  }, [session])

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      membership: memberships[0] ?? null,
      memberships,
      loading,
      configured: hasSupabaseConfig,
      passwordRecovery,
      signIn: async (email: string, password: string) => {
        if (!supabase) {
          throw new Error('Supabase ist nicht konfiguriert.')
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          throw error
        }
      },
      signOut: async () => {
        if (!supabase) {
          return
        }
        await supabase.auth.signOut()
      },
      resetPasswordForEmail: async (email: string) => {
        if (!supabase) {
          throw new Error('Supabase ist nicht konfiguriert.')
        }

        const redirectTo =
          typeof window !== 'undefined' ? new URL(publicBasePath, window.location.origin).toString() : undefined
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
        if (error) {
          throw error
        }
      },
      updatePassword: async (password: string) => {
        if (!supabase) {
          throw new Error('Supabase ist nicht konfiguriert.')
        }

        const { error } = await supabase.auth.updateUser({ password })
        if (error) {
          throw error
        }
        setPasswordRecovery(false)
      },
    }),
    [loading, memberships, passwordRecovery, profile, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden.')
  }

  return context
}
