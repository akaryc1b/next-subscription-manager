import {
  CalendarDays,
  ChartNoAxesCombined,
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
}

export const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, command: 'Subscription overview' },
  { href: '/users', label: 'Subscriptions', icon: CreditCard, command: 'Subscription accounts' },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays, command: 'Renewal schedule' },
  { href: '/configs', label: 'Configurations', icon: Layers3, command: 'Configuration library' },
  { href: '/monitor', label: 'Analytics', icon: ChartNoAxesCombined, command: 'Traffic and security analytics' },
  { href: '/settings', label: 'Settings', icon: Settings2, command: 'Workspace settings' },
]
