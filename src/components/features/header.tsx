'use client'

import { LogOut, Menu, Moon, Settings, Sparkles, Sun, User } from 'lucide-react'
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
  const CurrentIcon = current?.icon || Sparkles

  const handleLogout = async () => {
    await authClient.signOut()
    router.push('/login')
  }

  return (
    <>
      <MobileSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      <header className="glass-panel sticky top-2 z-30 h-14 rounded-2xl px-2.5 sm:h-16 sm:px-3 lg:static">
        <div className="flex h-full items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-10 w-10 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary sm:flex">
              <CurrentIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-tight sm:text-base">
                {current?.label || 'Overview'}
              </div>
              <div className="truncate text-[11px] text-foreground-muted sm:text-xs">
                {current?.command || 'Subscription workspace'}
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-xl border border-border/80 bg-background-tertiary/60 px-3 py-2 text-xs text-foreground-muted md:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-success shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
            Private workspace
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-10 w-10"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon-sm" className="h-10 w-10 rounded-xl">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-2xl border-border bg-background-tertiary p-2 shadow-2xl backdrop-blur-2xl">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-1 p-1">
                    <span className="font-semibold text-foreground-primary">{session?.user?.name || 'Workspace owner'}</span>
                    <span className="truncate text-xs text-foreground-muted">{session?.user?.email}</span>
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
        </div>
      </header>
    </>
  )
}
