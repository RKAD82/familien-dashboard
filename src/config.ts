const readEnv = (key: string) => import.meta.env[key] as string | undefined

const demoMode = readEnv('VITE_DEMO_MODE') === 'true'

export const appConfig = {
  supabaseUrl: readEnv('VITE_SUPABASE_URL') ?? '',
  supabaseAnonKey: readEnv('VITE_SUPABASE_ANON_KEY') ?? '',
  vapidPublicKey: readEnv('VITE_VAPID_PUBLIC_KEY') ?? '',
  basePath: readEnv('VITE_BASE_PATH') ?? '/familien-dashboard/',
  timezone: 'Europe/Berlin',
}

export const hasSupabaseConfig = !demoMode && Boolean(appConfig.supabaseUrl && appConfig.supabaseAnonKey)

export const publicBasePath = appConfig.basePath.endsWith('/') ? appConfig.basePath : `${appConfig.basePath}/`
