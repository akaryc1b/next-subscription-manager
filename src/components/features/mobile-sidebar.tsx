'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { navItems } from '@/lib/nav-items';
import { ChevronRight, Terminal } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Terminal CLI Mobile Sidebar Component
 *
 * 设计特点:
 * - ASCII 风格导航
 * - 命令行提示符菜单项
 * - 发光效果高亮当前项
 */
export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b border-border px-3 py-4">
          <SheetTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-accent-primary" />
            <span className="text-sm font-medium tracking-wider uppercase">
              Subscription
            </span>
          </SheetTitle>
        </SheetHeader>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onOpenChange(false)}
              >
                <div
                  className={cn(
                    'group flex items-center gap-3 px-3 py-2 transition-all duration-fast',
                    // 激活状态 - 反色 + 发光
                    isActive
                      ? 'bg-foreground-primary text-background-primary shadow-[0_0_10px_rgba(51,255,0,0.3)]'
                      : 'text-foreground-secondary hover:text-foreground-primary hover:bg-background-hover'
                  )}
                >
                  {/* 提示符 */}
                  {isActive ? (
                    <span className="text-background-primary">{'>'}</span>
                  ) : (
                    <span className="text-foreground-muted group-hover:text-foreground-secondary">
                      {'$'}
                    </span>
                  )}

                  {/* 图标 */}
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      isActive ? 'text-background-primary' : ''
                    )}
                  />

                  {/* 文字 */}
                  <span className="text-sm tracking-wider truncate">
                    {item.label}
                  </span>

                  {/* 激活指示器 */}
                  {isActive && (
                    <ChevronRight className="h-4 w-4 ml-auto text-background-primary" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* 底部状态栏 */}
        <div className="border-t border-border p-2 mt-auto">
          <div className="px-3 py-2 text-xs text-foreground-muted space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-accent-success">●</span>
              <span>SYSTEM ONLINE</span>
            </div>
            <div className="text-foreground-placeholder">
              v2.2.0 | Terminal Mode
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
