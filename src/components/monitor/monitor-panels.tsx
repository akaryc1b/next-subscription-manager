'use client'

import type * as React from 'react'
import {
  Activity,
  AlertTriangle,
  Clock,
  Eye,
  FileText,
  Filter,
  Globe,
  Link as LinkIcon,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge, EmptyState, PageHeader, Section, StatCard } from '@/components/ui/saas'
import { cn } from '@/lib/utils'
import { formatFullTime, getRelativeTime } from '@/lib/monitor-format'
import type { AccessLogView, MonitorFilters, MonitorStats, SecurityEventView } from '@/types/monitor'

function CompactSelect({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-9 rounded-lg border border-border bg-background-secondary px-3 text-[13px] text-foreground-primary',
        'focus-visible:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
      {...props}
    />
  )
}

export function MonitorHeader({
  refreshing,
  autoRefresh,
  refreshInterval,
  lastUpdated,
  onRefresh,
  onAutoRefreshChange,
  onRefreshIntervalChange,
}: {
  refreshing: boolean
  autoRefresh: boolean
  refreshInterval: number
  lastUpdated: Date | null
  onRefresh: () => void
  onAutoRefreshChange: (value: boolean) => void
  onRefreshIntervalChange: (value: number) => void
}) {
  return (
    <PageHeader
      eyebrow="Operational intelligence"
      icon={Activity}
      title="Activity"
      description={
        <span>
          Inspect subscription traffic, client reach, and security signals.
          {lastUpdated && <span className="ml-2 text-foreground-placeholder">Updated {formatFullTime(lastUpdated.toISOString())}</span>}
        </span>
      }
      actions={
        <>
          <label className="flex h-8 items-center gap-2 rounded-lg border border-border bg-background-secondary px-3 text-xs text-foreground-secondary">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(event) => onAutoRefreshChange(event.target.checked)}
              className="h-3.5 w-3.5 accent-accent-primary"
            />
            Live
          </label>
          <CompactSelect
            value={refreshInterval}
            onChange={(event) => onRefreshIntervalChange(Number(event.target.value))}
            disabled={!autoRefresh}
            className="h-8"
            aria-label="Refresh interval"
          >
            <option value={10}>10 sec</option>
            <option value={30}>30 sec</option>
            <option value={60}>60 sec</option>
          </CompactSelect>
          <Button onClick={onRefresh} variant="secondary" size="sm" disabled={refreshing}>
            <RefreshCw className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </>
      }
    />
  )
}

export function StatsGrid({ stats }: { stats: MonitorStats }) {
  const cards = [
    { label: 'Accounts', value: stats.users, icon: Users, description: 'Registered accounts', tone: 'primary' as const },
    { label: 'Configurations', value: stats.configs, icon: FileText, description: 'Configuration assets', tone: 'success' as const },
    { label: 'Subscriptions', value: stats.subscriptions, icon: LinkIcon, description: 'Delivery links', tone: 'primary' as const },
    { label: 'Last 24 hours', value: stats.last24hAccesses, icon: Activity, description: `${stats.todayAccesses.toLocaleString()} requests today`, tone: 'info' as const },
    { label: 'Risk signals', value: stats.criticalSecurityEvents + stats.warningSecurityEvents, icon: ShieldAlert, description: `${stats.criticalSecurityEvents} critical · ${stats.warningSecurityEvents} warning`, tone: (stats.criticalSecurityEvents + stats.warningSecurityEvents > 0 ? 'warning' : 'success') as 'warning' | 'success' },
    { label: 'Unique clients', value: stats.uniqueIps, icon: Globe, description: 'Observed IP addresses', tone: 'info' as const },
  ]

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => (
        <StatCard
          key={card.label}
          label={card.label}
          value={card.value.toLocaleString()}
          description={card.description}
          icon={card.icon}
          tone={card.tone}
        />
      ))}
    </div>
  )
}

