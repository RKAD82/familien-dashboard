import type { FamilyMembership } from '../types'

export const resolveViewedMembership = (
  actualMembership: FamilyMembership | null | undefined,
  memberships: FamilyMembership[],
  simulatedMembershipId: string | null | undefined,
) => {
  if (!actualMembership) return null
  if (actualMembership.role !== 'admin' || !simulatedMembershipId) return actualMembership

  return memberships.find((member) => member.active && member.id === simulatedMembershipId) ?? actualMembership
}
