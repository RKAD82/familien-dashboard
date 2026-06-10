import { describe, expect, it } from 'vitest'
import { themePreferences } from '../src/lib/theme'

describe('Darstellungsauswahl', () => {
  it('nennt die automatische Systemeinstellung kurz Auto', () => {
    expect(themePreferences.map((entry) => entry.label)).toEqual(['Hell', 'Dunkel', 'Auto'])
  })
})
