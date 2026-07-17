'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, KeyRound, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function ActivateContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('激活链接无效或缺少令牌')
      setLoading(false)
      return
    }

    const controller = new AbortController()

    fetch(`/api/activate/verify?token=${encodeURIComponent(token)}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || '激活链接验证失败')
        setDisplayName(data.displayName)
        setEmail(data.email)
      })
      .catch(error => {
        if (error instanceof Error && error.name !== 'AbortError') {
          setError(error.message || '验证失败，请稍后重试')
        }
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [token])

  const handlePasswordSetup = async (event: React.FormEvent) => {
    event.preventDefault()

    if (password.length < 12) {
      setError('密码至少需要 12 个字符')
      return
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/activate/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          authType: 'password',
          password,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '设置失败，请稍后重试')
        return
      }

      router.replace(data.next || '/login?activated=1')
    } catch {
      setError('连接失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center p-4">
        <div className="flex items-center gap-3 text-sm text-foreground-secondary">
          <Loader2 className="h-5 w-5 animate-spin" />
          正在验证激活链接…
        </div>
      </div>
    )
  }

  if (error && !email) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>无法激活账户</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/login">返回登录</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <div className="liquid-orb left-[-7rem] top-[-7rem] h-72 w-72 bg-background-active" />
      <div className="liquid-orb bottom-[-8rem] right-[-7rem] h-80 w-80 bg-background-active" />

      <Card className="relative z-10 w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-primary text-accent-foreground shadow-lg">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <CardTitle>激活账户</CardTitle>
            <CardDescription className="mt-2">
              欢迎，{displayName}。为 {email} 设置登录密码。
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handlePasswordSetup} className="space-y-5">
            {error && (
              <div aria-live="polite" className="rounded-2xl border border-accent-error bg-background-active p-3 text-sm text-accent-error">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">登录密码</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                placeholder="至少 12 个字符"
                disabled={submitting}
                required
                minLength={12}
                maxLength={128}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={event => setConfirmPassword(event.target.value)}
                placeholder="再次输入密码"
                disabled={submitting}
                required
                minLength={12}
                maxLength={128}
              />
            </div>

            <div className="rounded-2xl border border-border bg-background-secondary p-3 text-xs text-foreground-muted">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent-primary" />
                <span>激活链接只能使用一次。设置完成后请使用邮箱和密码登录，之后可在设置中添加 Passkey。</span>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在激活…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  完成激活
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ActivatePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[100dvh] items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    }>
      <ActivateContent />
    </Suspense>
  )
}
