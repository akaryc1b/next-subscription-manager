import { Home, Users, Settings, BarChart3, UserCog, LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  command: string  // Terminal 风格命令提示
}

/**
 * 导航项配置
 * 在 Sidebar 和 MobileSidebar 之间共享
 * 保持 Terminal CLI 风格
 */
export const navItems: NavItem[] = [
  { href: '/dashboard', label: 'DASHBOARD', icon: Home, command: 'cd /dash' },
  { href: '/users', label: 'USERS', icon: Users, command: 'ls users/' },
  { href: '/configs', label: 'CONFIGS', icon: Settings, command: 'cat config' },
  { href: '/monitor', label: 'MONITOR', icon: BarChart3, command: 'top -d 1' },
  { href: '/settings', label: 'SETTINGS', icon: UserCog, command: 'vi ~/.rc' },
]