export function MonitorFiltersPanel({
  filters,
  onFiltersChange,
}: {
  filters: MonitorFilters
  onFiltersChange: (filters: MonitorFilters) => void
}) {
  const update = <K extends keyof MonitorFilters>(key: K, value: MonitorFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <Section
      title={<span className="flex items-center gap-2"><Filter className="h-4 w-4 text-accent-primary" />Filters</span>}
      description="Narrow delivery and security records using the existing query fields."
      contentClassName="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4"
    >
      <Input value={filters.accessQuery} onChange={(event) => update('accessQuery', event.target.value)} placeholder="Search access activity" />
      <Input value={filters.accessEmail} onChange={(event) => update('accessEmail', event.target.value)} placeholder="Account email" />
      <Input value={filters.accessIp} onChange={(event) => update('accessIp', event.target.value)} placeholder="Access IP" />
      <Input value={filters.securityIp} onChange={(event) => update('securityIp', event.target.value)} placeholder="Security IP" />
      <Input value={filters.securityType} onChange={(event) => update('securityType', event.target.value)} placeholder="Security event type" />
      <CompactSelect value={filters.securitySeverity} onChange={(event) => update('securitySeverity', event.target.value)}>
        <option value="">All severities</option>
        <option value="info">Info</option>
        <option value="warning">Warning</option>
        <option value="error">Error</option>
        <option value="critical">Critical</option>
      </CompactSelect>
      <Input type="datetime-local" value={filters.from} onChange={(event) => update('from', event.target.value)} aria-label="From date" />
      <Input type="datetime-local" value={filters.to} onChange={(event) => update('to', event.target.value)} aria-label="To date" />
    </Section>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const variant = severity === 'critical' || severity === 'error'
    ? 'danger'
    : severity === 'warning'
      ? 'warning'
      : 'info'

  return <Badge variant={variant}>{severity}</Badge>
}

export function SecurityEventsPanel({ events }: { events: SecurityEventView[] }) {
  return (
    <Section
      title={<span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-accent-warning" />Security events</span>}
      description={`${events.length} records in the current result set`}
      contentClassName="p-0"
    >
      {events.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No security events" description="No security records match the current filters." />
      ) : (
        events.map((event) => (
          <article key={event.id} className="border-b border-border-subtle px-4 py-3.5 last:border-b-0 sm:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={event.severity} />
              <span className="text-[13px] font-medium text-foreground-primary">{event.type}</span>
              <span className="font-mono text-[10px] text-foreground-muted">{event.method}</span>
              {event.statusCode && <Badge variant="neutral">{event.statusCode}</Badge>}
            </div>
            <div className="mt-2 break-all font-mono text-[11px] text-foreground-secondary">{event.path}</div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-foreground-muted">
              <span className="inline-flex items-center gap-1.5"><Clock className="h-3 w-3" />{formatFullTime(event.createdAt)} · {getRelativeTime(event.createdAt)}</span>
              <span className="inline-flex items-center gap-1.5 font-mono"><Globe className="h-3 w-3" />{event.ipAddress}</span>
              {event.identifier && <span className="truncate">{event.identifier}</span>}
            </div>
            {event.message && <p className="mt-2 text-xs leading-5 text-foreground-muted">{event.message}</p>}
          </article>
        ))
      )}
    </Section>
  )
}

export function AccessLogsPanel({ logs }: { logs: AccessLogView[] }) {
  return (
    <Section
      title={<span className="flex items-center gap-2"><Eye className="h-4 w-4 text-accent-info" />Delivery activity</span>}
      description={`${logs.length} access records in the current result set`}
      contentClassName="p-0"
    >
      {logs.length === 0 ? (
        <EmptyState icon={Search} title="No delivery activity" description="No access records match the current filters." />
      ) : (
        logs.map((log) => (
          <article key={log.id} className="border-b border-border-subtle px-4 py-3.5 last:border-b-0 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium text-foreground-primary">{log.email}</div>
                <div className="mt-1 truncate text-[11px] text-accent-info">{log.activeConfigNames.join(', ') || 'No active configurations'}</div>
              </div>
              <Badge variant="neutral" className="shrink-0">{getRelativeTime(log.accessedAt)}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-foreground-muted">
              <span className="inline-flex items-center gap-1.5"><Clock className="h-3 w-3" />{formatFullTime(log.accessedAt)}</span>
              <span className="inline-flex items-center gap-1.5 font-mono"><Globe className="h-3 w-3" />{log.ipAddress}</span>
            </div>
            {log.userAgent && <p className="mt-2 truncate font-mono text-[10px] text-foreground-placeholder" title={log.userAgent}>{log.userAgent}</p>}
          </article>
        ))
      )}
    </Section>
  )
}
