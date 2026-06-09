import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { isNavItemVisible, navigationItems } from '../navigation'
import { useFamilyRoute } from '../routes/context'
import type { NavItemId } from '../types'

export const VisibleRoute = ({ navId, children }: { navId: NavItemId; children: ReactNode }) => {
  const { data } = useFamilyRoute()
  const { membership, user } = useAuth()
  const currentMembership =
    data.memberships.find((entry) => entry.user_id === user?.id) ?? membership ?? data.memberships[0] ?? null
  const item = navigationItems.find((entry) => entry.id === navId)

  if (item && !isNavItemVisible(currentMembership, item)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
