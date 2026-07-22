'use client'

import { ChevronLeft, ChevronRight, Gem, Radio } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { navItems } from '@/lib/nav-items'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'glass-panel flex h-[calc(100dvh-2rem)] flex-col rounded-2xl p-2.5',
        collapsed ? 'w-[4.75rem]' : 'w-64'
      )}
    >
      <div className={cn('flex items-center gap-3 px-2 py-2.5', collapsed && 'justify-center px-0')}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-primary text-accent-foreground shadow-[0_8px_22px_rgba(139,92,246,0.25)]">
          <Gem className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold tracking-[-0.02em]">Subscription</div>
            <div className="truncate text-[11px] text-foreground-muted">Personal SaaS workspace</div>
          </div>
        )}
      </div>

      <div className="mx-2 my-2 h-px bg-border/80" />

      <nav className="flex-1 space-y-1 overflow-y-auto py-2" aria-label="Primary navigation">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'group relative flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium',
                isActive
                  ? 'bg-accent-primary/10 text-foreground-primary ring-1 ring-inset ring-accent-primary/20'
                  : 'text-foreground-muted hover:bg-background-hover hover:text-foreground-primary',
                collapsed && 'justify-center px-0'
              )}
            >
              {isActive && <span className="absolute left-0 h-4 w-0.5 rounded-full bg-accent-primary" />}
              <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-accent-primary')} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className={cn('rounded-xl bg-background-tertiary/70 p-3 ring-1 ring-inset ring-border/80', collapsed && 'p-2')}>
        {collapsed ? (
          <div className="flex justify-center" title="All systems operational">
            <span className="h-2 w-2 rounded-full bg-accent-success shadow-[0_0_12px_rgba(34,197,94,0.55)]" />
          </div>
        ) : (
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-success/10 text-accent-success">
              <Radio className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-foreground-primary">Workspace online</div>
              <div className="mt-0.5 text-[11px] text-foreground-muted">Services are operational</div>
            </div>
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setCollapsed((value) => !value)}
        className="mt-2 w-full"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>
    </aside>
  )
}
