'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Ban,
  CalendarClock,
  Check,
  Copy,
  CreditCard,
  Grid2X2,
  KeyRound,
  List,
  Mail,
  Pencil,
  Plus,
  Power,
  RefreshCcw,
  RefreshCw,
  Rocket,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge, EmptyState, PageHeader, StatCard } from '@/components/ui/saas'
import { cn } from '@/lib/utils'

interface User {
  id: string
  email: string
  role: string
  isActive: boolean
  isBanned: boolean
  expiresAt: string | null
  createdAt: string
  subscription?: {
    token: string
    maxAccess: number
    accessCount: number
  }
  userConfigs?: {
    configId: string
  }[]
}

interface Config {
  id: string
  name: string
  isActive: boolean
}

type PaginatedResponse<T> = {
  [key: string]: T[] | { page: number; pageSize: number; total: number; pageCount: number } | undefined
  pagination?: { page: number; pageSize: number; total: number; pageCount: number }
}

type ViewMode = 'grid' | 'list'

async function fetchAllPages<T>(
  basePath: string,
  collectionKey: string,
  params: Record<string, string> = {}
): Promise<T[]> {
  const pageSize = 100
  let page = 1
  let pageCount = 1
  const items: T[] = []

  do {
    const searchParams = new URLSearchParams({ ...params, page: String(page), pageSize: String(pageSize) })
    const response = await fetch(`${basePath}?${searchParams.toString()}`)
    if (!response.ok) throw new Error(`Failed to fetch ${collectionKey}`)

    const data = await response.json() as PaginatedResponse<T>
    items.push(...((data[collectionKey] as T[] | undefined) || []))
    pageCount = data.pagination?.pageCount || 1
    page += 1
  } while (page <= pageCount)

  return items
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getUserStatus(user: User) {
  if (user.isBanned) return { label: 'Blocked', variant: 'danger' as const }
  if (!user.isActive) return { label: 'Paused', variant: 'neutral' as const }
  if (user.expiresAt && new Date(user.expiresAt).getTime() < Date.now()) {
    return { label: 'Expired', variant: 'warning' as const }
  }
  return { label: 'Active', variant: 'success' as const }
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [configs, setConfigs] = useState<Config[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'user',
    isBanned: false,
    expiresAt: undefined as Date | undefined,
    configIds: [] as string[],
  })
  const [error, setError] = useState('')
  const [copySuccess, setCopySuccess] = useState<string | null>(null)
  const [copyRocketSuccess, setCopyRocketSuccess] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searching, setSearching] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false)
  const [subscriptionUser, setSubscriptionUser] = useState<User | null>(null)
  const [subscriptionMaxAccess, setSubscriptionMaxAccess] = useState(20)
  const [resetting, setResetting] = useState(false)

  const fetchConfigs = useCallback(async () => {
    try {
      const allConfigs = await fetchAllPages<Config>('/api/configs', 'configs')
      setConfigs(allConfigs)
    } catch (fetchError) {
      console.error('Failed to fetch configs', fetchError)
    }
  }, [])

  const fetchUsers = useCallback(async (search?: string) => {
    setRefreshing(true)
    if (search !== undefined) setSearching(true)

    try {
      const allUsers = await fetchAllPages<User>('/api/users', 'users', search ? { search } : {})
      setUsers(allUsers)
    } catch {
      setError('Failed to fetch subscription accounts')
    } finally {
      setLoading(false)
      setRefreshing(false)
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    void fetchConfigs()
  }, [fetchConfigs])

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    debounceTimer.current = setTimeout(() => {
      void fetchUsers(searchTerm || undefined)
    }, 300)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [searchTerm, fetchUsers])

  const summary = useMemo(() => {
    const active = users.filter((user) => getUserStatus(user).label === 'Active').length
    const paused = users.filter((user) => !user.isActive).length
    const blocked = users.filter((user) => user.isBanned).length
    const accesses = users.reduce((total, user) => total + (user.subscription?.accessCount || 0), 0)
    return { active, paused, blocked, accesses }
  }, [users])

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      role: 'user',
      isBanned: false,
      expiresAt: undefined,
      configIds: [],
    })
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          expiresAt: formData.expiresAt ? formData.expiresAt.toISOString() : null,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error)
        return
      }

      setDialogOpen(false)
      resetForm()
      void fetchUsers(searchTerm || undefined)
    } catch {
      setError('Failed to create subscription account')
    }
  }

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editingUser) return
    setError('')

    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          expiresAt: formData.expiresAt ? formData.expiresAt.toISOString() : null,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error)
        return
      }

      setDialogOpen(false)
      setEditingUser(null)
      resetForm()
      void fetchUsers(searchTerm || undefined)
    } catch {
      setError('Failed to update subscription account')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      await fetch(`/api/users/${id}`, { method: 'DELETE' })
      void fetchUsers(searchTerm || undefined)
    } catch {
      setError('Failed to delete subscription account')
    }
  }

  const handleToggleActive = async (user: User) => {
    try {
      await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      })
      void fetchUsers(searchTerm || undefined)
    } catch {
      setError('Failed to update account status')
    }
  }

  const copySubscriptionLink = (token: string, userId: string) => {
    const link = `${window.location.origin}/api/sub/${token}`
    void navigator.clipboard.writeText(link)
    setCopySuccess(userId)
    setTimeout(() => setCopySuccess(null), 2000)
  }

  const copyShadowrocketLink = (token: string, userId: string) => {
    const link = `${window.location.origin}/api/sub/${token}`
    const shadowrocketLink = `sub://${btoa(link)}`
    void navigator.clipboard.writeText(shadowrocketLink)
    setCopyRocketSuccess(userId)
    setTimeout(() => setCopyRocketSuccess(null), 2000)
  }

  const openSubscriptionDialog = (user: User) => {
    setSubscriptionUser(user)
    setSubscriptionMaxAccess(user.subscription?.maxAccess ?? 20)
    setSubscriptionDialogOpen(true)
  }

  const handleUpdateSubscription = async () => {
    if (!subscriptionUser) return

    try {
      const response = await fetch(`/api/users/${subscriptionUser.id}/subscription`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxAccess: subscriptionMaxAccess }),
      })
      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Update failed')
        return
      }

      setSubscriptionDialogOpen(false)
      void fetchUsers(searchTerm || undefined)
    } catch {
      setError('Failed to update subscription settings')
    }
  }

  const handleResetSubscription = async () => {
    if (!subscriptionUser) return
    if (!confirm('Reset this subscription link? The previous link will stop working immediately.')) return

    setResetting(true)
    try {
      const response = await fetch(`/api/users/${subscriptionUser.id}/subscription/reset`, {
        method: 'POST',
      })
      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Reset failed')
        return
      }

      setSubscriptionDialogOpen(false)
      void fetchUsers(searchTerm || undefined)
    } catch {
      setError('Failed to reset subscription link')
    } finally {
      setResetting(false)
    }
  }

  const openCreateDialog = () => {
    setEditingUser(null)
    resetForm()
    setError('')
    setDialogOpen(true)
  }

  const openEditDialog = (user: User) => {
    setEditingUser(user)
    setFormData({
      email: user.email,
      password: '',
      role: user.role,
      isBanned: user.isBanned,
      expiresAt: user.expiresAt ? new Date(user.expiresAt) : undefined,
      configIds: user.userConfigs?.map((userConfig) => userConfig.configId) || [],
    })
    setError('')
    setDialogOpen(true)
  }

  const toggleConfigSelection = (configId: string) => {
    setFormData((current) => ({
      ...current,
      configIds: current.configIds.includes(configId)
        ? current.configIds.filter((id) => id !== configId)
        : [...current.configIds, configId],
    }))
  }

  const renderSubscriptionActions = (user: User, compact = false) => {
    if (!user.subscription?.token) return null

    return (
      <div className={cn('grid gap-2', compact ? 'grid-cols-3' : 'grid-cols-[1fr_1fr_auto]')}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => copySubscriptionLink(user.subscription!.token, user.id)}
          className="min-w-0"
        >
          {copySuccess === user.id ? <Check className="text-accent-success" /> : <Copy />}
          {!compact && <span>{copySuccess === user.id ? 'Copied' : 'Copy link'}</span>}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => copyShadowrocketLink(user.subscription!.token, user.id)}
          className="min-w-0"
        >
          {copyRocketSuccess === user.id ? <Check className="text-accent-success" /> : <Rocket />}
          {!compact && <span>{copyRocketSuccess === user.id ? 'Copied' : 'Shadowrocket'}</span>}
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => openSubscriptionDialog(user)}
          title="Subscription settings"
          className={compact ? 'w-full' : undefined}
        >
          <Settings2 />
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-primary/10 text-accent-primary">
          <CreditCard className="h-5 w-5 animate-pulse" />
        </div>
        <div className="text-sm text-foreground-muted">Loading subscription portfolio…</div>
      </div>
    )
  }

  return (
    <div className="saas-page">
      <PageHeader
        eyebrow="Subscription portfolio"
        icon={CreditCard}
        title="Subscriptions"
        description="Manage subscription accounts, delivery links, access limits, assigned configurations, and account status."
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void fetchUsers(searchTerm || undefined)}
              disabled={refreshing}
            >
              <RefreshCw className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </Button>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus />
              New subscription
            </Button>
          </>
        }
      />

      {error && !dialogOpen && !subscriptionDialogOpen && (
        <div className="flex items-center gap-2 rounded-2xl border border-accent-error/30 bg-accent-error/8 p-4 text-sm text-accent-error">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Total subscriptions" value={users.length.toLocaleString()} description="Managed subscription accounts" icon={CreditCard} />
        <StatCard label="Active" value={summary.active.toLocaleString()} description="Available for subscription delivery" icon={ShieldCheck} tone="success" />
        <StatCard label="Accesses used" value={summary.accesses.toLocaleString()} description="Cumulative recorded usage" icon={Power} tone="info" />
        <StatCard label="Needs attention" value={(summary.paused + summary.blocked).toLocaleString()} description={`${summary.paused} paused · ${summary.blocked} blocked`} icon={AlertTriangle} tone={summary.paused + summary.blocked > 0 ? 'warning' : 'success'} />
      </section>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background-tertiary/70 p-3 shadow-sm backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search subscription email…"
            className="pl-9 pr-9"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground-primary"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {searching && <RefreshCw className="absolute right-9 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-accent-primary" />}
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-background-secondary p-1 ring-1 ring-inset ring-border/80">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            aria-pressed={viewMode === 'grid'}
          >
            <Grid2X2 />
            Grid
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            aria-pressed={viewMode === 'list'}
          >
            <List />
            List
          </Button>
        </div>
      </div>

      {users.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={searchTerm ? 'No subscriptions match your search' : 'No subscriptions yet'}
          description={searchTerm ? `No account matches “${searchTerm}”.` : 'Create the first subscription account to get started.'}
          action={searchTerm ? (
            <Button variant="secondary" size="sm" onClick={() => setSearchTerm('')}>Clear search</Button>
          ) : (
            <Button size="sm" onClick={openCreateDialog}><Plus />New subscription</Button>
          )}
        />
      ) : viewMode === 'grid' ? (
        <section className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {users.map((user) => {
            const status = getUserStatus(user)
            const assignedConfigs = user.userConfigs?.length || 0
            const maxAccess = user.subscription?.maxAccess ?? 0
            const accessCount = user.subscription?.accessCount ?? 0

            return (
              <Card key={user.id} className="group overflow-hidden hover:-translate-y-0.5 hover:border-border-hover">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary ring-1 ring-inset ring-accent-primary/15">
                        <span className="text-sm font-semibold">{user.email.slice(0, 1).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground-primary">{user.email}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge variant={status.variant}>{status.label}</Badge>
                          <Badge variant="neutral">{user.role}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button variant="ghost" size="icon-sm" onClick={() => handleToggleActive(user)} title={user.isActive ? 'Pause account' : 'Activate account'}>
                        <Power className={user.isActive ? 'text-accent-success' : undefined} />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(user)} title="Edit account">
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => void handleDelete(user.id)} title="Delete account" className="hover:text-accent-error">
                        <Trash2 />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-background-secondary/70 p-3 ring-1 ring-inset ring-border/70">
                      <div className="text-[10px] uppercase tracking-wider text-foreground-muted">Usage</div>
                      <div className="mt-1 text-sm font-semibold">{accessCount}/{maxAccess === 0 ? '∞' : maxAccess}</div>
                    </div>
                    <div className="rounded-xl bg-background-secondary/70 p-3 ring-1 ring-inset ring-border/70">
                      <div className="text-[10px] uppercase tracking-wider text-foreground-muted">Configs</div>
                      <div className="mt-1 text-sm font-semibold">{assignedConfigs}</div>
                    </div>
                    <div className="rounded-xl bg-background-secondary/70 p-3 ring-1 ring-inset ring-border/70">
                      <div className="text-[10px] uppercase tracking-wider text-foreground-muted">Renewal</div>
                      <div className="mt-1 truncate text-sm font-semibold">{user.expiresAt ? formatDate(user.expiresAt) : 'No expiry'}</div>
                    </div>
                  </div>

                  {user.subscription?.token ? (
                    <div className="mt-4">{renderSubscriptionActions(user)}</div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-border p-3 text-center text-xs text-foreground-muted">
                      Subscription link unavailable
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </section>
      ) : (
        <section className="space-y-2">
          {users.map((user) => {
            const status = getUserStatus(user)
            const maxAccess = user.subscription?.maxAccess ?? 0
            const accessCount = user.subscription?.accessCount ?? 0

            return (
              <Card key={user.id} className="overflow-hidden hover:border-border-hover">
                <CardContent className="flex flex-col gap-4 p-4 xl:flex-row xl:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{user.email}</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Badge variant={status.variant}>{status.label}</Badge>
                        <Badge variant="neutral">{user.role}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs xl:w-[25rem]">
                    <div><div className="text-foreground-muted">Usage</div><div className="mt-1 font-medium">{accessCount}/{maxAccess === 0 ? '∞' : maxAccess}</div></div>
                    <div><div className="text-foreground-muted">Configs</div><div className="mt-1 font-medium">{user.userConfigs?.length || 0}</div></div>
                    <div><div className="text-foreground-muted">Expires</div><div className="mt-1 truncate font-medium">{user.expiresAt ? formatDate(user.expiresAt) : 'Never'}</div></div>
                  </div>
                  <div className="grid grid-cols-[1fr_auto] gap-2 xl:w-[22rem]">
                    {user.subscription?.token ? renderSubscriptionActions(user, true) : <div />}
                    <div className="flex items-center gap-0.5">
                      <Button variant="ghost" size="icon-sm" onClick={() => handleToggleActive(user)}><Power className={user.isActive ? 'text-accent-success' : undefined} /></Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(user)}><Pencil /></Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => void handleDelete(user.id)} className="hover:text-accent-error"><Trash2 /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </section>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl p-0">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit subscription account' : 'Create subscription account'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={editingUser ? handleUpdate : handleCreate} className="space-y-5 p-5">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-accent-error/30 bg-accent-error/8 p-3 text-sm text-accent-error">
                <AlertTriangle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email" className="flex items-center gap-2 text-xs text-foreground-secondary">
                  <Mail className="h-3.5 w-3.5" /> Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                  placeholder="user@example.com"
                  required
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="password" className="flex items-center gap-2 text-xs text-foreground-secondary">
                  <KeyRound className="h-3.5 w-3.5" /> Password
                  <span className="font-normal text-foreground-muted">
                    {editingUser ? 'Leave blank to keep unchanged' : formData.role === 'admin' ? 'Required for admins' : 'Optional'}
                  </span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                  placeholder="••••••••••••"
                  required={!editingUser && formData.role === 'admin'}
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="flex items-center gap-2 text-xs text-foreground-secondary">
                  <ShieldCheck className="h-3.5 w-3.5" /> Role
                </Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(event) => setFormData({ ...formData, role: event.target.value })}
                  className="h-10 w-full rounded-xl border border-border bg-background-secondary px-3.5 text-sm text-foreground-primary shadow-sm focus:border-border-strong focus:outline-none focus:ring-4 focus:ring-ring"
                >
                  <option value="user">User</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs text-foreground-secondary">
                  <CalendarClock className="h-3.5 w-3.5" /> Expiration
                </Label>
                <DatePicker
                  date={formData.expiresAt}
                  onDateChange={(date) => setFormData({ ...formData, expiresAt: date })}
                  placeholder="No expiration"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-xs text-foreground-secondary">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Assigned configurations
              </Label>
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-border bg-background-secondary/70 p-2">
                {configs.length === 0 ? (
                  <p className="p-3 text-sm text-foreground-muted">No configurations available</p>
                ) : (
                  configs.map((config) => {
                    const selected = formData.configIds.includes(config.id)
                    return (
                      <button
                        key={config.id}
                        type="button"
                        onClick={() => toggleConfigSelection(config.id)}
                        className={cn(
                          'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm',
                          selected ? 'bg-accent-primary/10 text-foreground-primary' : 'hover:bg-background-hover'
                        )}
                      >
                        <span className="truncate">{config.name}</span>
                        <div className="flex items-center gap-2">
                          {!config.isActive && <Badge variant="neutral">Disabled</Badge>}
                          <span className={cn('flex h-5 w-5 items-center justify-center rounded-md border', selected ? 'border-accent-primary bg-accent-primary text-white' : 'border-border')}>
                            {selected && <Check className="h-3 w-3" />}
                          </span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, isBanned: !formData.isBanned })}
              className={cn(
                'flex w-full items-center justify-between rounded-xl border p-3 text-left',
                formData.isBanned ? 'border-accent-error/35 bg-accent-error/8' : 'border-border bg-background-secondary/60'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', formData.isBanned ? 'bg-accent-error/10 text-accent-error' : 'bg-background-hover text-foreground-muted')}>
                  <Ban className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">Block account</div>
                  <div className="mt-0.5 text-xs text-foreground-muted">Prevents all subscription access</div>
                </div>
              </div>
              <span className={cn('relative h-6 w-11 rounded-full transition-colors', formData.isBanned ? 'bg-accent-error' : 'bg-background-hover ring-1 ring-inset ring-border')}>
                <span className={cn('absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform', formData.isBanned ? 'translate-x-6' : 'translate-x-1')} />
              </span>
            </button>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingUser ? 'Save changes' : 'Create subscription'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Subscription settings</DialogTitle>
          </DialogHeader>
          {subscriptionUser && (
            <div className="space-y-4">
              <div className="rounded-xl bg-background-secondary/70 p-4 ring-1 ring-inset ring-border/80">
                <div className="text-[10px] font-medium uppercase tracking-wider text-foreground-muted">Account</div>
                <div className="mt-1 truncate text-sm font-medium text-foreground-primary">{subscriptionUser.email}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-background-secondary/70 p-4 ring-1 ring-inset ring-border/80">
                  <div className="text-[10px] uppercase tracking-wider text-foreground-muted">Current usage</div>
                  <div className="mt-2 text-xl font-semibold">{subscriptionUser.subscription?.accessCount ?? 0}</div>
                </div>
                <div className="rounded-xl bg-background-secondary/70 p-4 ring-1 ring-inset ring-border/80">
                  <div className="text-[10px] uppercase tracking-wider text-foreground-muted">Access limit</div>
                  <div className="mt-2 text-xl font-semibold">{subscriptionUser.subscription?.maxAccess === 0 ? '∞' : (subscriptionUser.subscription?.maxAccess ?? 20)}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxAccess" className="text-xs text-foreground-secondary">Maximum accesses <span className="text-foreground-muted">(0 = unlimited)</span></Label>
                <Input
                  id="maxAccess"
                  type="number"
                  min="0"
                  value={subscriptionMaxAccess}
                  onChange={(event) => setSubscriptionMaxAccess(Number.parseInt(event.target.value, 10) || 0)}
                />
              </div>

              <div className="rounded-xl border border-accent-warning/30 bg-accent-warning/5 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-accent-warning">
                  <AlertTriangle className="h-4 w-4" /> Rotate subscription link
                </div>
                <p className="mt-1.5 text-xs leading-5 text-foreground-muted">Creates a new link and invalidates the previous link immediately.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleResetSubscription()}
                  disabled={resetting}
                  className="mt-3 w-full border-accent-warning/35 text-accent-warning hover:bg-accent-warning/10"
                >
                  <RefreshCcw className={resetting ? 'animate-spin' : ''} />
                  {resetting ? 'Rotating…' : 'Rotate link'}
                </Button>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button variant="outline" onClick={() => setSubscriptionDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => void handleUpdateSubscription()}>Save settings</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
