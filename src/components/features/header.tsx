'use client';

import { useRouter, usePathname } from 'next/navigation';
import { LogOut, User, Moon, Sun, Settings, Menu, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authClient } from '@/lib/auth-client';
import { useTheme } from '@/components/theme-provider';
import { MobileSidebar } from '@/components/features/mobile-sidebar';
import { useState } from 'react';
import { navItems } from '@/lib/nav-items';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const current = navItems.find((item) => item.href === pathname);

  const handleLogout = async () => {
    await authClient.signOut();
    router.push('/login');
  };

  return (
    <>
      <MobileSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      <header className="glass-panel sticky top-2 z-30 h-14 rounded-[1.5rem] px-2 sm:h-16 sm:rounded-[1.75rem] sm:px-3 lg:static">
        <div className="flex h-full items-center justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon-sm" className="h-10 w-10 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open navigation menu">
              <Menu className="h-4 w-4" />
            </Button>
            <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-background-tertiary text-accent-primary sm:flex">
              {current?.icon ? <current.icon className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold sm:text-base">{current?.label || 'Dashboard'}</div>
              <div className="hidden text-xs text-foreground-muted sm:block">Liquid Glass admin workspace</div>
              <div className="text-[11px] text-foreground-muted sm:hidden">Admin workspace</div>
            </div>
          </div>

          <div className="hidden min-w-48 max-w-xs flex-1 items-center gap-2 rounded-full border border-border bg-background-secondary px-3 py-2 text-sm text-foreground-muted backdrop-blur-xl md:flex">
            <Search className="h-4 w-4" />
            <span>Search users, configs, logs...</span>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon-sm" className="h-10 w-10" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon-sm" className="h-10 w-10">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-3xl border-border bg-background-tertiary p-2 backdrop-blur-2xl">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-foreground-primary">{session?.user?.name || 'User'}</span>
                    <span className="text-xs text-foreground-muted">{session?.user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-accent-error focus:text-accent-error">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </>
  );
}
