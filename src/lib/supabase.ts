import { createClient } from '@supabase/supabase-js'
import { appConfig, hasSupabaseConfig } from '../config'

export const supabase = hasSupabaseConfig
  ? createClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null

export const requireSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase ist nicht konfiguriert. VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY fehlen.')
  }

  return supabase
}
