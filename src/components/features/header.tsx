'use client'

import { ChevronRight, LogOut, Menu, Moon, Settings, Sun, User } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { MobileSidebar } from '@/components/features/mobile-sidebar'
import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { authClient } from '@/lib/auth-client'
import { navItems } from '@/lib/nav-items'

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = authClient.useSession()
  const { theme, toggleTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const current = navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))

  const handleLogout = async () => {
    await authClient.signOut()
    router.push('/login')
  }

  return (
    <>
      <MobileSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      <header className="relative z-30 flex h-[60px] shrink-0 items-center justify-between gap-3 border-b border-border bg-background-secondary px-3 sm:px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-9 w-9 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="h-4 w-4" />
          </Button>

          <div className="hidden items-center gap-2 text-xs text-foreground-muted sm:flex">
            <span>Workspace</span>
            <ChevronRight className="h-3 w-3 text-foreground-placeholder" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-foreground-primary sm:text-sm">
              {current?.label || 'Overview'}
            </div>
            <div className="hidden truncate text-[10px] text-foreground-muted md:block">
              {current?.command || 'Subscription workspace'}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-9 w-9"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon-sm" className="h-9 w-9">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-xl border-border bg-background-tertiary p-1.5 shadow-2xl">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1 px-1 py-1.5">
                  <span className="font-medium text-foreground-primary">{session?.user?.name || 'Workspace owner'}</span>
                  <span className="truncate text-xs font-normal text-foreground-muted">{session?.user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-accent-error focus:text-accent-error">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  )
}
