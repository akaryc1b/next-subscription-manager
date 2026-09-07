'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Fingerprint, Github, KeyRound, Laptop, Palette, ShieldCheck, UserRound } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { authClient } from '@/lib/auth-client'
import { useTheme } from '@/components/theme-provider'
import { request, useResource } from '@/hooks/use-workspace'
import { useUnsaved } from '@/hooks/use-unsaved'
import { formatDate } from '@/lib/workspace'
import { Action, Avatar, Confirm, Loading, PageTitle, Pill, Problem, Refresh } from './ui'
import { authMessage, PasswordField, usePasskeySupport } from './auth-ui'

type Method = { type: 'password' | 'passkey' | 'github'; enabled: boolean; createdAt: string }
type LoginSession = { id: string; token: string; createdAt: Date | string; expiresAt: Date | string; ipAddress?: string | null; userAgent?: string | null }
const methodLabels = { password: '邮箱与密码', passkey: '通行密钥', github: 'GitHub' }
function Section({ id, number, title, description, children }: { id: string; number: string; title: string; description: string; children: ReactNode }) {
  return <section id={id} className="p-setting-section"><header><p className="o-eyebrow">{number}</p><h2>{title}</h2><p>{description}</p></header><div className="p-setting-content">{children}</div></section>
}
function sessionLabel(agent: string | null | undefined) {
  if (!agent) return '未记录客户端'
  const os = /iPhone|iPad/.test(agent) ? 'iOS' : /Android/.test(agent) ? 'Android' : /Windows/.test(agent) ? 'Windows' : /Macintosh/.test(agent) ? 'macOS' : /Linux/.test(agent) ? 'Linux' : ''
  const browser = /Edg\//.test(agent) ? 'Edge' : /Firefox\//.test(agent) ? 'Firefox' : /Chrome\//.test(agent) ? 'Chrome' : /Safari\//.test(agent) ? 'Safari' : '其他客户端'
  return os ? `${browser} · ${os}` : browser
}

function SessionSettings({ currentSessionId, revision }: { currentSessionId: string; revision: number }) {
  const [sessions, setSessions] = useState<LoginSession[] | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [target, setTarget] = useState<LoginSession | 'others' | null>(null)
  const generation = useRef(0)
  const load = useCallback(async () => {
    const version = ++generation.current
    setLoading(true)
    setError('')
    try {
      const result = await authClient.listSessions()
      if (result.error) throw new Error('暂时无法读取登录会话，请重试。')
      if (version === generation.current) setSessions(result.data || [])
    } catch (reason) {
      if (version === generation.current) setError(reason instanceof Error ? reason.message : '读取会话失败')
    } finally {
      if (version === generation.current) setLoading(false)
    }
  }, [])
  useEffect(() => { void load(); return () => { generation.current++ } }, [load, revision])
  const others = sessions?.filter(session => session.id !== currentSessionId) || []
  return <>
    {error && <Problem message={error} retry={() => void load()}/>}
    {loading && !sessions ? <Loading/> : sessions?.map(session => <div className="p-setting-row" key={session.id}>
      <Laptop/><div><strong>{sessionLabel(session.userAgent)}</strong><p>登录于 {formatDate(new Date(session.createdAt).toISOString(), true)}<br/>来源 {session.ipAddress || '未记录'} · 到期 {formatDate(new Date(session.expiresAt).toISOString())}</p></div>
      {session.id === currentSessionId ? <Pill tone="good">当前会话</Pill> : <Action disabled={loading} onClick={() => setTarget(session)}>退出此会话</Action>}
    </div>)}
    {sessions?.length === 0 && <p className="o-description">没有返回有效会话记录，请刷新确认。</p>}
    <div className="o-actions"><Refresh loading={loading} onClick={() => void load()}/><Action disabled={loading || Boolean(error) || others.length === 0} onClick={() => setTarget('others')}>退出其他会话</Action></div>
    <p className="o-footnote">按登录记录识别浏览器，不代表设备当前在线。退出其他会话不会退出这里。</p>
    {target && <Confirm title={target === 'others' ? '退出其他登录会话？' : '退出这个登录会话？'} description="对应浏览器需要重新登录才能继续使用。当前会话将保留。" confirmLabel="确认退出" onClose={() => setTarget(null)} onConfirm={async () => {
      const result = target === 'others' ? await authClient.revokeOtherSessions() : await authClient.revokeSession({ token: target.token })
      if (result.error) throw new Error('会话退出未完成，请刷新后重试。')
      toast.success('所选会话已退出')
      await load()
    }}/>} 
  </>
}

