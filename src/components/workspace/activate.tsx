'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Check, Link2, ShieldCheck } from 'lucide-react'
import { request } from '@/hooks/use-workspace'
import { Action, Loading, Problem } from './ui'
import { PasswordField } from './auth-ui'

export function ActivationForm({ token }: { token: string | null }) {
  const [account, setAccount] = useState<{ email: string; displayName: string } | null>(null)
  const [loading, setLoading] = useState(Boolean(token))
  const [error, setError] = useState(token ? '' : '激活链接不完整，请重新打开管理员发送的完整链接。')
  const [revision, setRevision] = useState(0)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [complete, setComplete] = useState(false)
  const pending = useRef(false)

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    setLoading(true)
    setError('')
    setAccount(null)
    void request<{ email: string; displayName: string }>(`/api/activate/verify?token=${encodeURIComponent(token)}`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setAccount(data) })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : '验证失败，请重试。') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [token, revision])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (pending.current || !account || !token) return
    if (password.length < 12 || password.length > 128) { setError('密码需要 12 到 128 个字符。'); return }
    if (password !== confirmation) { setError('两次输入的密码不一致。'); return }
    pending.current = true
    setBusy(true)
    setError('')
    try {
      await request('/api/activate/setup', { method: 'POST', body: JSON.stringify({ token, authType: 'password', password }) })
      setPassword('')
      setConfirmation('')
      setComplete(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '激活未完成，请重试。')
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  if (loading) return <div className="p-auth-content"><p className="o-eyebrow">YOUR INVITATION</p><h1>正在确认这次邀请。</h1><Loading/></div>
  if (complete) return (
    <div className="p-auth-content p-activation-complete">
      <span className="p-complete-mark"><Check aria-hidden="true"/></span>
      <p className="o-eyebrow">YOU ARE ALL SET</p><h1>账户已激活。</h1>
      <p className="o-description">{account?.email} 的登录密码已设置。</p>
      <div className="p-next-step"><Link2/><div><h2>接下来，使用你的订阅链接。</h2><p>把管理员交付的订阅链接导入客户端即可。激活链接不是订阅链接，也不会赋予后台管理权限。</p></div></div>
      <p className="p-auth-note">还没有订阅链接？请联系邀请你的管理员。<br/>此激活链接已使用，无需再次设置密码。</p>
      <Link href="/login" className="o-button" data-variant="quiet">管理员登录入口<ArrowRight size={16}/></Link>
    </div>
  )
  if (!account) return (
    <div className="p-auth-content"><p className="o-eyebrow">INVITATION UNAVAILABLE</p><h1>这次邀请暂时无法使用。</h1><Problem message={error}/><p className="o-description">链接可能已使用或到期。请核对原始邀请，或联系管理员。</p><div className="o-actions">{token && <Action onClick={() => setRevision(value => value + 1)}>重新验证</Action>}<Link href="/login" className="o-button" data-variant="quiet">返回登录<ArrowRight size={16}/></Link></div></div>
  )
  return (
    <div className="p-auth-content">
      <p className="o-eyebrow">YOUR INVITATION</p><h1>欢迎，{account.displayName}。</h1><p className="o-description">为 <strong>{account.email}</strong> 设置账户密码。</p>
      {error && <Problem message={error}/>}
      <form onSubmit={submit} aria-label="激活账户" aria-busy={busy}>
        <PasswordField id="activate-password" label="登录密码" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} required minLength={12} maxLength={128} disabled={busy} hint="12 到 128 个字符，可使用密码管理器生成。"/>
        <PasswordField id="activate-confirm" label="确认密码" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} required minLength={12} maxLength={128} disabled={busy}/>
        <Action className="p-full" variant="primary" type="submit" disabled={busy}>{busy ? '正在激活…' : '完成激活'}<ArrowRight/></Action>
      </form>
      <p className="p-auth-note"><ShieldCheck size={16}/>激活链接仅能使用一次，请不要转发。</p>
    </div>
  )
}
