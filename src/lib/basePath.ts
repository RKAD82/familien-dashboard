export const normalizeBasePath = (value: string | undefined) => {
  const raw = value?.trim() || '/'
  if (raw === '/') return '/'
  return `/${raw.replace(/^\/+|\/+$/g, '')}/`
}

export const appPath = (basePath: string | undefined, path: string) => {
  const base = normalizeBasePath(basePath)
  const cleanPath = path.replace(/^\/+/, '')
  return base === '/' ? `/${cleanPath}` : `${base}${cleanPath}`
}

export const clientUrlMatchesBasePath = (url: string, basePath: string | undefined) => {
  try {
    const parsed = new URL(url)
    const base = normalizeBasePath(basePath)
    if (base === '/') return true
    return parsed.pathname.startsWith(base)
  } catch {
    return false
  }
}
