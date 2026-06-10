import type { FamilyMembership } from '../types'

export type EventAssignmentInput = {
  assignee_membership_id?: string | null
  bring_membership_id?: string | null
  pickup_membership_id?: string | null
}

export type TaskAssignmentInput = {
  assignee_membership_id?: string | null
}

const nullableId = (value: string | null | undefined) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export const assignmentPayloadForEvent = (input: EventAssignmentInput) => ({
  assignee_membership_id: nullableId(input.assignee_membership_id),
  bring_membership_id: nullableId(input.bring_membership_id),
  pickup_membership_id: nullableId(input.pickup_membership_id),
})

export const assignmentPayloadForTask = (input: TaskAssignmentInput) => ({
  assignee_membership_id: nullableId(input.assignee_membership_id),
})

export const activeMemberships = (memberships: FamilyMembership[]) => memberships.filter((member) => member.active)

export const findMembership = (memberships: FamilyMembership[], membershipId: string | null | undefined) =>
  membershipId ? memberships.find((member) => member.id === membershipId) ?? null : null

export const memberInitials = (member: Pick<FamilyMembership, 'display_name'> | null | undefined) =>
  member?.display_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || ''

export const assignmentLabel = (label: string, member: Pick<FamilyMembership, 'display_name'> | null | undefined) =>
  member ? `${label}: ${member.display_name}` : null

const personColorTokens = ['robin', 'nadja', 'melia', 'leonas'] as const

const personColorToken = (member: FamilyMembership | null | undefined) => {
  const configured = member?.notification_preferences?.avatarColor
  if (typeof configured === 'string' && personColorTokens.includes(configured as (typeof personColorTokens)[number])) {
    return configured
  }

  const seed = member?.display_name ?? member?.user_id ?? 'Familie'
  const index = [...seed].reduce((total, char) => total + char.charCodeAt(0), 0) % personColorTokens.length
  return personColorTokens[index]
}

export const memberAvatarColor = (member: FamilyMembership | null | undefined) => {
  const token = personColorToken(member)
  return `var(--${token})`
}

export const memberAvatarSoftColor = (member: FamilyMembership | null | undefined) => {
  const token = personColorToken(member)
  return `var(--${token}-soft)`
}
