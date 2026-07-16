'use client';

import type * as React from 'react';
import { Activity, AlertTriangle, Clock, Eye, FileText, Filter, Globe, Link as LinkIcon, RefreshCw, Search, ShieldAlert, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatFullTime, getPercent, getRelativeTime } from '@/lib/monitor-format';
import type { AccessLogView, MonitorFilters, MonitorStats, SecurityEventView } from '@/types/monitor';

function GlassSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'h-10 rounded-2xl border border-border bg-background-secondary px-3 text-sm text-foreground-primary backdrop-blur-xl transition-all',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring',
        props.className
      )}
    />
  );
}

export function MonitorHeader({ refreshing, autoRefresh, refreshInterval, lastUpdated, onRefresh, onAutoRefreshChange, onRefreshIntervalChange }: {
  refreshing: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
  lastUpdated: Date | null;
  onRefresh: () => void;
  onAutoRefreshChange: (value: boolean) => void;
  onRefreshIntervalChange: (value: number) => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-border bg-background-tertiary p-5 backdrop-blur-2xl lg:p-7">
      <div className="absolute right-8 top-6 h-24 w-24 rounded-full bg-accent-primary/20 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-background-secondary px-3 py-1 text-xs font-medium text-foreground-secondary backdrop-blur-xl">
            <Sparkles className="h-3.5 w-3.5 text-accent-primary" />
            Liquid Glass monitoring workspace
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground-primary lg:text-3xl">Monitoring Center</h1>
          <p className="mt-2 max-w-2xl text-sm text-foreground-secondary">
            Observe subscription traffic, security signals, active filters, and service health from one glass surface.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 rounded-full border border-border bg-background-secondary px-3 py-2 text-sm text-foreground-secondary backdrop-blur-xl">
            <input type="checkbox" checked={autoRefresh} onChange={(event) => onAutoRefreshChange(event.target.checked)} className="accent-current" />
            Auto refresh
          </label>
          <GlassSelect value={refreshInterval} onChange={(event) => onRefreshIntervalChange(Number(event.target.value))} disabled={!autoRefresh}>
            <option value={10}>10s</option>
            <option value={30}>30s</option>
            <option value={60}>60s</option>
          </GlassSelect>
          <Button onClick={onRefresh} variant="outline" size="sm" disabled={refreshing}>
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>
      <div className="relative mt-5 flex flex-wrap gap-2 text-xs text-foreground-muted">
        <span className="rounded-full border border-border bg-background-secondary px-3 py-1 backdrop-blur-xl">Status: active</span>
        <span className="rounded-full border border-border bg-background-secondary px-3 py-1 backdrop-blur-xl">Updated: {lastUpdated ? formatFullTime(lastUpdated.toISOString()) : 'pending'}</span>
      </div>
    </section>
  );
}

