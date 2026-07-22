'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { navItems } from '@/lib/nav-items'
import { cn } from '@/lib/utils'

const mobileLabels: Record<string, string> = {
  '/dashboard': 'Overview',
  '/users': 'Subs',
  '/calendar': 'Renewals',
  '/monitor': 'Activity',
  '/settings': 'Settings',
}

export function MobileBottomNav() {
  const pathname = usePathname()
  const mobileItems = navItems.filter((item) => item.href !== '/configs')

  return (
    <nav
      aria-label="Primary navigation"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background-secondary/98 px-1.5 pt-1.5 pb-[calc(env(safe-area-inset-bottom)+0.375rem)] lg:hidden"
    >
      {mobileItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'relative flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-medium leading-none',
              isActive
                ? 'bg-accent-primary/10 text-accent-primary'
                : 'text-foreground-muted hover:bg-background-hover hover:text-foreground-primary'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="max-w-full truncate">{mobileLabels[item.href] || item.label}</span>
            {isActive && <span className="absolute top-0 h-0.5 w-5 rounded-full bg-accent-primary" />}
          </Link>
        )
      })}
    </nav>
  )
}
