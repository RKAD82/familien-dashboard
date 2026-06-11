import { describe, expect, it } from 'vitest'
import { appPath, clientUrlMatchesBasePath, normalizeBasePath } from '../src/lib/basePath'

describe('Base-Path', () => {
  it('normalisiert Root und Unterpfade fuer unterschiedliche Hosts', () => {
    expect(normalizeBasePath('/')).toBe('/')
    expect(normalizeBasePath('familien-dashboard')).toBe('/familien-dashboard/')
    expect(normalizeBasePath('/familien-dashboard')).toBe('/familien-dashboard/')
  })

  it('baut App-Pfade relativ zum konfigurierten Host', () => {
    expect(appPath('/', '#/notfall')).toBe('/#/notfall')
    expect(appPath('/familien-dashboard/', '#/notfall')).toBe('/familien-dashboard/#/notfall')
  })

  it('erkennt bestehende Clients anhand des Base-Path statt eines hartkodierten Repo-Namens', () => {
    expect(clientUrlMatchesBasePath('https://rkad82.github.io/familien-dashboard/#/', '/familien-dashboard/')).toBe(true)
    expect(clientUrlMatchesBasePath('https://dashboard.pages.dev/#/', '/')).toBe(true)
    expect(clientUrlMatchesBasePath('https://example.com/andere-app/#/', '/familien-dashboard/')).toBe(false)
  })
})