export function StatsGrid({ stats }: { stats: MonitorStats }) {
  const cards = [
    { title: 'Users', value: stats.users, max: Math.max(stats.users, 100), icon: Users, desc: 'registered accounts' },
    { title: 'Configs', value: stats.configs, max: Math.max(stats.configs, 50), icon: FileText, desc: 'configuration files' },
    { title: 'Subscriptions', value: stats.subscriptions, max: Math.max(stats.subscriptions, 100), icon: LinkIcon, desc: 'active links' },
    { title: 'Last 24h hits', value: stats.last24hAccesses, max: Math.max(stats.accesses, 1), icon: Activity, desc: `${stats.todayAccesses.toLocaleString()} today` },
    { title: 'Security risk', value: stats.criticalSecurityEvents + stats.warningSecurityEvents, max: Math.max(stats.securityEvents, 1), icon: ShieldAlert, desc: `${stats.criticalSecurityEvents} critical / ${stats.warningSecurityEvents} warning` },
    { title: 'Unique IPs', value: stats.uniqueIps, max: Math.max(stats.accesses, 1), icon: Globe, desc: 'observed clients' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((stat) => {
        const Icon = stat.icon;
        const percent = getPercent(stat.value, stat.max);
        return (
          <Card key={stat.title} className="overflow-hidden hover:-translate-y-1 hover:border-border-hover hover:shadow-2xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-foreground-secondary">{stat.title}</p>
                  <div className="mt-2 text-3xl font-semibold text-foreground-primary">{stat.value.toLocaleString()}</div>
                </div>
                <div className="rounded-2xl border border-border bg-background-secondary p-3 text-accent-primary backdrop-blur-xl"><Icon className="h-5 w-5" /></div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-background-secondary">
                <div className="h-full rounded-full bg-accent-primary transition-all" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-3 text-xs text-foreground-muted">{stat.desc}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function MonitorFiltersPanel({ filters, onFiltersChange }: { filters: MonitorFilters; onFiltersChange: (filters: MonitorFilters) => void }) {
  const update = <K extends keyof MonitorFilters>(key: K, value: MonitorFilters[K]) => onFiltersChange({ ...filters, [key]: value });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Filter className="h-4 w-4" /> Filters</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Input value={filters.accessQuery} onChange={(event) => update('accessQuery', event.target.value)} placeholder="Search access logs" />
        <Input value={filters.accessEmail} onChange={(event) => update('accessEmail', event.target.value)} placeholder="Access email" />
        <Input value={filters.accessIp} onChange={(event) => update('accessIp', event.target.value)} placeholder="Access IP" />
        <Input value={filters.securityIp} onChange={(event) => update('securityIp', event.target.value)} placeholder="Security IP" />
        <Input value={filters.securityType} onChange={(event) => update('securityType', event.target.value)} placeholder="Security type" />
        <GlassSelect value={filters.securitySeverity} onChange={(event) => update('securitySeverity', event.target.value)}>
          <option value="">All severities</option><option value="info">Info</option><option value="warning">Warning</option><option value="error">Error</option><option value="critical">Critical</option>
        </GlassSelect>
        <Input type="datetime-local" value={filters.from} onChange={(event) => update('from', event.target.value)} />
        <Input type="datetime-local" value={filters.to} onChange={(event) => update('to', event.target.value)} />
      </CardContent>
    </Card>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const className = severity === 'critical' || severity === 'error' ? 'border-accent-error/40 bg-accent-error/10 text-accent-error' : severity === 'warning' ? 'border-accent-warning/40 bg-accent-warning/10 text-accent-warning' : 'border-accent-info/40 bg-accent-info/10 text-accent-info';
  return <span className={cn('rounded-full border px-2.5 py-1 text-xs font-medium', className)}>{severity}</span>;
}

export function SecurityEventsPanel({ events }: { events: SecurityEventView[] }) {
  return (
    <Card>
      <CardHeader className="border-b border-border"><CardTitle className="flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Security Events <span className="text-xs text-foreground-muted">({events.length})</span></CardTitle></CardHeader>
      <CardContent className="space-y-3 p-4">
        {events.length === 0 ? <EmptyState icon={AlertTriangle} title="No security events" /> : events.map((event) => (
          <div key={event.id} className="rounded-3xl border border-border bg-background-secondary p-4 backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-2"><SeverityBadge severity={event.severity} /><span className="font-medium text-foreground-primary">{event.type}</span><span className="text-xs text-foreground-muted">{event.method}</span><span className="text-sm text-foreground-secondary break-all">{event.path}</span>{event.statusCode && <span className="text-xs text-foreground-muted">{event.statusCode}</span>}</div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-foreground-muted"><span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{formatFullTime(event.createdAt)} · {getRelativeTime(event.createdAt)}</span><span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" />{event.ipAddress}</span>{event.identifier && <span>{event.identifier}</span>}</div>
            {event.message && <p className="mt-2 text-sm text-foreground-secondary">{event.message}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function AccessLogsPanel({ logs }: { logs: AccessLogView[] }) {
  return (
    <Card>
      <CardHeader className="border-b border-border"><CardTitle className="flex items-center gap-2"><Eye className="h-4 w-4" /> Access Logs <span className="text-xs text-foreground-muted">({logs.length})</span></CardTitle></CardHeader>
      <CardContent className="space-y-3 p-4">
        {logs.length === 0 ? <EmptyState icon={Search} title="No access logs match the filters" /> : logs.map((log) => (
          <div key={log.id} className="rounded-3xl border border-border bg-background-secondary p-4 backdrop-blur-xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div><div className="font-medium text-foreground-primary">{log.email}</div><div className="mt-1 text-sm text-accent-info">{log.activeConfigNames.join(', ') || 'No active configs'}</div></div>
              <span className="text-xs text-foreground-muted">{getRelativeTime(log.accessedAt)}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-foreground-muted"><span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{formatFullTime(log.accessedAt)}</span><span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" />{log.ipAddress}</span></div>
            {log.userAgent && <p className="mt-2 truncate text-xs text-foreground-placeholder" title={log.userAgent}>{log.userAgent}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border p-8 text-center text-foreground-muted"><Icon className="mb-3 h-6 w-6" /><p className="text-sm">{title}</p></div>;
}
