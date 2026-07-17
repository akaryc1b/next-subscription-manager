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
  Sparkles,
  ArrowUpRight,
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

      setStats({
        users: statsData.stats?.users || 0,
        configs: statsData.stats?.configs || 0,
        subscriptions: statsData.stats?.subscriptions || 0,
        todayAccesses: statsData.stats?.todayAccesses || 0,
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
        <Sparkles className="h-8 w-8 text-accent-primary animate-pulse" />
        <div className="text-foreground-secondary text-sm">Preparing your workspace...</div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'USERS',
      value: stats.users,
      icon: Users,
      desc: 'registered users',
      href: '/users',
    },
    {
      title: 'CONFIGS',
      value: stats.configs,
      icon: FileText,
      desc: 'active configs',
      href: '/configs',
    },
    {
      title: 'SUBSCRIPTIONS',
      value: stats.subscriptions,
      icon: LinkIcon,
      desc: 'generated links',
      href: '/configs',
    },
    {
      title: 'TODAY ACCESS',
      value: stats.todayAccesses,
      icon: Activity,
      desc: 'requests today',
      href: '/monitor',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-background-tertiary p-6 backdrop-blur-2xl lg:p-8">
        <div className="liquid-orb right-10 top-[-5rem] h-56 w-56 bg-background-active" />
        <div className="liquid-orb bottom-[-6rem] left-24 h-64 w-64 bg-background-active" />
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">Subscription Control Center</h1>
          </div>
          <Button onClick={fetchData} variant="secondary" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="group overflow-hidden hover:-translate-y-1 hover:border-border-hover hover:shadow-2xl">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="rounded-2xl bg-background-active p-3 text-accent-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-foreground-muted opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <div className="mt-5 text-4xl font-semibold tracking-tight text-foreground-primary">{stat.value}</div>
                  <div className="mt-1 text-sm font-medium text-foreground-secondary">{stat.desc}</div>
                  <div className="mt-5 text-xs uppercase tracking-[0.18em] text-foreground-muted">{stat.title.toLowerCase()}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { href: '/users', label: 'Manage users', desc: 'Create accounts and subscription policies', icon: Users },
                { href: '/configs', label: 'Edit configs', desc: 'Maintain active YAML profiles', icon: FileText },
                { href: '/monitor', label: 'Access monitor', desc: 'Review recent traffic and usage', icon: Activity },
                { href: '/settings', label: 'Workspace settings', desc: 'Security, theme, and auth methods', icon: Sparkles },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.href} href={action.href}>
                    <div className="flex items-center gap-4 rounded-3xl border border-border bg-background-secondary p-4 backdrop-blur-xl hover:bg-background-hover">
                      <div className="rounded-2xl bg-background-active p-3 text-accent-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">{action.label}</div>
                        <div className="truncate text-xs text-foreground-muted">{action.desc}</div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-foreground-muted" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border p-6 text-center text-sm text-foreground-muted">
                No access events yet.
              </div>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 rounded-3xl bg-background-secondary p-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-accent-success shadow-[0_0_16px_var(--color-accent-success)]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{activity.email}</div>
                    <div className="truncate text-xs text-foreground-muted">{activity.configName}</div>
                  </div>
                  <div className="text-xs text-foreground-muted">{getRelativeTime(activity.accessedAt)}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
