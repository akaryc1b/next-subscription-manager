'use client'

import { Command } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { navItems } from '@/lib/nav-items'
import { cn } from '@/lib/utils'

interface MobileSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const pathname = usePathname()
  const workspaceItems = navItems.filter((item) => item.group === 'workspace')
  const systemItems = navItems.filter((item) => item.group === 'system')

  const renderItems = (items: typeof navItems) => items.map((item) => {
    const Icon = item.icon
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => onOpenChange(false)}
        className={cn(
          'relative flex min-h-12 items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium',
          isActive
            ? 'bg-accent-primary/10 text-foreground-primary'
            : 'text-foreground-muted hover:bg-background-hover hover:text-foreground-primary'
        )}
      >
        {isActive && <span className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-accent-primary" />}
        <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-accent-primary')} />
        <div className="min-w-0">
          <div>{item.label}</div>
          <div className="mt-0.5 truncate text-[10px] font-normal text-foreground-placeholder">{item.command}</div>
        </div>
      </Link>
    )
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex h-dvh w-[min(20rem,calc(100vw-1rem))] flex-col border-border bg-background-secondary p-0 pb-[env(safe-area-inset-bottom)]">
        <SheetTitle className="sr-only">Navigation menu</SheetTitle>
        <div className="flex h-[60px] items-center gap-3 border-b border-border-subtle px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary text-accent-foreground">
            <Command className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight">Subscription</div>
            <div className="truncate text-[10px] text-foreground-muted">Personal workspace</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="section-label mb-2 px-2">Workspace</div>
          <nav className="space-y-1">{renderItems(workspaceItems)}</nav>

          <div className="my-4 border-t border-border-subtle" />

          <div className="section-label mb-2 px-2">System</div>
          <nav className="space-y-1">{renderItems(systemItems)}</nav>
        </div>

        <div className="border-t border-border-subtle px-4 py-3 text-[10px] leading-4 text-foreground-muted">
          Subscription portfolio administration
        </div>
      </SheetContent>
    </Sheet>
  )
}
