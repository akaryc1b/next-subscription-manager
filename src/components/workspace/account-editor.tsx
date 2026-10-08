'use client'

import { useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Search } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { request, useDebounced, useResource } from '@/hooks/use-workspace'
import { useUnsaved } from '@/hooks/use-unsaved'
import { accountState, configHref, formatDate, type Account, type AccountList, type ProfileList } from '@/lib/workspace'
import { expiryToISOString, localDateTime, parseAccessQuota } from '@/lib/account-expiry'
import { AccountExpiryField } from './account-expiry-field'
import { copyAccountLink } from './subscription-link'
import { SubscriptionActions } from './subscription-actions'
import { Action, Confirm, Drawer, Empty, Loading, Pager, Pill, Problem, Saved } from './ui'

export function ProfilePicker({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const search = useDebounced(query)
  const resource = useResource<ProfileList>(`/api/workspace?view=configs&pageSize=10&page=${page}&q=${encodeURIComponent(search)}`)
  return <div className="o-config-picker">
    <label className="o-search"><Search/><input value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} onKeyDown={event => {
      if (event.key === 'Enter' && !event.nativeEvent.isComposing) event.preventDefault()
    }} placeholder="查找要授权的配置" aria-label="查找配置"/></label>
    {resource.error && <Problem message={resource.error} retry={resource.reload}/>}
    {resource.data?.configs.map(config => <label className="o-picker-row" key={config.id}><input type="checkbox" checked={selected.includes(config.id)} onChange={() => onChange(selected.includes(config.id) ? selected.filter(id => id !== config.id) : [...selected, config.id])}/><span>{config.name}</span><small>{config.isActive ? '已启用' : '已停用'}</small></label>)}
    {resource.loading && !resource.data && <p className="o-footnote" style={{ padding: 12 }}>正在读取配置…</p>}
    {resource.data?.configs.length === 0 && <p className="o-footnote" style={{ padding: 12 }}>没有匹配配置。<Link prefetch={false} href="/configs?new=1">先创建配置</Link></p>}
    {resource.data && resource.data.pagination.pageCount > 1 && <Pager pagination={resource.data.pagination} onPage={setPage}/>}
    <div className="o-pager" style={{ padding: '10px 12px' }}><span>已选择 {selected.length} 份；停用配置不会分发。</span>{selected.length > 0 && <Action variant="quiet" onClick={() => onChange([])}>清空选择</Action>}</div>
  </div>
}

type AccountForm = { email: string; role: Account['role']; password: string; expiresAt: string; configIds: string[] }
type SavedUser = Pick<Account, 'id' | 'email' | 'role' | 'expiresAt'> & { userConfigs: { configId: string }[]; subscription?: Account['subscription'] }
const sameIds = (a: string[], b: string[]) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())

