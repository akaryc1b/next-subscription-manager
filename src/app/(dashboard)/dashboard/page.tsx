'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  CircleAlert,
  Clock3,
  CreditCard,
  FileText,
  Gauge,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge, EmptyState, PageHeader, Section, StatCard } from '@/components/ui/saas'

interface Stats {
  users: number
  configs: number
  subscriptions: number
  todayAccesses: number
  securityEvents: number
  criticalSecurityEvents: number
  warningSecurityEvents: number
}

interface RecentActivity {
  id: string
  email: string
  configName: string
  accessedAt: string
}

interface SecurityEvent {
  id: string
  type: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  message: string | null
  ipAddress: string
  createdAt: string
}

interface UpcomingRenewal {
  id: string
  email: string
  expiresAt: string
  isActive: boolean
  isBanned: boolean
}

interface PaginatedUsersResponse {
  users?: UpcomingRenewal[]
  pagination?: {
    pageCount?: number
  }
}

const initialStats: Stats = {
  users: 0,
  configs: 0,
  subscriptions: 0,
  todayAccesses: 0,
  securityEvents: 0,
  criticalSecurityEvents: 0,
  warningSecurityEvents: 0,
}

const eventLabels: Record<string, string> = {
  admin_auth_missing: 'Unauthenticated admin request',
  admin_auth_invalid_session: 'Invalid admin session',
  admin_auth_forbidden: 'Unauthorized admin request',
  auth_failure: 'Authentication failed',
  activation_token_invalid: 'Invalid activation link',
  activation_token_used: 'Activation link reused',
  activation_token_expired: 'Activation link expired',
  activation_setup_rejected: 'Account activation rejected',
  subscription_token_invalid: 'Invalid subscription link',
  subscription_denied: 'Subscription access denied',
}

function getRelativeTime(dateString: string) {
  const diffMinutes = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000)
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

function getDaysUntil(dateString: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateString)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
}

function formatRenewalDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getSeverityVariant(severity: SecurityEvent['severity']) {
  if (severity === 'critical' || severity === 'error') return 'danger' as const
  if (severity === 'warning') return 'warning' as const
  return 'info' as const
}

