const readEnv = (key: string) => import.meta.env[key] as string | undefined

export const appConfig = {
  supabaseUrl: readEnv('VITE_SUPABASE_URL') ?? '',
  supabaseAnonKey: readEnv('VITE_SUPABASE_ANON_KEY') ?? '',
  vapidPublicKey: readEnv('VITE_VAPID_PUBLIC_KEY') ?? '',
  basePath: readEnv('VITE_BASE_PATH') ?? '/familien-dashboard/',
  timezone: 'Europe/Berlin',
}

export const hasSupabaseConfig = Boolean(appConfig.supabaseUrl && appConfig.supabaseAnonKey)

export const publicBasePath = appConfig.basePath.endsWith('/') ? appConfig.basePath : `${appConfig.basePath}/`
