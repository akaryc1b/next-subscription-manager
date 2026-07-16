'use client';

import {
  Menu,
  ChevronRight,
  Terminal,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { navItems } from '@/lib/nav-items';

/**
 * Terminal CLI Sidebar Component
 *
 * 设计特点:
 * - ASCII 风格导航
 * - 命令行提示符菜单项
 * - 发光效果高亮当前项
 */

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={cn(
        'border-r border-border bg-background-secondary transition-all duration-normal',
        'flex flex-col h-full',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* 头部 - Logo 区域 */}
      <div className="flex h-14 items-center border-b border-border px-3 gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCollapsed(!collapsed)}
          className="shrink-0"
        >
          <Menu className="h-4 w-4" />
        </Button>
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <Terminal className="h-5 w-5 text-accent-primary shrink-0" />
            <span className="text-sm font-medium tracking-wider uppercase truncate">
              Subscription
            </span>
          </div>
        )}
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link key={item.href} href={item.href}>
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
                {isActive && !collapsed && (
                  <span className="text-background-primary">{'>'}</span>
                )}
                {!isActive && !collapsed && (
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
                {!collapsed && (
                  <span className="text-sm tracking-wider truncate">
                    {item.label}
                  </span>
                )}

                {/* 激活指示器 */}
                {isActive && !collapsed && (
                  <ChevronRight className="h-4 w-4 ml-auto text-background-primary" />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* 底部状态栏 */}
      <div className="border-t border-border p-2">
        {!collapsed ? (
          <div className="px-3 py-2 text-xs text-foreground-muted space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-accent-success">●</span>
              <span>SYSTEM ONLINE</span>
            </div>
            <div className="text-foreground-placeholder">
              v2.2.0 | Terminal Mode
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-2">
            <span className="text-accent-success text-xs">●</span>
          </div>
        )}
      </div>
    </div>
  );
}
