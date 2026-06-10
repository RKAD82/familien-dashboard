import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { isNavItemVisible, navigationItems } from '../navigation'
import { useFamilyRoute } from '../routes/context'
import type { NavItemId } from '../types'

export const VisibleRoute = ({ navId, children }: { navId: NavItemId; children: ReactNode }) => {
  const { currentMembership } = useFamilyRoute()
  const item = navigationItems.find((entry) => entry.id === navId)

  if (item && !isNavItemVisible(currentMembership, item)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
