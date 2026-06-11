import { describe, expect, it } from 'vitest'
import { navigationItems } from '../src/navigation'

describe('Navigation', () => {
  it('enthaelt die Hausbereiche Inventar und Ausgaben', () => {
    expect(navigationItems.map((item) => item.id)).toContain('inventar')
    expect(navigationItems.find((item) => item.id === 'versicherungen')).toMatchObject({
      label: 'Ausgaben',
      path: '/ausgaben',
    })
  })
})
