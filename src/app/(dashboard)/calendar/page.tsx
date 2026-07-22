'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  Clock3,
  CreditCard,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge, EmptyState, PageHeader, Section, StatCard } from '@/components/ui/saas'

interface SubscriptionAccount {
  id: string
  email: string
  isActive: boolean
  isBanned: boolean
  expiresAt: string | null
}

type PaginatedResponse<T> = {
  [key: string]: T[] | { page: number; pageSize: number; total: number; pageCount: number } | undefined
  pagination?: { page: number; pageSize: number; total: number; pageCount: number }
}

async function fetchAllPages<T>(basePath: string, collectionKey: string): Promise<T[]> {
  const pageSize = 100
  let page = 1
  let pageCount = 1
  const items: T[] = []

  do {
    const searchParams = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    const response = await fetch(`${basePath}?${searchParams.toString()}`)
    if (!response.ok) throw new Error(`Failed to fetch ${collectionKey}`)

    const data = await response.json() as PaginatedResponse<T>
    items.push(...((data[collectionKey] as T[] | undefined) || []))
    pageCount = data.pagination?.pageCount || 1
    page += 1
  } while (page <= pageCount)

  return items
}

function getDaysUntil(dateString: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateString)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getDateBadge(days: number) {
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, variant: 'danger' as const }
  if (days === 0) return { label: 'Today', variant: 'warning' as const }
  if (days <= 7) return { label: `${days}d`, variant: 'warning' as const }
  if (days <= 30) return { label: `${days}d`, variant: 'default' as const }
  return { label: `${days}d`, variant: 'neutral' as const }
}

export default function CalendarPage() {
  const [accounts, setAccounts] = useState<SubscriptionAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const fetchAccounts = useCallback(async () => {
    setRefreshing(true)
    setError('')
    try {
      setAccounts(await fetchAllPages<SubscriptionAccount>('/api/users', 'users'))
    } catch {
      setError('Failed to load subscription dates')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void fetchAccounts()
  }, [fetchAccounts])

  const schedule = useMemo(() => {
    const dated = accounts
      .filter((account) => account.expiresAt)
      .map((account) => ({ ...account, expiresAt: account.expiresAt as string, days: getDaysUntil(account.expiresAt as string) }))
      .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())

    return {
      dated,
      next7: dated.filter((account) => account.days >= 0 && account.days <= 7).length,
      next30: dated.filter((account) => account.days >= 0 && account.days <= 30).length,
      expired: dated.filter((account) => account.days < 0).length,
      permanent: accounts.filter((account) => !account.expiresAt).length,
    }
  }, [accounts])

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background-secondary text-accent-primary">
          <CalendarDays className="h-4 w-4 animate-pulse" />
        </div>
        <div className="text-sm text-foreground-muted">Loading renewal schedule…</div>
      </div>
    )
  }

  return (
    <div className="saas-page">
      <PageHeader
        eyebrow="Portfolio timeline"
        icon={CalendarDays}
        title="Renewals"
        description="Track upcoming, overdue, and non-expiring subscription accounts in one chronological queue."
        actions={
          <>
            <Button asChild variant="ghost" size="sm">
              <Link href="/users">Manage subscriptions</Link>
            </Button>
            <Button variant="secondary" size="sm" onClick={() => void fetchAccounts()} disabled={refreshing}>
              <RefreshCw className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </Button>
          </>
        }
      />

      {error && (
        <div className="rounded-xl border border-accent-error/30 bg-accent-error/10 p-4 text-sm text-accent-error">
          {error}
        </div>
      )}

      <section className="metric-strip" aria-label="Renewal summary">
        <StatCard label="Due in 7 days" value={schedule.next7.toLocaleString()} description="Immediate renewal window" icon={CalendarClock} tone={schedule.next7 > 0 ? 'warning' : 'success'} />
        <StatCard label="Due in 30 days" value={schedule.next30.toLocaleString()} description="Upcoming dated accounts" icon={CalendarCheck2} />
        <StatCard label="Past due" value={schedule.expired.toLocaleString()} description="Expiration date has passed" icon={Clock3} tone={schedule.expired > 0 ? 'danger' : 'success'} />
        <StatCard label="No expiration" value={schedule.permanent.toLocaleString()} description="Accounts without an end date" icon={CreditCard} tone="info" />
      </section>

      <Section
        title="Renewal schedule"
        description="All dated accounts sorted from the earliest expiration date."
        contentClassName="p-0"
      >
        {schedule.dated.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No dated subscriptions"
            description="Accounts without an expiration date remain active without appearing on this schedule."
          />
        ) : (
          schedule.dated.map((account) => {
            const badge = getDateBadge(account.days)
            return (
              <div key={account.id} className="data-row min-h-[60px]">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background-tertiary text-foreground-muted">
                  <CalendarDays className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-foreground-primary">{account.email}</div>
                  <div className="mt-0.5 tabular-nums text-[11px] text-foreground-muted">{formatDate(account.expiresAt)}</div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {!account.isActive && <Badge variant="neutral">Paused</Badge>}
                  {account.isBanned && <Badge variant="danger">Blocked</Badge>}
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>
              </div>
            )
          })
        )}
      </Section>
    </div>
  )
}
