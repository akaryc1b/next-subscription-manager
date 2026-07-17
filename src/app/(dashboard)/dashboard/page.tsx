'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  FileText,
  Link as LinkIcon,
  RefreshCw,
  Settings,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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
  admin_auth_missing: '未登录访问管理接口',
  admin_auth_invalid_session: '无效管理会话',
  admin_auth_forbidden: '越权访问管理接口',
  auth_failure: '登录或认证失败',
  activation_token_invalid: '无效激活链接',
  activation_token_used: '重复使用激活链接',
  activation_token_expired: '激活链接已过期',
  activation_setup_rejected: '账户激活被拒绝',
  subscription_token_invalid: '无效订阅链接',
  subscription_denied: '订阅访问被拒绝',
}

function getRelativeTime(dateString: string) {
  const date = new Date(dateString)
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000)

  if (diffMinutes < 1) return '刚刚'
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} 小时前`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} 天前`
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>(initialStats)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    setRefreshing(true)
    setError('')

    try {
      const [statsResponse, logsResponse, securityResponse] = await Promise.all([
        fetch('/api/stats', { cache: 'no-store' }),
        fetch('/api/logs?limit=5', { cache: 'no-store' }),
        fetch('/api/security-events?limit=5', { cache: 'no-store' }),
      ])

      if (!statsResponse.ok || !logsResponse.ok || !securityResponse.ok) {
        throw new Error('加载概览数据失败')
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
        email: log.subscription?.user?.email || '未知用户',
        configName: log.subscription?.user?.userConfigs
          ?.filter(userConfig => userConfig.config.isActive)
          .map(userConfig => userConfig.config.name)
          .join('、') || '未分配配置',
        accessedAt: log.accessedAt,
      })) || []

      setRecentActivity(activities)
      setSecurityEvents(securityData.events || [])
    } catch (error) {
      console.error('Failed to fetch dashboard data', error)
      setError('概览数据加载失败，请稍后重试')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <Sparkles className="h-8 w-8 animate-pulse text-accent-primary" />
        <div className="text-sm text-foreground-secondary">正在加载运营概览…</div>
      </div>
    )
  }

  const statCards = [
    {
      title: '用户',
      value: stats.users,
      icon: Users,
      desc: '已创建账户',
      href: '/users',
    },
    {
      title: '今日访问',
      value: stats.todayAccesses,
      icon: Activity,
      desc: '订阅请求',
      href: '/monitor',
    },
    {
      title: '有效配置',
      value: stats.configs,
      icon: FileText,
      desc: '当前启用',
      href: '/configs',
    },
    {
      title: '安全告警',
      value: stats.criticalSecurityEvents + stats.warningSecurityEvents,
      icon: ShieldAlert,
      desc: `${stats.criticalSecurityEvents} 个严重事件`,
      href: '/monitor',
    },
  ]

  const quickActions = [
    { href: '/users', label: '管理用户', desc: '账户、权限和订阅链接', icon: Users },
    { href: '/configs', label: '管理配置', desc: '维护并启用 YAML 配置', icon: FileText },
    { href: '/monitor', label: '访问监控', desc: '查看流量和安全事件', icon: Activity },
    { href: '/settings', label: '系统设置', desc: '认证方式和界面设置', icon: Settings },
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-border bg-background-tertiary p-5 backdrop-blur-2xl sm:p-6 lg:p-8">
        <div className="liquid-orb right-10 top-[-5rem] h-56 w-56 bg-background-active" />
        <div className="relative z-10 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">运营概览</h1>
            <p className="mt-1 text-sm text-foreground-muted">用户、订阅和安全状态</p>
          </div>
          <Button onClick={() => void fetchData()} variant="secondary" size="icon-sm" disabled={refreshing} aria-label="刷新概览">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </section>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-accent-error bg-background-active p-3 text-sm text-accent-error">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => void fetchData()}>重试</Button>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {statCards.map(stat => {
          const Icon = stat.icon
          return (
            <Link key={stat.title} href={stat.href} className="min-w-0">
              <Card className="group h-full overflow-hidden hover:-translate-y-0.5 hover:border-border-hover hover:shadow-2xl">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="rounded-2xl bg-background-active p-2.5 text-accent-primary sm:p-3">
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-foreground-muted opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <div className="mt-4 text-3xl font-semibold tracking-tight sm:mt-5 sm:text-4xl">{stat.value}</div>
                  <div className="mt-1 truncate text-sm font-medium text-foreground-secondary">{stat.title}</div>
                  <div className="mt-1 truncate text-xs text-foreground-muted">{stat.desc}</div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>常用操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map(action => {
                const Icon = action.icon
                return (
                  <Link key={action.href} href={action.href} className="min-w-0">
                    <div className="flex h-full flex-col gap-3 rounded-3xl border border-border bg-background-secondary p-4 hover:bg-background-hover">
                      <div className="flex items-center justify-between">
                        <div className="rounded-2xl bg-background-active p-2.5 text-accent-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-foreground-muted" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold">{action.label}</div>
                        <div className="mt-1 line-clamp-2 text-xs text-foreground-muted">{action.desc}</div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle>最近安全事件</CardTitle>
            <Link href="/monitor" className="text-xs text-accent-primary">查看全部</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {securityEvents.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border p-6 text-center text-sm text-foreground-muted">
                暂无安全事件
              </div>
            ) : (
              securityEvents.map(event => (
                <div key={event.id} className="flex items-start gap-3 rounded-3xl bg-background-secondary p-3">
                  <div className={`mt-1 rounded-full p-1.5 ${event.severity === 'critical' || event.severity === 'error' ? 'bg-accent-error/10 text-accent-error' : 'bg-accent-warning/10 text-accent-warning'}`}>
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{event.message || eventLabels[event.type] || event.type}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-foreground-muted">
                      <span className="truncate">{event.ipAddress}</span>
                      <span>·</span>
                      <span className="shrink-0">{getRelativeTime(event.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle>最近订阅访问</CardTitle>
          <div className="flex items-center gap-2 text-xs text-foreground-muted">
            <LinkIcon className="h-3.5 w-3.5" />
            {stats.subscriptions} 条订阅
          </div>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border p-6 text-center text-sm text-foreground-muted">
              暂无订阅访问记录
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {recentActivity.map(activity => (
                <div key={activity.id} className="flex items-center gap-3 rounded-3xl bg-background-secondary p-3">
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent-success shadow-[0_0_16px_var(--color-accent-success)]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{activity.email}</div>
                    <div className="truncate text-xs text-foreground-muted">{activity.configName}</div>
                  </div>
                  <div className="shrink-0 text-xs text-foreground-muted">{getRelativeTime(activity.accessedAt)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
