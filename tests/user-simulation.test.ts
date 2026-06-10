import { describe, expect, it } from 'vitest'
import { resolveViewedMembership } from '../src/lib/userView'
import type { FamilyMembership } from '../src/types'

const members: FamilyMembership[] = [
  {
    id: 'member-admin',
    family_id: 'family-1',
    user_id: 'user-admin',
    role: 'admin',
    display_name: 'Robin',
    active: true,
    visible_nav_items: null,
  },
  {
    id: 'member-child',
    family_id: 'family-1',
    user_id: 'user-child',
    role: 'child',
    display_name: 'Melia',
    active: true,
    visible_nav_items: ['heute', 'aufgaben'],
  },
]

describe('User-Simulation', () => {
  it('laesst Admins eine andere aktive Membership ansehen', () => {
    expect(resolveViewedMembership(members[0], members, 'member-child')?.display_name).toBe('Melia')
  })

  it('ignoriert Simulation fuer Nicht-Admins', () => {
    expect(resolveViewedMembership(members[1], members, 'member-admin')?.display_name).toBe('Melia')
  })
})
