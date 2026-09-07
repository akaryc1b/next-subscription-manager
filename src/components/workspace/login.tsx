'use client'

import { useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Fingerprint, Github } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Action, Problem, Saved } from './ui'
import { authMessage, PasswordField, usePasskeySupport } from './auth-ui'

export function LoginForm({ githubEnabled, forbidden, activated, callbackError }: { githubEnabled: boolean; forbidden: boolean; activated: boolean; callbackError: boolean }) {
  const router = useRouter()
  const passkeySupported = usePasskeySupport()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(callbackError ? '登录授权未完成，请重新选择登录方式。' : '')
  const [method, setMethod] = useState<'password' | 'passkey' | 'github' | null>(null)
  const pending = useRef(false)
  const busy = method !== null
  const complete = () => { router.replace('/dashboard'); router.refresh() }

  const signIn = async (kind: NonNullable<typeof method>, event?: FormEvent) => {
    event?.preventDefault()
    if (pending.current) return
    pending.current = true
    setMethod(kind)
    setError('')
    try {
      if (kind === 'password') {
        const result = await authClient.signIn.email({ email: email.trim(), password })
        if (result.error) setError(authMessage(result.error, '邮箱或密码不正确，请检查后重试。'))
        else if (result.data) complete()
        else setError('未能确认登录结果，请重新登录。')
      } else if (kind === 'passkey') {
        const result = await authClient.signIn.passkey()
        if (result.error) setError(authMessage(result.error, '通行密钥验证未完成，也可以使用密码登录。'))
        else if (result.data) complete()
        else setError('未能确认验证结果，请重试。')
      } else {
        const result = await authClient.signIn.social({ provider: 'github', callbackURL: '/dashboard', errorCallbackURL: '/login?error=oauth' })
        if (result.error) setError(authMessage(result.error, 'GitHub 登录未完成，请确认该账号已绑定。'))
      }
    } catch (reason) {
      setError(reason instanceof Error && reason.name === 'NotAllowedError'
        ? '已取消通行密钥验证，可以重新尝试或使用密码。'
        : '连接或验证未完成，请重试。')
    } finally {
      pending.current = false
      setMethod(null)
    }
  }

  return (
    <div className="p-auth-content">
      <p className="o-eyebrow">WELCOME BACK</p>
      <h1>回到你的工作空间。</h1>
      <p className="o-description">使用管理员账户继续。</p>
      {activated && <Saved>账户已激活。订阅用户无需登录管理后台，请使用管理员交付的订阅链接。</Saved>}
      {forbidden && <Problem message="此账户没有管理权限。订阅用户请使用管理员交付的订阅链接。"/>}
      {error && <Problem message={error}/>}
      <form onSubmit={event => void signIn('password', event)} aria-label="管理员登录" aria-busy={busy}>
        <div className="o-field"><label htmlFor="login-email">邮箱</label><input id="login-email" className="o-input" type="email" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} value={email} onChange={event => setEmail(event.target.value)} disabled={busy} required placeholder="admin@example.com"/></div>
        <PasswordField id="login-password" label="密码" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} disabled={busy} required placeholder="输入你的密码"/>
        <Action variant="primary" type="submit" disabled={busy} className="p-full">{method === 'password' ? '正在登录…' : '进入工作空间'}<ArrowRight/></Action>
      </form>
      <div className="p-auth-divider"><span/>或者使用已绑定的账户<span/></div>
      <div className="p-auth-alternatives">
        <Action onClick={() => void signIn('passkey')} disabled={busy || passkeySupported !== true}><Fingerprint/>{method === 'passkey' ? '等待设备验证…' : '通行密钥'}</Action>
        {githubEnabled && <Action onClick={() => void signIn('github')} disabled={busy}><Github/>{method === 'github' ? '前往授权…' : 'GitHub'}</Action>}
      </div>
      {passkeySupported === false && <p className="o-footnote">此浏览器或连接环境不支持通行密钥，请使用密码。</p>}
      <p className="p-auth-note">首次使用？请打开管理员发送的激活链接。<br/>忘记密码时，请联系另一位管理员重设。</p>
    </div>
  )
}
