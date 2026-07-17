'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { navItems } from '@/lib/nav-items'

const mobileLabels: Record<string, string> = {
  '/dashboard': '概览',
  '/users': '用户',
  '/configs': '配置',
  '/monitor': '监控',
  '/settings': '设置',
}

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="主要导航"
      className="fixed inset-x-2 bottom-2 z-40 grid grid-cols-5 rounded-[1.5rem] border border-border bg-background-secondary/95 p-1.5 pb-[calc(env(safe-area-inset-bottom)+0.375rem)] shadow-2xl backdrop-blur-2xl lg:hidden"
    >
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-medium leading-none text-foreground-muted',
              isActive
                ? 'bg-accent-primary text-accent-foreground shadow-lg'
                : 'hover:bg-background-hover hover:text-foreground-primary'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="max-w-full truncate">{mobileLabels[item.href] || item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
