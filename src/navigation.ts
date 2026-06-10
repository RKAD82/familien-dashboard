import {
  Bell,
  CalendarDays,
  CheckSquare,
  ChefHat,
  ContactRound,
  Home,
  Link as LinkIcon,
  ListChecks,
  Map,
  Package,
  Recycle,
  Settings,
  ShieldCheck,
  ShieldAlert,
  StickyNote,
  type LucideIcon,
} from 'lucide-react'
import type { FamilyMembership, NavItemId } from './types'

export interface NavigationItem {
  id: NavItemId
  path: string
  label: string
  icon: LucideIcon
  defaultVisible: boolean
}

export const navigationItems: NavigationItem[] = [
  { id: 'heute', path: '/', label: 'Heute', icon: Home, defaultVisible: true },
  { id: 'woche', path: '/woche', label: 'Woche', icon: CalendarDays, defaultVisible: true },
  { id: 'kalender', path: '/kalender', label: 'Kalender', icon: CalendarDays, defaultVisible: true },
  { id: 'aufgaben', path: '/aufgaben', label: 'Aufgaben', icon: CheckSquare, defaultVisible: true },
  { id: 'einkauf', path: '/einkauf', label: 'Einkauf', icon: ListChecks, defaultVisible: true },
  { id: 'links', path: '/links', label: 'Links', icon: LinkIcon, defaultVisible: true },
  { id: 'notizen', path: '/notizen', label: 'Notizen', icon: StickyNote, defaultVisible: false },
  { id: 'abfall', path: '/abfall', label: 'Abfall', icon: Recycle, defaultVisible: true },
  { id: 'rezepte', path: '/rezepte', label: 'Rezepte', icon: ChefHat, defaultVisible: true },
  { id: 'inventar', path: '/inventar', label: 'Inventar', icon: Package, defaultVisible: true },
  { id: 'versicherungen', path: '/versicherungen', label: 'Versicherungen', icon: ShieldCheck, defaultVisible: true },
  { id: 'aktivitaeten', path: '/aktivitaeten', label: 'Aktivitäten', icon: Map, defaultVisible: true },
  { id: 'meldungen', path: '/meldungen', label: 'Meldungen', icon: Bell, defaultVisible: true },
  { id: 'kontakte', path: '/kontakte', label: 'Kontakte', icon: ContactRound, defaultVisible: true },
  { id: 'notfall', path: '/notfall', label: 'Notfall', icon: ShieldAlert, defaultVisible: true },
  { id: 'system', path: '/einstellungen', label: 'System', icon: Settings, defaultVisible: true },
]

export const defaultVisibleNavItemIds = navigationItems
  .filter((item) => item.defaultVisible)
  .map((item) => item.id)

export const mobileNavItemIds: NavItemId[] = ['heute', 'woche', 'aufgaben', 'einkauf']

export const visibleNavIdsForMembership = (membership: FamilyMembership | null | undefined) =>
  membership?.visible_nav_items?.length ? membership.visible_nav_items : defaultVisibleNavItemIds

export const isNavItemVisible = (membership: FamilyMembership | null | undefined, item: NavigationItem) =>
  visibleNavIdsForMembership(membership).includes(item.id)