async function fetchAllRenewalAccounts(): Promise<UpcomingRenewal[]> {
  const pageSize = 100
  let page = 1
  let pageCount = 1
  const accounts: UpcomingRenewal[] = []

  do {
    const searchParams = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    })
    const response = await fetch(`/api/users?${searchParams.toString()}`, { cache: 'no-store' })

    if (!response.ok) {
      throw new Error('Failed to load subscription accounts')
    }

    const data = await response.json() as PaginatedUsersResponse
    accounts.push(...(data.users || []))
    pageCount = data.pagination?.pageCount || 1
    page += 1
  } while (page <= pageCount)

  return accounts
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>(initialStats)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([])
  const [upcomingRenewals, setUpcomingRenewals] = useState<UpcomingRenewal[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    setRefreshing(true)
    setError('')

    try {
      const [statsResponse, logsResponse, securityResponse, renewalAccounts] = await Promise.all([
        fetch('/api/stats', { cache: 'no-store' }),
        fetch('/api/logs?limit=5', { cache: 'no-store' }),
        fetch('/api/security-events?limit=5', { cache: 'no-store' }),
        fetchAllRenewalAccounts(),
      ])

      if (!statsResponse.ok || !logsResponse.ok || !securityResponse.ok) {
        throw new Error('Failed to load overview data')
      }

      const [statsData, logsData, securityData] = await Promise.all([
        statsResponse.json(),
        logsResponse.json(),
        securityResponse.json(),
      ])

      setStats({
        users: statsData.stats?.users || 0,
        configs: statsData.stats?.configs || 0,
        subscriptions: statsData.stats?.subscriptions || 0,
        todayAccesses: statsData.stats?.todayAccesses || 0,
        securityEvents: statsData.stats?.securityEvents || 0,
        criticalSecurityEvents: statsData.stats?.criticalSecurityEvents || 0,
        warningSecurityEvents: statsData.stats?.warningSecurityEvents || 0,
      })

      const activities = logsData.logs?.slice(0, 5).map((log: {
        id: string
        accessedAt: string
        subscription?: {
          user?: {
            email?: string
            userConfigs?: Array<{ config: { isActive: boolean; name: string } }>
          }
        }
      }) => ({
        id: log.id,
        email: log.subscription?.user?.email || 'Unknown account',
        configName: log.subscription?.user?.userConfigs
          ?.filter((userConfig) => userConfig.config.isActive)
          .map((userConfig) => userConfig.config.name)
          .join(', ') || 'No active configuration',
        accessedAt: log.accessedAt,
      })) || []

      const renewals = renewalAccounts
        .filter((user) => user.expiresAt && getDaysUntil(user.expiresAt) >= 0)
        .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())
        .slice(0, 5)

      setRecentActivity(activities)
      setSecurityEvents(securityData.events || [])
      setUpcomingRenewals(renewals)
    } catch (fetchError) {
      console.error('Failed to fetch dashboard data', fetchError)
      setError('Overview data could not be loaded. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const health = useMemo(() => {
    const riskSignals = stats.criticalSecurityEvents + stats.warningSecurityEvents
    const requestsPerSubscription = stats.subscriptions > 0
      ? (stats.todayAccesses / stats.subscriptions).toFixed(1)
      : '0.0'
    const configsPerSubscription = stats.subscriptions > 0
      ? (stats.configs / stats.subscriptions).toFixed(1)
      : '0.0'

    return { riskSignals, requestsPerSubscription, configsPerSubscription }
  }, [stats])

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-primary/10 text-accent-primary">
          <Sparkles className="h-5 w-5 animate-pulse" />
        </div>
        <div className="text-sm text-foreground-muted">Loading subscription workspace…</div>
      </div>
    )
  }

  return (
    <div className="saas-page">
      <PageHeader
        eyebrow="Personal subscription workspace"
        icon={CreditCard}
        title="Your subscription assets"
        description="A focused view of subscription accounts, active configurations, usage, renewal dates, and security health."
        actions={
          <Button onClick={() => void fetchData()} variant="secondary" size="sm" disabled={refreshing}>
            <RefreshCw className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </Button>
        }
      />

      {error && (
        <div className="flex flex-col gap-3 rounded-2xl border border-accent-error/30 bg-accent-error/10 p-4 text-sm text-accent-error sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CircleAlert className="h-4 w-4" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => void fetchData()}>Retry</Button>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Link href="/users" className="min-w-0">
          <StatCard label="Subscription accounts" value={stats.subscriptions.toLocaleString()} description={`${stats.users.toLocaleString()} managed accounts`} icon={CreditCard} />
        </Link>
        <Link href="/monitor" className="min-w-0">
          <StatCard label="Requests today" value={stats.todayAccesses.toLocaleString()} description={`${health.requestsPerSubscription} per subscription`} icon={Activity} tone="info" />
        </Link>
        <Link href="/configs" className="min-w-0">
          <StatCard label="Configuration assets" value={stats.configs.toLocaleString()} description={`${health.configsPerSubscription} per subscription`} icon={FileText} tone="success" />
        </Link>
        <Link href="/monitor" className="min-w-0">
          <StatCard label="Security signals" value={health.riskSignals.toLocaleString()} description={`${stats.criticalSecurityEvents} critical · ${stats.warningSecurityEvents} warning`} icon={ShieldAlert} tone={health.riskSignals > 0 ? 'warning' : 'success'} />
        </Link>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Section
          title="Activity pulse"
          description="Recent subscription delivery activity from existing access logs."
          actions={<Button asChild variant="ghost" size="sm"><Link href="/monitor">Full analytics<ArrowUpRight /></Link></Button>}
          contentClassName="space-y-2"
        >
          {recentActivity.length === 0 ? (
            <EmptyState icon={Clock3} title="No recent subscription activity" description="New requests will appear here when a subscription link is accessed." />
          ) : (
            recentActivity.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.035 }}
                className="group flex items-center gap-3 rounded-xl bg-background-secondary/65 p-3 ring-1 ring-inset ring-border/70 hover:bg-background-hover"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary"><Activity className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground-primary">{activity.email}</div>
                  <div className="mt-0.5 truncate text-xs text-foreground-muted">{activity.configName}</div>
                </div>
                <div className="shrink-0 text-[11px] text-foreground-muted">{getRelativeTime(activity.accessedAt)}</div>
              </motion.div>
            ))
          )}
        </Section>

        <Section title="Subscription health" description="Derived only from current usage and security totals.">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-background-secondary/65 p-3 ring-1 ring-inset ring-border/70">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-success/10 text-accent-success"><ShieldCheck className="h-4 w-4" /></div>
                <div>
                  <div className="text-sm font-medium">Portfolio status</div>
                  <div className="mt-0.5 text-xs text-foreground-muted">Based on current security signals</div>
                </div>
              </div>
              <Badge variant={health.riskSignals > 0 ? 'warning' : 'success'}>{health.riskSignals > 0 ? 'Review' : 'Healthy'}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-background-secondary/65 p-3 ring-1 ring-inset ring-border/70">
                <Gauge className="h-4 w-4 text-accent-info" />
                <div className="mt-3 text-xl font-semibold tracking-tight">{health.requestsPerSubscription}</div>
                <div className="mt-1 text-[11px] text-foreground-muted">Requests per subscription today</div>
              </div>
              <div className="rounded-xl bg-background-secondary/65 p-3 ring-1 ring-inset ring-border/70">
                <FileText className="h-4 w-4 text-accent-primary" />
                <div className="mt-3 text-xl font-semibold tracking-tight">{health.configsPerSubscription}</div>
                <div className="mt-1 text-[11px] text-foreground-muted">Configurations per subscription</div>
              </div>
            </div>
          </div>
        </Section>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Section
          title="Upcoming renewals"
          description="Nearest dates from existing subscription expiration fields."
          actions={<Button asChild variant="ghost" size="sm"><Link href="/calendar">Open calendar<ArrowUpRight /></Link></Button>}
          contentClassName="space-y-2"
        >
          {upcomingRenewals.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No upcoming renewals" description="No dated subscription accounts are currently scheduled." />
          ) : (
            upcomingRenewals.map((renewal) => {
              const days = getDaysUntil(renewal.expiresAt)
              return (
                <div key={renewal.id} className="flex items-center gap-3 rounded-xl bg-background-secondary/65 p-3 ring-1 ring-inset ring-border/70">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary"><CalendarDays className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground-primary">{renewal.email}</div>
                    <div className="mt-0.5 text-xs text-foreground-muted">{formatRenewalDate(renewal.expiresAt)}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(!renewal.isActive || renewal.isBanned) && <Badge variant="neutral">Inactive</Badge>}
                    <Badge variant={days <= 7 ? 'warning' : 'default'}>{days === 0 ? 'Today' : `${days}d`}</Badge>
                  </div>
                </div>
              )
            })
          )}
        </Section>

        <Section
          title="Security activity"
          description={`${stats.securityEvents.toLocaleString()} recorded security events in the current statistics.`}
          actions={<Button asChild variant="ghost" size="sm"><Link href="/monitor">View all<ArrowUpRight /></Link></Button>}
          contentClassName="space-y-2"
        >
          {securityEvents.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="No recent security events" description="The current event feed is clear." />
          ) : (
            securityEvents.map((event) => (
              <div key={event.id} className="flex flex-col gap-2 rounded-xl bg-background-secondary/65 p-3 ring-1 ring-inset ring-border/70 sm:flex-row sm:items-center">
                <Badge variant={getSeverityVariant(event.severity)}>{event.severity}</Badge>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground-primary">{event.message || eventLabels[event.type] || event.type}</div>
                  <div className="mt-0.5 text-xs text-foreground-muted">{event.ipAddress}</div>
                </div>
                <div className="shrink-0 text-[11px] text-foreground-muted">{getRelativeTime(event.createdAt)}</div>
              </div>
            ))
          )}
        </Section>
      </section>
    </div>
  )
}
