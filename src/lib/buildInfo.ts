export const appBuildInfo = {
  commit: __APP_COMMIT__ || 'dev',
  buildDate: __APP_BUILD_DATE__ || new Date().toISOString(),
}

export const formatBuildDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'unbekannt'

  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Berlin',
  }).format(date)
}
