import { describe, expect, it } from 'vitest'
import { pwaUpdateEventName } from '../src/lib/pwaUpdate'

describe('PWA-Update-Hinweis', () => {
  it('nutzt einen stabilen Eventnamen fuer neue App-Versionen', () => {
    expect(pwaUpdateEventName).toBe('familien-dashboard-update-available')
  })
})
