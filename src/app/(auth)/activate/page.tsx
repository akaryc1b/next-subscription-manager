'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  const [username, setUsername] = useState('')
  const [authType, setAuthType] = useState<'password' | 'passkey' | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('激活令牌无效')
      setLoading(false)
      return
    }

    fetch(`/api/activate/verify?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error)
        } else {
          setUsername(data.username)
        }
        setLoading(false)
      })
      .catch(() => {
        setError('验证失败，请稍后重试')
        setLoading(false)
      })
  }, [token])

  const handlePasswordSetup = async () => {
    if (password.length < 6) {
      setError('密码至少6个字符')
      return
    }
    if (password !== confirmPassword) {
      setError('两次密码不一致')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/activate/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          authType: 'password',
          password,
        }),
      })

      const data = await res.json()

      if (data.error) {
        setError(data.error)
        setSubmitting(false)
      } else {
        router.push('/dashboard')
      }
    } catch {
      setError('设置失败，请稍后重试')
      setSubmitting(false)
    }
  }

  const handlePasskeySetup = async () => {
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/activate/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          authType: 'passkey',
        }),
      })

      const data = await res.json()

      if (data.error) {
        setError(data.error)
        setSubmitting(false)
      } else {
        router.push('/dashboard')
      }
    } catch {
      setError('设置失败，请稍后重试')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-[400px]">
          <CardContent className="pt-6">
            <p className="text-center">验证中...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !username) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>激活失败</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-accent-error">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>欢迎，{username}</CardTitle>
          <CardDescription>请选择一种认证方式完成账户激活</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-accent-error">{error}</p>}

          {!authType && (
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={() => setAuthType('password')}
              >
                设置密码
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => setAuthType('passkey')}
              >
                使用Passkey
              </Button>
            </div>
          )}

          {authType === 'password' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少6个字符"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认密码</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={handlePasswordSetup}
                  disabled={submitting}
                >
                  {submitting ? '设置中...' : '完成设置'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setAuthType(null)}
                  disabled={submitting}
                >
                  返回
                </Button>
              </div>
            </div>
          )}

          {authType === 'passkey' && (
            <div className="space-y-4">
              <p className="text-sm text-foreground-secondary">
                点击下方按钮，使用您的设备（指纹、面容或安全密钥）创建Passkey
              </p>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={handlePasskeySetup}
                  disabled={submitting}
                >
                  {submitting ? '设置中...' : '创建Passkey'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setAuthType(null)}
                  disabled={submitting}
                >
                  返回
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ActivatePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-[400px]">
          <CardContent className="pt-6">
            <p className="text-center">加载中...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <ActivateContent />
    </Suspense>
  )
}
