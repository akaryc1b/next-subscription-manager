import { Activity, CalendarDays, FileSliders, LayoutDashboard, Settings2, Users } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { hasUnsavedEditor } from '@/lib/navigation-guard'

export const navigation = [
  { href: '/dashboard', label: '工作台', icon: LayoutDashboard },
  { href: '/users', label: '订阅账户', icon: Users },
  { href: '/configs', label: '配置库', icon: FileSliders },
  { href: '/calendar', label: '到期日程', icon: CalendarDays },
  { href: '/monitor', label: '访问动态', icon: Activity },
  { href: '/settings', label: '账户设置', icon: Settings2 },
]

export function canLeaveEditor() {
  if (!hasUnsavedEditor()) return true
  toast.error('还有未保存的修改。请先保存，或撤销修改后再离开。', { id: 'unsaved-editor' })
  return false
}
