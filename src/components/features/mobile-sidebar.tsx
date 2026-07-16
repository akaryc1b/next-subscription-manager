'use client';

import { Layers3 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sheet, SheetContent } from '@/components/ui/sheet';
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
      <SheetContent side="left" className="w-80 border-border bg-background-secondary p-4 backdrop-blur-2xl">
        <div className="flex items-center gap-3 rounded-3xl border border-border bg-background-tertiary p-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-primary text-white shadow-lg shadow-lg">
            <Layers3 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">Subscription Manager</div>
            <div className="text-xs text-foreground-muted">macOS Admin Console</div>
          </div>
        </div>

        <nav className="mt-5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} onClick={() => onOpenChange(false)}>
                <div
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium',
                    isActive
                      ? 'bg-accent-primary text-white shadow-lg shadow-lg'
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
      </SheetContent>
    </Sheet>
  );
}
