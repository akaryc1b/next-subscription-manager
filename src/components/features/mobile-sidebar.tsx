'use client'

import { Gem, Radio } from 'lucide-react'
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex h-dvh w-[min(22rem,calc(100vw-1.5rem))] flex-col border-border bg-background-secondary p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-2xl sm:p-4">
        <SheetTitle className="sr-only">Navigation menu</SheetTitle>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-background-tertiary/80 p-3 shadow-lg">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary text-accent-foreground shadow-[0_8px_22px_rgba(139,92,246,0.25)]">
            <Gem className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight">Subscription</div>
            <div className="truncate text-xs text-foreground-muted">Personal SaaS workspace</div>
          </div>
        </div>

        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onOpenChange(false)}
                className={cn(
                  'relative flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium',
                  isActive
                    ? 'bg-accent-primary/10 text-foreground-primary ring-1 ring-inset ring-accent-primary/20'
                    : 'text-foreground-muted hover:bg-background-hover hover:text-foreground-primary'
                )}
              >
                {isActive && <span className="absolute left-0 h-4 w-0.5 rounded-full bg-accent-primary" />}
                <Icon className={cn('h-4 w-4', isActive && 'text-accent-primary')} />
                <div className="min-w-0">
                  <div>{item.label}</div>
                  <div className="mt-0.5 truncate text-[10px] font-normal text-foreground-placeholder">{item.command}</div>
                </div>
              </Link>
            )
          })}
        </nav>

        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-background-tertiary/70 p-3 text-xs text-foreground-muted">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent-success/10 text-accent-success">
            <Radio className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="font-medium text-foreground-primary">Workspace online</div>
            <div className="mt-1">Optimized for mobile touch and safe-area spacing</div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
