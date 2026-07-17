'use client';

import { ChevronLeft, ChevronRight, Layers3 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { navItems } from '@/lib/nav-items';

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'glass-panel flex h-[calc(100dvh-2rem)] flex-col rounded-[2rem] p-3',
        collapsed ? 'w-[5.25rem]' : 'w-72'
      )}
    >
      <div className="flex items-center gap-3 px-2 py-2">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-primary text-accent-foreground shadow-lg">
          <Layers3 className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold tracking-tight">Subscription Manager</div>
            <div className="text-xs text-foreground-muted">Admin Console</div>
          </div>
        )}
        <Button variant="ghost" size="icon-sm" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="mt-5 flex-1 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  'group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium',
                  isActive
                    ? 'bg-accent-primary text-accent-foreground shadow-lg'
                    : 'text-foreground-secondary hover:bg-background-hover hover:text-foreground-primary',
                  collapsed && 'justify-center px-0'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="rounded-3xl border border-border bg-background-secondary p-3 text-xs text-foreground-muted">
        {!collapsed ? (
          <>
            <div className="flex items-center gap-2 font-medium text-foreground-primary">
              <span className="h-2 w-2 rounded-full bg-accent-success shadow-[0_0_16px_var(--color-accent-success)]" />
              System online
            </div>
            <div className="mt-1">Workspace ready</div>
          </>
        ) : (
          <div className="mx-auto h-2 w-2 rounded-full bg-accent-success" />
        )}
      </div>
    </aside>
  );
}
