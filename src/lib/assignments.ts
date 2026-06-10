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
type PersonColorToken = (typeof personColorTokens)[number]

const isPersonColorToken = (value: unknown): value is PersonColorToken =>
  typeof value === 'string' && personColorTokens.includes(value as PersonColorToken)

const configuredPersonColorToken = (member: FamilyMembership | null | undefined) => {
  const configured = member?.notification_preferences?.avatarColor
  if (isPersonColorToken(configured)) {
    return configured
  }
  return null
}

const fallbackPersonColorToken = (member: FamilyMembership | null | undefined) => {
  const seed = member?.display_name ?? member?.user_id ?? 'Familie'
  const index = [...seed].reduce((total, char) => total + char.charCodeAt(0), 0) % personColorTokens.length
  return personColorTokens[index]
}

export const memberColorTokenMap = (memberships: FamilyMembership[]) => {
  const used = new Set<PersonColorToken>()
  const entries = memberships.map((member, index) => {
    const configured = configuredPersonColorToken(member)
    let token = configured && !used.has(configured) ? configured : personColorTokens.find((candidate) => !used.has(candidate))

    if (!token) {
      token = personColorTokens[index % personColorTokens.length]
    }
    used.add(token)
    return [member.id, token] as const
  })

  return new Map(entries)
}

const personColorToken = (member: FamilyMembership | null | undefined, memberships?: FamilyMembership[]) => {
  if (!member) return fallbackPersonColorToken(member)
  if (memberships?.length) {
    return memberColorTokenMap(memberships).get(member.id) ?? configuredPersonColorToken(member) ?? fallbackPersonColorToken(member)
  }
  return configuredPersonColorToken(member) ?? fallbackPersonColorToken(member)
}

export const memberAvatarColor = (member: FamilyMembership | null | undefined, memberships?: FamilyMembership[]) => {
  const token = personColorToken(member, memberships)
  return `var(--${token})`
}

export const memberAvatarSoftColor = (member: FamilyMembership | null | undefined, memberships?: FamilyMembership[]) => {
  const token = personColorToken(member, memberships)
  return `var(--${token}-soft)`
}