export function AccountSettings({ user, currentSessionId, githubEnabled, callbackError }: { user: { id: string; email: string; name: string }; currentSessionId: string; githubEnabled: boolean; callbackError: boolean }) {
  const router = useRouter()
  const { mode, setMode } = useTheme()
  const passkeySupported = usePasskeySupport()
  const methods = useResource<{ methods: Method[] }>(`/api/users/${user.id}/auth-methods`)
  const [name, setName] = useState(user.name)
  const [savedName, setSavedName] = useState(user.name)
  const [error, setError] = useState(callbackError ? 'GitHub 绑定未完成，请重新尝试。' : '')
  const [busy, setBusy] = useState<string | null>(null)
  const [unlink, setUnlink] = useState<Method['type'] | null>(null)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [sessionRevision, setSessionRevision] = useState(0)
  const pending = useRef(false)
  const nameDirty = name !== savedName
  const passwordDirty = Boolean(currentPassword || newPassword || confirmPassword)
  useUnsaved(nameDirty || passwordDirty)
  const enabled = new Set(methods.data?.methods.filter(method => method.enabled).map(method => method.type))

  const run = async (key: string, action: () => Promise<void>) => {
    if (pending.current) return
    pending.current = true
    setBusy(key)
    setError('')
    try { await action() }
    catch (reason) { setError(reason instanceof Error && reason.name === 'NotAllowedError' ? '设备验证已取消，可以重新尝试。' : reason instanceof Error ? reason.message : '操作未完成，请重试。') }
    finally { pending.current = false; setBusy(null) }
  }
  const saveName = (event: FormEvent) => {
    event.preventDefault()
    void run('name', async () => {
      const value = name.trim()
      if (!value || value.length > 80) throw new Error('显示名称需要 1 到 80 个字符。')
      const result = await authClient.updateUser({ name: value })
      if (result.error) throw new Error(authMessage(result.error, '名称未保存，请重试。'))
      setName(value)
      setSavedName(value)
      toast.success('显示名称已保存')
      router.refresh()
    })
  }
  const changePassword = (event: FormEvent) => {
    event.preventDefault()
    void run('password', async () => {
      if (newPassword.length < 12 || newPassword.length > 128) throw new Error('新密码需要 12 到 128 个字符。')
      if (newPassword !== confirmPassword) throw new Error('两次输入的新密码不一致。')
      const result = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true })
      if (result.error) throw new Error(authMessage(result.error, '密码未更新，请核对当前密码后重试。'))
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordOpen(false)
      setSessionRevision(value => value + 1)
      toast.success('密码已更新，其他登录会话已退出')
      router.refresh()
    })
  }
  const bind = (type: 'passkey' | 'github') => void run(type, async () => {
    if (nameDirty || passwordDirty) throw new Error('请先保存或撤销当前修改，再绑定登录方式。')
    const result = type === 'passkey'
      ? await authClient.passkey.addPasskey({ name: '我的通行密钥' })
      : await authClient.linkSocial({ provider: 'github', callbackURL: '/settings' })
    if (result.error) throw new Error(authMessage(result.error, `${methodLabels[type]}绑定未完成，请重试。`))
    if (type === 'passkey') { toast.success('通行密钥已添加'); methods.reload() }
  })

  return <div className="o-page p-settings">
    <PageTitle eyebrow="MAKE YOURSELF AT HOME" title="工作空间，也有你的习惯。" description="管理身份与登录安全，选择看着舒服的界面。"/>
    {error && <Problem message={error}/>}
    <nav className="p-settings-nav" aria-label="设置分区"><a href="#identity"><UserRound/>个人资料</a><a href="#authentication"><ShieldCheck/>登录方式</a><a href="#sessions"><Laptop/>登录会话</a><a href="#appearance"><Palette/>外观</a></nav>
    <Section id="identity" number="01 / IDENTITY" title="你的身份" description="显示名称会用于工作空间中的身份展示，不会改变登录邮箱。">
      <div className="p-identity"><Avatar name={savedName || user.email}/><div><strong>{savedName || '管理员'}</strong><small>{user.email}</small></div><Pill tone="accent">管理员</Pill></div>
      <form onSubmit={saveName} aria-label="修改显示名称"><div className="o-field"><label htmlFor="profile-name">显示名称</label><input id="profile-name" className="o-input" required maxLength={80} value={name} onChange={event => setName(event.target.value)} disabled={busy !== null}/></div><div className="o-actions"><Action type="submit" variant="primary" disabled={!nameDirty || busy !== null}>{busy === 'name' ? '正在保存…' : '保存名称'}</Action>{nameDirty && <Action disabled={busy !== null} onClick={() => setName(savedName)}>撤销修改</Action>}</div></form>
    </Section>
    <Section id="authentication" number="02 / SIGN IN" title="登录方式" description="优先保留一种可靠的登录方式，再添加更顺手的选择。">
      {methods.error && <Problem message={methods.error} retry={methods.reload}/>}
      {methods.loading && !methods.data ? <Loading/> : methods.data && <>
        {(['password', 'passkey', 'github'] as const).map(type => {
          const Icon = type === 'password' ? KeyRound : type === 'passkey' ? Fingerprint : Github
          const active = enabled.has(type)
          return <div className="p-setting-row" key={type}><Icon/><div><strong>{methodLabels[type]}</strong><p>{active ? '已绑定' : type === 'github' && !githubEnabled ? '当前部署未配置 GitHub 登录' : type === 'passkey' && passkeySupported === false ? '当前浏览器或连接环境不支持' : '尚未绑定'}</p></div>
            {active ? <Action disabled={busy !== null || methods.loading || Boolean(methods.error) || enabled.size <= 1 || nameDirty || passwordDirty} onClick={() => setUnlink(type)}>{enabled.size <= 1 ? '保留此方式' : '解除绑定'}</Action> : type !== 'password' && <Action disabled={busy !== null || methods.loading || Boolean(methods.error) || (type === 'github' ? !githubEnabled : passkeySupported !== true)} onClick={() => bind(type)}>{busy === type ? '正在验证…' : type === 'passkey' ? '添加密钥' : '绑定 GitHub'}</Action>}
          </div>
        })}
        {enabled.has('password') && <div className="o-actions"><Action disabled={busy !== null} onClick={() => setPasswordOpen(value => !value)}>{passwordOpen ? '收起密码设置' : '修改密码'}</Action></div>}
      </>}
      {passwordOpen && <form onSubmit={changePassword} aria-label="修改密码" className="o-form-section">
        <PasswordField id="current-password" label="当前密码" autoComplete="current-password" required value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} disabled={busy !== null}/>
        <PasswordField id="new-password" label="新密码" autoComplete="new-password" required minLength={12} maxLength={128} value={newPassword} onChange={event => setNewPassword(event.target.value)} disabled={busy !== null}/>
        <PasswordField id="confirm-new-password" label="确认新密码" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} disabled={busy !== null}/>
        <p className="o-footnote">更新密码会退出其他登录会话，当前会话保留。</p><div className="o-actions"><Action type="submit" variant="primary" disabled={busy !== null}>{busy === 'password' ? '正在更新…' : '更新密码'}</Action><Action disabled={busy !== null} onClick={() => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordOpen(false) }}>取消修改</Action></div>
      </form>}
    </Section>
    <Section id="sessions" number="03 / SESSIONS" title="登录会话" description="核对登录时间与来源；发现不熟悉的会话时，主动退出。"><SessionSettings currentSessionId={currentSessionId} revision={sessionRevision}/></Section>
    <Section id="appearance" number="04 / APPEARANCE" title="看着舒服，就很好。" description="选择此浏览器的显示模式，核心布局和操作保持一致。"><div className="p-theme-choices">{(['light', 'dark'] as const).map(value => <button className="p-theme-choice" data-mode={value} key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)}><span className="p-theme-preview" aria-hidden="true"><i/><div><b/><b/><b/></div></span><span>{value === 'light' ? '明亮 · 日间' : '深色 · 夜间'}{mode === value && <Check aria-hidden="true"/>}</span></button>)}</div><p className="o-footnote">动画遵循系统的“减少动态效果”设置。</p></Section>
    {unlink && <Confirm title={`解除${methodLabels[unlink]}绑定？`} description={unlink === 'passkey' ? '这会移除此账户的全部通行密钥。请先确认另一个登录方式可以使用。' : '以后无法再用这种方式登录。请先确认其他已绑定的方式可以使用。'} confirmLabel="解除绑定" onClose={() => setUnlink(null)} onConfirm={async () => {
      await request(`/api/users/${user.id}/auth-methods/${unlink}`, { method: 'DELETE' })
      toast.success('登录方式已解除绑定')
      methods.reload()
    }}/>} 
  </div>
}
