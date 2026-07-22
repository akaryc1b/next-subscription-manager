'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  Bell,
  Check,
  Database,
  Github,
  Key,
  Laptop,
  Moon,
  Palette,
  Plus,
  Shield,
  Sun,
  TerminalSquare,
  UserRound,
} from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import { Badge, EmptyState, PageHeader, Section } from '@/components/ui/saas'
import { cn } from '@/lib/utils'

interface AuthMethod {
  type: string
  enabled: boolean
  email?: string
  createdAt: string
}

const settingsNavigation = [
  { href: '#profile', label: 'Profile', description: 'Workspace identity', icon: UserRound },
  { href: '#security', label: 'Security', description: 'Authentication methods', icon: Shield },
  { href: '#appearance', label: 'Appearance', description: 'Theme preferences', icon: Palette },
  { href: '#notifications', label: 'Notifications', description: 'System delivery', icon: Bell },
  { href: '#data', label: 'Data', description: 'Storage and ownership', icon: Database },
]

function getMethodIcon(type: string) {
  switch (type) {
    case 'password':
      return Shield
    case 'passkey':
      return Key
    case 'github':
      return Github
    default:
      return Shield
  }
}

function getMethodName(type: string) {
  switch (type) {
    case 'password':
      return 'Password'
    case 'passkey':
      return 'Passkey'
    case 'github':
      return 'GitHub'
    default:
      return type
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function SettingsPage() {
  const { data: session } = authClient.useSession()
  const { mode, style, setMode, setStyle } = useTheme()
  const searchParams = useSearchParams()
  const [methods, setMethods] = useState<AuthMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchAuthMethods = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch(`/api/users/${session.user.id}/auth-methods`)
      const data = await response.json()
      if (data.error) {
        setError(data.error)
      } else {
        setMethods(data.methods)
      }
    } catch {
      setError('Failed to fetch authentication methods')
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (session?.user?.id) void fetchAuthMethods()

    const errorParam = searchParams.get('error')
    const successParam = searchParams.get('success')

    if (errorParam) {
      const errorMessages: Record<string, string> = {
        invalid_request: 'Invalid request',
        invalid_state: 'Security verification failed. Please retry.',
        not_authenticated: 'Please sign in first.',
        session_expired: 'Your session expired. Please sign in again.',
        token_exchange_failed: 'GitHub authorization failed.',
        failed_to_get_user: 'Failed to retrieve GitHub account information.',
        account_already_linked: 'This GitHub account is linked to another user.',
        callback_failed: 'Account linking failed. Please retry.',
      }
      setError(errorMessages[errorParam] || 'Operation failed')
    }

    if (successParam === 'github_linked') {
      setSuccess('GitHub account linked successfully.')
      if (session?.user?.id) void fetchAuthMethods()
    }
  }, [session?.user?.id, searchParams, fetchAuthMethods])

  const handleBindPasskey = async () => {
    setError('')
    setSuccess('')

    try {
      const { error: passkeyError } = await authClient.passkey.addPasskey()
      if (passkeyError) {
        setError(passkeyError.message || 'Passkey binding failed')
      } else {
        setSuccess('Passkey added successfully.')
        void fetchAuthMethods()
      }
    } catch (bindError: unknown) {
      if (bindError instanceof Error) {
        if (bindError.name === 'NotSupportedError') {
          setError('Your browser does not support Passkey.')
        } else if (bindError.name === 'NotAllowedError') {
          setError('Passkey setup was cancelled.')
        } else {
          setError(bindError.message || 'Passkey binding failed. Please retry.')
        }
      } else {
        setError('Passkey binding failed. Please retry.')
      }
    }
  }

  const handleBindGithub = async () => {
    setError('')
    setSuccess('')

    try {
      await authClient.linkSocial({
        provider: 'github',
        callbackURL: '/settings',
      })
    } catch {
      setError('GitHub binding failed. Please retry.')
    }
  }

  const handleUnbind = async (type: string) => {
    if (!confirm(`Unlink ${getMethodName(type)} from this account?`)) return

    try {
      const response = await fetch(`/api/users/${session?.user?.id}/auth-methods/${type}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (data.error) {
        setError(data.error)
      } else {
        setSuccess(`${getMethodName(type)} unlinked successfully.`)
        void fetchAuthMethods()
      }
    } catch {
      setError('Failed to unlink authentication method')
    }
  }

  const unboundMethods = ['passkey', 'github'].filter(
    (type) => !methods.find((method) => method.type === type)
  )

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background-secondary text-accent-primary">
          <Shield className="h-4 w-4 animate-pulse" />
        </div>
        <div className="text-sm text-foreground-muted">Loading workspace settings…</div>
      </div>
    )
  }

  return (
    <div className="saas-page">
      <PageHeader
        eyebrow="Workspace preferences"
        icon={Palette}
        title="Settings"
        description="Manage identity, authentication, appearance, and workspace-level information."
      />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-accent-error/30 bg-accent-error/10 p-4 text-sm text-accent-error">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-accent-success/30 bg-accent-success/10 p-4 text-sm text-accent-success">
          <Check className="h-4 w-4" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <aside className="h-fit border-l border-border-subtle pl-2 lg:sticky lg:top-5">
          <div className="section-label mb-2 px-2">Settings</div>
          <nav className="space-y-0.5" aria-label="Settings sections">
            {settingsNavigation.map((item) => {
              const Icon = item.icon
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-foreground-muted hover:bg-background-hover hover:text-foreground-primary"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium">{item.label}</div>
                    <div className="truncate text-[10px] text-foreground-placeholder">{item.description}</div>
                  </div>
                </a>
              )
            })}
          </nav>
        </aside>

        <div className="min-w-0 space-y-5">
          <Section
            id="profile"
            title="Profile"
            description="Identity associated with this administrative workspace."
            contentClassName="p-0"
          >
            <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary">
                <span className="text-sm font-semibold">
                  {(session?.user?.name || session?.user?.email || 'U').slice(0, 1).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-foreground-primary">
                  {session?.user?.name || 'Workspace owner'}
                </div>
                <div className="mt-0.5 truncate text-xs text-foreground-muted">{session?.user?.email}</div>
              </div>
              <Badge variant="success">Administrator</Badge>
            </div>
          </Section>

          <Section
            id="security"
            title="Security"
            description="Use any linked authentication method to access your account."
            actions={<Badge variant="success">{methods.length} linked</Badge>}
            contentClassName="p-0"
          >
            {methods.length === 0 ? (
              <EmptyState icon={Shield} title="No authentication methods found" description="At least one authentication method is required." />
            ) : (
              methods.map((method) => {
                const Icon = getMethodIcon(method.type)
                const canUnbind = methods.length > 1
                return (
                  <div key={method.type} className="data-row min-h-[60px]">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background-tertiary text-accent-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-foreground-primary">{getMethodName(method.type)}</span>
                        <Badge variant="success">Enabled</Badge>
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-foreground-muted">
                        {method.email || `Linked ${formatDate(method.createdAt)}`}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleUnbind(method.type)}
                      disabled={!canUnbind}
                      title={canUnbind ? `Unlink ${getMethodName(method.type)}` : 'The last authentication method cannot be removed'}
                    >
                      {canUnbind ? 'Unlink' : 'Required'}
                    </Button>
                  </div>
                )
              })
            )}

            {unboundMethods.length > 0 && (
              <div className="grid gap-px border-t border-border-subtle bg-border sm:grid-cols-2">
                {unboundMethods.includes('passkey') && (
                  <button
                    type="button"
                    onClick={() => void handleBindPasskey()}
                    className="flex items-center gap-3 bg-background-secondary p-4 text-left hover:bg-background-hover sm:p-5"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background-tertiary text-foreground-muted">
                      <Key className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-[13px] font-medium"><Plus className="h-3.5 w-3.5" />Add Passkey</div>
                      <div className="mt-0.5 text-[11px] text-foreground-muted">Biometric or hardware-key sign in</div>
                    </div>
                  </button>
                )}
                {unboundMethods.includes('github') && (
                  <button
                    type="button"
                    onClick={() => void handleBindGithub()}
                    className="flex items-center gap-3 bg-background-secondary p-4 text-left hover:bg-background-hover sm:p-5"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background-tertiary text-foreground-muted">
                      <Github className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-[13px] font-medium"><Plus className="h-3.5 w-3.5" />Connect GitHub</div>
                      <div className="mt-0.5 text-[11px] text-foreground-muted">Use a linked GitHub account</div>
                    </div>
                  </button>
                )}
              </div>
            )}
          </Section>

          <Section id="appearance" title="Appearance" description="Choose the interface mode and visual system.">
            <div className="space-y-5">
              <div>
                <div className="mb-2 text-xs font-medium text-foreground-secondary">Color mode</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {([
                    { value: 'light' as const, label: 'Light', description: 'Bright neutral surfaces', icon: Sun },
                    { value: 'dark' as const, label: 'Dark', description: 'Low-light workspace', icon: Moon },
                  ]).map((option) => {
                    const Icon = option.icon
                    const selected = mode === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setMode(option.value)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg border p-3.5 text-left',
                          selected ? 'border-accent-primary/45 bg-accent-primary/10' : 'border-border bg-background-secondary hover:bg-background-hover'
                        )}
                      >
                        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', selected ? 'bg-accent-primary text-white' : 'bg-background-hover text-foreground-muted')}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium">{option.label}</div>
                          <div className="mt-0.5 text-[11px] text-foreground-muted">{option.description}</div>
                        </div>
                        {selected && <Check className="h-4 w-4 text-accent-primary" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-medium text-foreground-secondary">Interface style</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {([
                    { value: 'modern' as const, label: 'SaaS', description: 'Flat panels and compact typography', icon: Laptop },
                    { value: 'terminal' as const, label: 'Terminal', description: 'Legacy monospace interface style', icon: TerminalSquare },
                  ]).map((option) => {
                    const Icon = option.icon
                    const selected = style === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setStyle(option.value)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg border p-3.5 text-left',
                          selected ? 'border-accent-primary/45 bg-accent-primary/10' : 'border-border bg-background-secondary hover:bg-background-hover'
                        )}
                      >
                        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', selected ? 'bg-accent-primary text-white' : 'bg-background-hover text-foreground-muted')}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium">{option.label}</div>
                          <div className="mt-0.5 text-[11px] text-foreground-muted">{option.description}</div>
                        </div>
                        {selected && <Check className="h-4 w-4 text-accent-primary" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </Section>

          <Section id="notifications" title="Notifications" description="Notification delivery follows the existing system configuration." contentClassName="p-0">
            <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-info/10 text-accent-info">
                <Bell className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="text-[13px] font-medium">System-managed notifications</div>
                <div className="mt-0.5 text-xs leading-5 text-foreground-muted">There are no user-configurable notification preferences in the current application.</div>
              </div>
            </div>
          </Section>

          <Section id="data" title="Data" description="Data ownership and persistence remain unchanged by this redesign." contentClassName="p-0">
            <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-success/10 text-accent-success">
                <Database className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="text-[13px] font-medium">Existing storage configuration</div>
                <div className="mt-0.5 text-xs leading-5 text-foreground-muted">No database schema, models, data structures, or retention behavior were changed.</div>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}
