import type { CSSProperties } from 'react'
import { assignmentLabel, findMembership, memberAvatarColor, memberInitials } from '../lib/assignments'
import type { FamilyMembership } from '../types'

export const AssignmentBadge = ({
  compact = false,
  label,
  membershipId,
  memberships,
}: {
  compact?: boolean
  label: string
  membershipId: string | null | undefined
  memberships: FamilyMembership[]
}) => {
  const member = findMembership(memberships, membershipId)
  if (!member) {
    return null
  }

  return (
    <span
      className={`assignment-badge ${compact ? 'assignment-badge-compact' : ''}`}
      style={{ '--member-color': memberAvatarColor(member) } as CSSProperties}
      title={assignmentLabel(label, member) ?? undefined}
    >
      <span className="assignment-initials">{memberInitials(member)}</span>
      {!compact && (
        <span>
          {label}: {member.display_name}
        </span>
      )}
    </span>
  )
}
