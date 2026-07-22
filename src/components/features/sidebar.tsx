'use client'

import { Command, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { navItems } from '@/lib/nav-items'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const workspaceItems = navItems.filter((item) => item.group === 'workspace')
  const systemItems = navItems.filter((item) => item.group === 'system')

  const renderItem = (item: (typeof navItems)[number]) => {
    const Icon = item.icon
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

    return (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? item.label : undefined}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'group relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium',
          isActive
            ? 'bg-accent-primary/10 text-foreground-primary'
            : 'text-foreground-muted hover:bg-background-hover hover:text-foreground-primary',
          collapsed && 'justify-center px-0'
        )}
      >
        {isActive && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent-primary" />}
        <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-accent-primary' : 'text-foreground-muted group-hover:text-foreground-secondary')} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    )
  }

  return (
    <aside
      className={cn(
        'flex h-[100dvh] flex-col border-r border-border bg-background-secondary transition-[width] duration-200',
        collapsed ? 'w-[72px]' : 'w-60'
      )}
    >
      <div className={cn('flex h-[60px] items-center gap-3 border-b border-border-subtle px-4', collapsed && 'justify-center px-2')}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-primary text-accent-foreground">
          <Command className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-[-0.02em]">Subscription</div>
            <div className="truncate text-[10px] text-foreground-muted">Personal workspace</div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-4">
        {!collapsed && <div className="section-label mb-2 px-2">Workspace</div>}
        <nav className="space-y-1" aria-label="Workspace navigation">
          {workspaceItems.map(renderItem)}
        </nav>

        <div className="my-4 border-t border-border-subtle" />

        {!collapsed && <div className="section-label mb-2 px-2">System</div>}
        <nav className="space-y-1" aria-label="System navigation">
          {systemItems.map(renderItem)}
        </nav>
      </div>

      <div className="border-t border-border-subtle p-2">
        {!collapsed && (
          <div className="mb-2 px-2 py-1.5 text-[10px] leading-4 text-foreground-muted">
            Manage subscriptions, delivery configs, renewals, and access activity.
          </div>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCollapsed((value) => !value)}
          className={cn('w-full', !collapsed && 'justify-start px-3')}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {!collapsed && <span>Collapse sidebar</span>}
        </Button>
      </div>
    </aside>
  )
}
