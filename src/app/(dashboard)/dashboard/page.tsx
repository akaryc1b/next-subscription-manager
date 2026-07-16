'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  FileText,
  Link as LinkIcon,
  Activity,
  RefreshCw,
  Terminal,
  ArrowRight,
} from 'lucide-react';

/**
 * Terminal CLI Dashboard Page
 *
 * 设计特点:
 * - ASCII 风格统计卡片
 * - 终端风格进度条
 * - 命令行风格活动日志
 */

interface Stats {
  users: number;
  configs: number;
  subscriptions: number;
  todayAccesses: number;
}

interface RecentActivity {
  id: string;
  email: string;
  configName: string;
  accessedAt: string;
}

// ASCII 进度条生成器
function generateProgressBar(value: number, max: number, width: number = 20): string {
  const percentage = Math.min(value / Math.max(max, 1), 1);
  const filled = Math.round(percentage * width);
  const empty = width - filled;
  return '[' + '|'.repeat(filled) + '.'.repeat(empty) + ']';
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    users: 0,
    configs: 0,
    subscriptions: 0,
    todayAccesses: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [statsRes, logsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/logs?limit=5'),
      ]);
      const statsData = await statsRes.json();
      const logsData = await logsRes.json();

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayLogs =
        logsData.logs?.filter(
          (log: { accessedAt: string }) => new Date(log.accessedAt) >= today
        ) || [];

      setStats({
        users: statsData.stats?.users || 0,
        configs: statsData.stats?.configs || 0,
        subscriptions: statsData.stats?.subscriptions || 0,
        todayAccesses: todayLogs.length,
      });

      const activities =
        logsData.logs?.slice(0, 5).map((log: { id: string; accessedAt: string; subscription?: { user?: { email?: string; userConfigs?: Array<{ config: { isActive: boolean; name: string } }> } } }) => ({
          id: log.id,
          email: log.subscription?.user?.email || 'unknown',
          configName:
            log.subscription?.user?.userConfigs
              ?.filter((uc) => uc.config.isActive)
              .map((uc) => uc.config.name)
              .join(', ') || 'none',
          accessedAt: log.accessedAt,
        })) || [];

      setRecentActivity(activities);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Terminal className="h-8 w-8 text-accent-primary animate-pulse" />
        <div className="text-foreground-secondary text-sm font-mono">
          Loading system data...
          <span className="terminal-cursor ml-1" />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'USERS',
      value: stats.users,
      max: 100,
      icon: Users,
      desc: 'registered users',
      href: '/users',
    },
    {
      title: 'CONFIGS',
      value: stats.configs,
      max: 50,
      icon: FileText,
      desc: 'active configs',
      href: '/configs',
    },
    {
      title: 'SUBSCRIPTIONS',
      value: stats.subscriptions,
      max: 100,
      icon: LinkIcon,
      desc: 'generated links',
      href: '/configs',
    },
    {
      title: 'TODAY ACCESS',
      value: stats.todayAccesses,
      max: 50,
      icon: Activity,
      desc: 'requests today',
      href: '/monitor',
    },
  ];

  return (
    <div className="space-y-4 lg:space-y-6 p-4 lg:p-6">
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-wider uppercase flex items-center gap-2">
            <span className="text-foreground-muted">{'>'}</span>
            DASHBOARD
          </h1>
          <p className="text-xs lg:text-sm text-foreground-secondary mt-1">
            System overview and quick access
          </p>
        </div>
        <Button
          onClick={fetchData}
          variant="outline"
          size="sm"
          disabled={refreshing}
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''} sm:mr-2`}
          />
          <span className="hidden sm:inline">REFRESH</span>
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="hover:border-foreground-primary transition-colors cursor-pointer group">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium tracking-wider text-foreground-secondary">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-foreground-muted group-hover:text-accent-primary transition-colors" />
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-3xl font-bold text-foreground-primary">
                    {stat.value}
                  </div>
                  <div className="mt-2 font-mono text-xs text-foreground-muted">
                    {generateProgressBar(stat.value, stat.max)}
                  </div>
                  <p className="text-xs text-foreground-secondary mt-1">
                    {stat.desc}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* 快速命令 */}
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-sm">
            <span className="text-foreground-muted">+---</span>
            QUICK COMMANDS
            <span className="text-foreground-muted">---+</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/users">
              <Button variant="terminal" className="w-full justify-start">
                $ cd /users
              </Button>
            </Link>
            <Link href="/configs">
              <Button variant="terminal" className="w-full justify-start">
                $ cat /configs
              </Button>
            </Link>
            <Link href="/monitor">
              <Button variant="terminal" className="w-full justify-start">
                $ tail -f logs
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="terminal" className="w-full justify-start">
                $ vi ~/.settings
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 最近活动 */}
      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <span className="text-foreground-muted">+---</span>
              RECENT ACTIVITY
              <span className="text-foreground-muted">---+</span>
            </CardTitle>
            <Link href="/monitor">
              <Button variant="ghost" size="sm">
                VIEW ALL
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentActivity.length === 0 ? (
            <div className="p-8 text-center text-foreground-muted text-sm font-mono">
              <p>No recent activity</p>
              <p className="text-xs mt-1">$ tail -f /var/log/access.log</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentActivity.map((activity, index) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-background-hover transition-colors"
                >
                  <div className="flex items-center gap-3 font-mono text-sm">
                    <span className="text-foreground-muted w-4">{index + 1}.</span>
                    <span className="text-accent-success">{activity.email}</span>
                    <span className="text-foreground-muted">accessed</span>
                    <span className="text-accent-info">{activity.configName}</span>
                  </div>
                  <span className="text-xs text-foreground-muted font-mono">
                    [{getRelativeTime(activity.accessedAt)}]
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 系统状态 */}
      <div className="border border-border p-3 lg:p-4 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-2 text-foreground-muted">
          <span className="text-accent-success">●</span>
          <span className="hidden sm:inline">SYSTEM STATUS: ONLINE</span>
          <span className="sm:hidden">ONLINE</span>
          <span className="hidden sm:inline mx-2">|</span>
          <span>USERS: {stats.users}</span>
          <span className="mx-2">|</span>
          <span>CONFIGS: {stats.configs}</span>
          <span className="mx-2">|</span>
          <span className="hidden sm:inline">TODAY: {stats.todayAccesses} requests</span>
          <span className="sm:hidden">TODAY: {stats.todayAccesses}</span>
        </div>
      </div>
    </div>
  );
}
