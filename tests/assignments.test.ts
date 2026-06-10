import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  assignmentLabel,
  assignmentPayloadForEvent,
  assignmentPayloadForTask,
  findMembership,
  memberAvatarColor,
  memberAvatarSoftColor,
  memberInitials,
} from '../src/lib/assignments'
import type { FamilyMembership } from '../src/types'

const members: FamilyMembership[] = [
  {
    id: 'member-robin',
    family_id: 'family-1',
    user_id: 'user-robin',
    role: 'admin',
    display_name: 'Robin Klein',
    active: true,
    notification_preferences: { avatarColor: 'robin' },
    visible_nav_items: null,
  },
  {
    id: 'member-sabine',
    family_id: 'family-1',
    user_id: 'user-sabine',
    role: 'adult',
    display_name: 'Sabine',
    active: true,
    visible_nav_items: null,
  },
  {
    id: 'member-inactive',
    family_id: 'family-1',
    user_id: 'user-inactive',
    role: 'adult',
    display_name: 'Inaktiv',
    active: false,
    visible_nav_items: null,
  },
]

describe('Zuständigkeitsmodell', () => {
  it('erstellt Termin-Payload mit zuständig, bringt und holt', () => {
    expect(
      assignmentPayloadForEvent({
        assignee_membership_id: 'member-robin',
        bring_membership_id: 'member-sabine',
        pickup_membership_id: 'member-robin',
      }),
    ).toEqual({
      assignee_membership_id: 'member-robin',
      bring_membership_id: 'member-sabine',
      pickup_membership_id: 'member-robin',
    })
  })

  it('kann Termin-Zuweisungen explizit auf null setzen', () => {
    expect(
      assignmentPayloadForEvent({
        assignee_membership_id: '',
        bring_membership_id: null,
        pickup_membership_id: undefined,
      }),
    ).toEqual({
      assignee_membership_id: null,
      bring_membership_id: null,
      pickup_membership_id: null,
    })
  })

  it('erstellt Aufgaben-Payload mit zuständig und kann ihn entfernen', () => {
    expect(assignmentPayloadForTask({ assignee_membership_id: 'member-sabine' })).toEqual({
      assignee_membership_id: 'member-sabine',
    })
    expect(assignmentPayloadForTask({ assignee_membership_id: '' })).toEqual({
      assignee_membership_id: null,
    })
  })

  it('findet Mitglieder über die stabile Membership-ID und bildet Initialen', () => {
    const member = findMembership(members, 'member-robin')

    expect(member?.display_name).toBe('Robin Klein')
    expect(memberInitials(member)).toBe('RK')
    expect(assignmentLabel('Zuständig', member)).toBe('Zuständig: Robin Klein')
    expect(findMembership(members, null)).toBeNull()
  })

  it('liefert Personenfarben als CSS-Token statt als Hex-Wert', () => {
    expect(memberAvatarColor(members[0])).toBe('var(--robin)')
    expect(memberAvatarSoftColor(members[0])).toBe('var(--robin-soft)')
    expect(memberAvatarColor({ ...members[1], notification_preferences: { avatarColor: '#ffffff' } })).toMatch(/^var\(--/)
  })

  it('vergibt in einer Familie eindeutige Fallback-Farben, solange genug Tokens vorhanden sind', () => {
    const familyMembers: FamilyMembership[] = [
      { ...members[0], notification_preferences: { avatarColor: 'robin' } },
      { ...members[1], id: 'member-nadja', user_id: 'user-nadja', display_name: 'Nadja', notification_preferences: undefined },
      { ...members[1], id: 'member-melia', user_id: 'user-melia', display_name: 'Melia', notification_preferences: undefined },
      { ...members[1], id: 'member-leonas', user_id: 'user-leonas', display_name: 'Leonas', notification_preferences: undefined },
    ]

    expect(familyMembers.map((member) => memberAvatarColor(member, familyMembers))).toEqual([
      'var(--robin)',
      'var(--nadja)',
      'var(--melia)',
      'var(--leonas)',
    ])
  })
})

describe('Zuständigkeits-Migration', () => {
  it('legt Membership-ID, Assignment-Spalten und on delete set null Constraints an', () => {
    const sql = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260610093000_membership_id_and_assignment.sql'),
      'utf8',
    )

    expect(sql).toContain('add column if not exists id uuid not null default gen_random_uuid()')
    expect(sql).toContain('family_memberships_id_unique')
    expect(sql).toContain('events_assignee_membership_id_fkey')
    expect(sql).toContain('events_bring_membership_id_fkey')
    expect(sql).toContain('events_pickup_membership_id_fkey')
    expect(sql).toContain('tasks_assignee_membership_id_fkey')
    expect(sql.match(/on delete set null/g)?.length).toBe(4)
    expect(sql).toContain('primary key (family_id, user_id)')
  })
})
