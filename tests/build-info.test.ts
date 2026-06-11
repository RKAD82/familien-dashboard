import { describe, expect, it } from 'vitest'
import { appBuildInfo, formatBuildDate } from '../src/lib/buildInfo'

describe('Build-Information', () => {
  it('stellt Commit und Buildzeit fuer die UI bereit', () => {
    expect(appBuildInfo.commit.length).toBeGreaterThan(0)
    expect(appBuildInfo.buildDate.length).toBeGreaterThan(0)
  })

  it('formatiert gueltige Buildzeiten und markiert ungueltige Werte', () => {
    expect(formatBuildDate('2026-06-11T10:00:00.000Z')).toContain('2026')
    expect(formatBuildDate('kein-datum')).toBe('unbekannt')
  })
})
