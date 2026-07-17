'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, Github, Key, Layers3, Loader2, ShieldAlert } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loadingMethod, setLoadingMethod] = useState<'password' | 'passkey' | 'github' | null>(null)

  const activated = searchParams.get('activated') === '1'
  const forbidden = searchParams.get('reason') === 'forbidden'
  const loading = loadingMethod !== null

  const completeLogin = () => {
    router.replace('/dashboard')
    router.refresh()
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoadingMethod('password')

    try {
      const result = await authClient.signIn.email({ email, password })

      if (result.error) {
        setError(result.error.message || '邮箱或密码不正确')
      } else if (result.data) {
        completeLogin()
      }
    } catch {
      setError('连接失败，请稍后重试')
    } finally {
      setLoadingMethod(null)
    }
  }

  const handlePasskeyLogin = async () => {
    setError('')
    setLoadingMethod('passkey')

    try {
      const result = await authClient.signIn.passkey()

      if (result.error) {
        setError(result.error.message || 'Passkey 验证失败')
      } else if (result.data) {
        completeLogin()
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'NotSupportedError') {
        setError('当前浏览器不支持 Passkey')
      } else if (error instanceof Error && error.name === 'NotAllowedError') {
        setError('已取消 Passkey 验证')
      } else {
        setError('Passkey 验证失败')
      }
    } finally {
      setLoadingMethod(null)
    }
  }

  const handleGithubLogin = async () => {
    setError('')
    setLoadingMethod('github')

    try {
      const result = await authClient.signIn.social({
        provider: 'github',
        callbackURL: '/dashboard',
      })

      if (result?.error) {
        const errorMessage = result.error.message?.toLowerCase() || ''
        if (errorMessage.includes('user') || errorMessage.includes('account') || errorMessage.includes('signup')) {
          setError('该 GitHub 账号尚未绑定，请联系管理员')
        } else {
          setError(result.error.message || 'GitHub 登录失败')
        }
        setLoadingMethod(null)
      }
    } catch {
      setError('GitHub 登录失败')
      setLoadingMethod(null)
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <div className="liquid-orb left-[-7rem] top-[-7rem] h-80 w-80 bg-background-active sm:h-96 sm:w-96" />
      <div className="liquid-orb bottom-[-10rem] right-[-8rem] h-96 w-96 bg-background-active sm:h-[28rem] sm:w-[28rem]" />

      <div className="relative z-10 grid w-full max-w-6xl gap-6 lg:grid-cols-[1fr_28rem] lg:items-center">
        <section className="hidden lg:block">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-background-secondary px-4 py-2 text-sm text-foreground-secondary backdrop-blur-xl">
            <Layers3 className="h-4 w-4 text-accent-primary" />
            Subscription Manager
          </div>
          <h1 className="max-w-2xl text-5xl font-semibold tracking-tight text-foreground-primary">
            管理用户、配置与订阅访问。
          </h1>
        </section>

        <Card className="mx-auto w-full max-w-md">
          <CardContent className="p-5 sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-primary text-accent-foreground shadow-lg">
                <Layers3 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight">管理员登录</h2>
                <p className="text-sm text-foreground-muted">进入订阅管理后台</p>
              </div>
            </div>

            {activated && (
              <div className="mb-4 flex items-start gap-2 rounded-2xl border border-accent-success bg-background-active p-3 text-sm text-accent-success">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                账户已激活，请使用新密码登录。
              </div>
            )}

            {forbidden && (
              <div className="mb-4 flex items-start gap-2 rounded-2xl border border-accent-warning bg-background-active p-3 text-sm text-accent-warning">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                当前账号没有后台管理权限。
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div aria-live="polite" className="rounded-2xl border border-accent-error bg-background-active p-3 text-sm text-accent-error">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground-secondary">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground-secondary">密码</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loadingMethod === 'password' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    正在登录…
                  </>
                ) : '登录'}
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-foreground-muted">
              <span className="h-px flex-1 bg-border" />
              其他登录方式
              <span className="h-px flex-1 bg-border" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="outline" onClick={handlePasskeyLogin} disabled={loading}>
                {loadingMethod === 'passkey' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                Passkey
              </Button>
              <Button type="button" variant="outline" onClick={handleGithubLogin} disabled={loading}>
                {loadingMethod === 'github' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
                GitHub
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent-primary" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
