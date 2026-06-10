import { describe, expect, it } from 'vitest'
import { navigationItems } from '../src/navigation'

describe('Navigation', () => {
  it('enthaelt die neuen Hausbereiche Inventar und Versicherungen', () => {
    expect(navigationItems.map((item) => item.id)).toContain('inventar')
    expect(navigationItems.map((item) => item.id)).toContain('versicherungen')
  })
})
