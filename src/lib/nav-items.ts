import {
  Activity,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Layers3,
  Settings2,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  command: string
  group: 'workspace' | 'system'
}

export const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, command: 'Portfolio overview', group: 'workspace' },
  { href: '/users', label: 'Subscriptions', icon: CreditCard, command: 'Accounts and access', group: 'workspace' },
  { href: '/calendar', label: 'Renewals', icon: CalendarDays, command: 'Expiration schedule', group: 'workspace' },
  { href: '/configs', label: 'Configurations', icon: Layers3, command: 'Delivery configurations', group: 'workspace' },
  { href: '/monitor', label: 'Activity', icon: Activity, command: 'Usage and security', group: 'workspace' },
  { href: '/settings', label: 'Settings', icon: Settings2, command: 'Workspace preferences', group: 'system' },
]