function AccountEditor({ account, onClose, onChanged }: { account: Account | null; onClose: () => void; onChanged: () => void }) {
  const [baseline, setBaseline] = useState<AccountForm>(() => ({ email: account?.email || '', role: account?.role || 'user', password: '', expiresAt: localDateTime(account?.expiresAt || null), configIds: account?.userConfigs.map(item => item.configId) || [] }))
  const [form, setForm] = useState(baseline)
  const [savedQuota, setSavedQuota] = useState(String(account?.subscription?.maxAccess ?? 20))
  const [quota, setQuota] = useState(savedQuota)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // Retain a successful POST immediately, even if the following quota PATCH fails.
  const [created, setCreated] = useState<{ id: string; role: Account['role'] } | null>(null)
  const [handoff, setHandoff] = useState(false)
  const [saved, setSaved] = useState(false)
  const [confirm, setConfirm] = useState<'discard' | 'pause' | 'ban' | 'delete' | 'rotate' | null>(null)
  const pending = useRef(false)
  const body = useRef<HTMLDivElement>(null)
  const quotaSection = useRef<HTMLElement>(null)
  const id = created?.id || account?.id
  const hasQuota = !account || Boolean(account.subscription)
  const formDirty = form.email !== baseline.email || form.role !== baseline.role || Boolean(form.password) || form.expiresAt !== baseline.expiresAt || !sameIds(form.configIds, baseline.configIds)
  const quotaDirty = hasQuota && quota !== savedQuota
  const dirty = formDirty || quotaDirty
  useUnsaved(dirty || busy)
  const edit = (next: AccountForm) => { setForm(next); setSaved(false) }
  const close = () => {
    if (pending.current) return
    if (dirty) setConfirm('discard')
    else onClose()
  }
  const perform = async (operation: () => Promise<void>) => {
    if (pending.current) return
    pending.current = true; setBusy(true); setError('')
    try { await operation() }
    catch (reason) { setError(reason instanceof Error ? reason.message : '操作未完成，请重试。') }
    finally { pending.current = false; setBusy(false) }
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    void perform(async () => {
      setSaved(false)
      // Validate both sections before the first write, not halfway through saving.
      const maxAccess = hasQuota ? parseAccessQuota(quota) : null
      const payload = { ...form, expiresAt: expiryToISOString(form.expiresAt) }
      let targetId = id
      let persistedQuota = Number(savedQuota)
      let informationSaved = false
      const checkpoint = (user: SavedUser) => {
        const next = { ...form, email: user.email, role: user.role, expiresAt: localDateTime(user.expiresAt), configIds: user.userConfigs.map(item => item.configId), password: '' }
        setBaseline(next); setForm(next)
        informationSaved = true
        onChanged()
      }
      if (!targetId) {
        const result = await request<{ user: SavedUser }>('/api/users', { method: 'POST', body: JSON.stringify(payload) })
        targetId = result.user.id
        setCreated({ id: targetId, role: result.user.role })
        persistedQuota = result.user.subscription?.maxAccess ?? persistedQuota
        setSavedQuota(String(persistedQuota))
        checkpoint(result.user)
      } else if (formDirty) {
        // Omit unchanged identity fields: avoid needless session revocation.
        const changed: Partial<typeof payload> = {}
        if (form.email !== baseline.email) changed.email = payload.email
        if (form.role !== baseline.role) changed.role = payload.role
        if (form.password) changed.password = form.password
        if (form.expiresAt !== baseline.expiresAt) changed.expiresAt = payload.expiresAt
        if (!sameIds(form.configIds, baseline.configIds)) changed.configIds = form.configIds
        const result = await request<{ user: SavedUser }>(`/api/users/${targetId}`, { method: 'PUT', body: JSON.stringify(changed) })
        if (created) setCreated({ id: targetId, role: result.user.role })
        checkpoint(result.user)
      }
      if (maxAccess !== null) {
        try {
          if (maxAccess !== persistedQuota) {
            await request(`/api/users/${targetId}/subscription`, { method: 'PATCH', body: JSON.stringify({ maxAccess }) })
            onChanged()
          }
          setSavedQuota(String(maxAccess)); setQuota(String(maxAccess))
        } catch (reason) {
          const detail = reason instanceof Error ? reason.message : '请重试。'
          throw new Error(`${informationSaved ? '账户信息已保存，但额度未保存。' : '额度未保存。'}${created || !id ? '账户已创建，重试不会重复创建。' : ''}请再次保存。${detail}`)
        }
      }
      setSaved(true)
      if (!account) setHandoff(true)
      else toast.success('账户信息与额度已保存')
      // No router navigation or panel close: retain the selected account and search.
    })
  }
  // Invoke in the original click task to preserve the iPhone clipboard gesture.
  const copy = (rocket = false) => perform(async () => { if (id && !dirty) await copyAccountLink(id, rocket) })
  const confirmInfo = {
    discard: ['放弃未保存的修改？', created ? '账户已创建。关闭只会放弃尚未保存的修改，不会删除账户。' : '尚未保存的账户、授权或额度修改将被丢弃。已经保存的部分不会撤销。', '放弃修改'],
    pause: [account?.isActive ? '停用这个账户？' : '恢复这个账户？', account?.isActive ? '该账户将无法使用订阅，现有登录会话也会被撤销。' : '恢复后仍需满足有效期、额度和配置条件。', account?.isActive ? '确认停用' : '确认恢复'],
    ban: [account?.isBanned ? '解除账户封禁？' : '封禁这个账户？', '账户权限将改变，现有登录会话会被撤销。请确认这是你的预期。', account?.isBanned ? '解除封禁' : '确认封禁'],
    delete: ['永久删除这个账户？', `将删除 ${account?.email || ''} 及其关联订阅、账户拥有的配置与访问记录。此操作不可撤销。`, '永久删除'],
    rotate: ['更换订阅链接？', '旧链接会立即失效，必须把新链接交给用户。已使用次数和访问额度不会重置。', '更换链接'],
  }
  const mutate = async () => {
    if (confirm === 'discard') { onClose(); return }
    if (!account || pending.current) return
    pending.current = true; setBusy(true)
    try {
      if (confirm === 'delete') await request(`/api/users/${account.id}`, { method: 'DELETE' })
      if (confirm === 'pause') await request(`/api/users/${account.id}`, { method: 'PUT', body: JSON.stringify({ isActive: !account.isActive }) })
      if (confirm === 'ban') await request(`/api/users/${account.id}`, { method: 'PUT', body: JSON.stringify({ isBanned: !account.isBanned }) })
      if (confirm === 'rotate') await request(`/api/users/${account.id}/subscription/reset`, { method: 'POST' })
      toast.success('操作已完成'); onChanged()
      if (confirm === 'delete') onClose()
    } finally { pending.current = false; setBusy(false) }
  }
  return <>
    <Drawer title={handoff ? '账户已准备好' : id ? baseline.email : '创建订阅账户'} description="账户信息、有效期与额度，一次保存。" onClose={close}>
      {handoff ? <div className="o-drawer-body">
        <Saved>账户已创建，授权配置已保存。</Saved>
        <p className="o-description" style={{ margin: '16px 0' }}>访问额度：{savedQuota === '0' ? '不限' : `${savedQuota} 次`}。</p>
        {error && <Problem message={error}/>}
        {baseline.role === 'user' ? <SubscriptionActions disabled={busy} onCopy={rocket => void copy(rocket)}/> : <p className="o-description">管理员可使用刚才设置的邮箱与密码登录。</p>}
        <div className="o-actions" style={{ marginTop: 24 }}><Action disabled={busy} onClick={() => setHandoff(false)}>继续编辑</Action><Action disabled={busy} onClick={close}>完成</Action></div>
      </div> : <>
        {account && <div className="o-tabs" style={{ padding: '14px 26px 0' }} aria-label="账户表单快捷定位">
          <button type="button" disabled={busy} onClick={() => body.current?.scrollTo({ top: 0 })}>账户与授权</button>
          {hasQuota && <button type="button" disabled={busy} onClick={() => quotaSection.current?.scrollIntoView({ block: 'start' })}>链接与额度</button>}
        </div>}
        <form onSubmit={submit} className="o-drawer-form" aria-label="账户与授权" aria-busy={busy}>
          <div className="o-drawer-body" ref={body}>
            {error && <Problem message={error}/>}
            {saved && !dirty && <Saved>账户信息与额度已保存，可直接复制订阅。</Saved>}
            <label className="o-field"><span>账户邮箱</span><input className="o-input" type="email" required autoComplete="email" value={form.email} onChange={event => edit({ ...form, email: event.target.value })} disabled={busy}/></label>
            <label className="o-field"><span>账户角色</span><select className="o-select" value={form.role} onChange={event => edit({ ...form, role: event.target.value as Account['role'], password: '' })} disabled={busy}><option value="user">订阅用户</option><option value="admin">管理员</option></select></label>
            {form.role === 'admin' && <label className="o-field" style={{ marginTop: 19 }}><span>{id && baseline.role === 'admin' ? '重设密码（可选）' : '管理员密码'}</span><input className="o-input" type="password" autoComplete="new-password" minLength={12} maxLength={128} required={!id || baseline.role !== 'admin'} value={form.password} onChange={event => edit({ ...form, password: event.target.value })} disabled={busy}/><small>{id && baseline.role === 'admin' ? '留空保留原密码；设置新密码会撤销现有会话。' : id ? '升级为管理员需设置新密码，原认证绑定和会话将清除。' : '至少 12 个字符，仅管理员可以登录。'}</small></label>}
            <AccountExpiryField value={form.expiresAt} onChange={expiresAt => edit({ ...form, expiresAt })} disabled={busy}/>
            {hasQuota && <section ref={quotaSection} className="o-form-section"><h3>访问额度</h3>
              {account?.subscription && <><Pill tone={accountState(account).tone}>{accountState(account).label}</Pill><dl className="o-facts"><div><dt>已使用</dt><dd>{account.subscription.accessCount.toLocaleString()} 次</dd></div><div><dt>链接更新于</dt><dd>{formatDate(account.subscription.tokenRotatedAt, true)}</dd></div></dl></>}
              <label className="o-field" style={{ marginTop: 14 }}><span>允许的总访问次数</span><input className="o-input" type="number" inputMode="numeric" required min="0" max="2147483647" step="1" value={quota} onChange={event => { setQuota(event.target.value); setSaved(false) }} disabled={busy}/><small>0 表示不限制；调整总上限不会清空已使用次数。</small></label>
              {account?.subscription && <Link prefetch={false} href={`/monitor?userId=${account.id}`} className="o-button">查看访问记录<ArrowUpRight/></Link>}
            </section>}
            <section className="o-form-section"><h3>允许使用的配置</h3><fieldset disabled={busy}><ProfilePicker selected={form.configIds} onChange={configIds => edit({ ...form, configIds })}/></fieldset>{account && account.userConfigs.length > 0 && <div className="o-profile-links" style={{ maxWidth: '100%', marginTop: 12 }}>{account.userConfigs.map(({ config }) => <Link prefetch={false} key={config.id} href={configHref(config.id)}>{config.name}<ArrowUpRight size={11}/></Link>)}</div>}</section>
            {account && <section className="o-form-section"><h3>账户控制</h3><p className="o-footnote">{dirty ? '保存上方修改后可操作账户状态。' : '更改状态会撤销登录会话。'}</p><div className="o-actions" style={{ marginTop: 12 }}><Action disabled={dirty || busy} onClick={() => setConfirm('pause')}>{account.isActive ? '停用账户' : '恢复账户'}</Action><Action disabled={dirty || busy} onClick={() => setConfirm('ban')}>{account.isBanned ? '解除封禁' : '封禁账户'}</Action><Action variant="quiet" disabled={dirty || busy} onClick={() => setConfirm('delete')}>删除账户</Action></div>{account.subscription && <Action disabled={busy || dirty} onClick={() => setConfirm('rotate')} style={{ marginTop: 12 }}>更换订阅链接</Action>}</section>}
          </div>
          <footer className="o-drawer-footer" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
            {id && hasQuota && <SubscriptionActions disabled={busy || dirty} onCopy={rocket => void copy(rocket)}/>}
            <div className="o-actions" style={{ justifyContent: 'space-between' }}><Action onClick={close} disabled={busy}>关闭</Action><Action type="submit" variant="primary" disabled={busy || (Boolean(id) && !dirty)}>{busy ? '正在处理…' : id ? '保存修改' : '创建账户'}</Action></div>
          </footer>
        </form>
      </>}
    </Drawer>
    {confirm && <Confirm title={confirmInfo[confirm][0]} description={confirmInfo[confirm][1]} confirmLabel={confirmInfo[confirm][2]} onClose={() => setConfirm(null)} onConfirm={mutate}/>}
  </>
}
function AccountLoader({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const resource = useResource<AccountList>(`/api/workspace?view=accounts&id=${encodeURIComponent(id)}`)
  if (!resource.data?.users[0]) return <Drawer title="账户详情" description="读取账户的授权与订阅条件。" onClose={onClose}><div className="o-drawer-body">{resource.error ? <Problem message={resource.error} retry={resource.reload}/> : resource.loading ? <Loading/> : <Empty title="账户不存在" description="它可能已被删除，请关闭详情并刷新列表。"/>}</div></Drawer>
  return <AccountEditor account={resource.data.users[0]} onClose={onClose} onChanged={() => { resource.reload(); onChanged() }}/>
}
export default function AccountPanel({ id, onClose, onChanged }: { id?: string; onClose: () => void; onChanged: () => void }) {
  return id ? <AccountLoader key={id} id={id} onClose={onClose} onChanged={onChanged}/> : <AccountEditor account={null} onClose={onClose} onChanged={onChanged}/>
}
