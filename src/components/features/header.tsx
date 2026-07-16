'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User, Moon, Sun, Settings, Terminal, Menu } from 'lucide-react';
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

/**
 * Terminal CLI Header Component
 *
 * 设计特点:
 * - 命令行风格状态栏
 * - 实时时间显示
 * - ASCII 风格用户菜单
 * - 移动端汉堡菜单
 */

export function Header() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { theme, toggleTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 实时时钟
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    await authClient.signOut();
    router.push('/login');
  };

  return (
    <>
      <MobileSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      <header className="border-b border-border bg-background-primary h-14">
        <div className="flex h-full items-center justify-between px-4">
          {/* 左侧 - 移动端汉堡菜单 + 命令行提示 */}
          <div className="flex items-center gap-3 text-sm">
            {/* 移动端汉堡菜单 */}
            <Button
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            
            {/* 桌面端命令行提示 */}
            <div className="hidden lg:flex items-center gap-1">
              <span className="text-foreground-muted">root@okcomputer:</span>
              <span className="text-accent-primary">~</span>
              <span className="text-foreground-muted">#</span>
              <span className="text-foreground-primary">
                SUBSCRIPTION_MANAGER
              </span>
              <span className="terminal-cursor" />
            </div>
            
            {/* 移动端简化标题 */}
            <div className="flex lg:hidden items-center gap-2">
              <Terminal className="h-4 w-4 text-accent-primary" />
              <span className="text-foreground-primary text-xs tracking-wider uppercase">
                OKCOMPUTER
              </span>
            </div>
          </div>

          {/* 右侧 - 控制区 */}
          <div className="flex items-center gap-2">
            {/* 时间显示 */}
            <div className="text-xs text-foreground-muted font-mono mr-2 hidden sm:block">
              <span className="text-foreground-secondary">[</span>
              {currentTime}
              <span className="text-foreground-secondary">]</span>
            </div>

            {/* 主题切换 */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {/* 用户菜单 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-accent-primary" />
                      <span className="text-foreground-primary uppercase tracking-wider">
                        {session?.user?.name || 'USER'}
                      </span>
                    </div>
                    <span className="text-xs text-foreground-muted">
                      {session?.user?.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span className="uppercase tracking-wider text-sm">Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-accent-error focus:text-accent-error"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span className="uppercase tracking-wider text-sm">Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </>
  );
}
