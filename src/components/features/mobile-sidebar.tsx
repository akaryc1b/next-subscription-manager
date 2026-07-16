'use client';

import { Layers3 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { navItems } from '@/lib/nav-items';

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex h-dvh w-[min(22rem,calc(100vw-1.5rem))] flex-col border-border bg-background-secondary/95 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-2xl sm:p-4">
        <SheetTitle className="sr-only">Navigation menu</SheetTitle>
        <div className="flex items-center gap-3 rounded-3xl border border-border bg-background-tertiary p-3 shadow-lg">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-primary text-accent-foreground shadow-lg">
            <Layers3 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">Subscription Manager</div>
            <div className="text-xs text-foreground-muted">macOS Admin Console</div>
          </div>
        </div>

        <nav className="mt-5 flex-1 space-y-1 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} onClick={() => onOpenChange(false)}>
                <div
                  className={cn(
                    'flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium',
                    isActive
                      ? 'bg-accent-primary text-accent-foreground shadow-lg'
                      : 'text-foreground-secondary hover:bg-background-hover hover:text-foreground-primary'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 rounded-3xl border border-border bg-background-tertiary p-3 text-xs text-foreground-muted">
          <div className="flex items-center gap-2 font-medium text-foreground-primary">
            <span className="h-2 w-2 rounded-full bg-accent-success shadow-[0_0_16px_var(--color-accent-success)]" />
            System online
          </div>
          <div className="mt-1">Optimized for one-handed mobile navigation</div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
