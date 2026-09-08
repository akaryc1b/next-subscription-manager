'use client'

import { useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Search } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { request, useDebounced, useResource } from '@/hooks/use-workspace'
import { useUnsaved } from '@/hooks/use-unsaved'
import { accountState, configHref, formatDate, type Account, type AccountList, type ProfileList } from '@/lib/workspace'
import { copyAccountLink } from './subscription-link'
import { SubscriptionActions } from './subscription-actions'
import { Action, Confirm, Drawer, Empty, Loading, Pager, Pill, Problem, Saved } from './ui'

function localDateTime(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19)
}

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

function AccountEditor({ account, onClose, onChanged }: { account: Account | null; onClose: () => void; onChanged: () => void }) {
  const initial = { email: account?.email || '', role: account?.role || 'user', password: '', expiresAt: localDateTime(account?.expiresAt || null), configIds: account?.userConfigs.map(item => item.configId) || [] }
  const [form, setForm] = useState(initial)
  const [tab, setTab] = useState('access')
  const [quota, setQuota] = useState(String(account?.subscription?.maxAccess ?? 20))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<{ id: string; role: Account['role'] } | null>(null)
  const [confirm, setConfirm] = useState<'discard' | 'pause' | 'ban' | 'delete' | 'rotate' | null>(null)
  const pending = useRef(false)
  const formDirty = !created && JSON.stringify(initial) !== JSON.stringify(form)
  const quotaDirty = !created && quota !== String(account?.subscription?.maxAccess ?? 20)
  const dirty = formDirty || quotaDirty
  useUnsaved(dirty)
  const close = () => {
    if (pending.current) return
    if (dirty) setConfirm('discard')
    else onClose()
  }
  const changeTab = (next: string) => {
    if (next === tab || pending.current) return
    if (dirty) { toast.error('请先保存当前修改，或关闭编辑并确认放弃。'); return }
    setError(''); setTab(next)
  }
  const perform = async (operation: () => Promise<void>) => {
    if (pending.current) return
    pending.current = true; setBusy(true); setError('')
    try { await operation() }
    catch (reason) { setError(reason instanceof Error ? reason.message : '操作未完成，请重试。') }
    finally { pending.current = false; setBusy(false) }
  }
  const saveQuota = () => perform(async () => {
    if (!account) return
    const value = Number(quota)
    if (quota.trim() === '' || !Number.isInteger(value) || value < 0 || value > 2147483647) throw new Error('请输入 0 到 2147483647 之间的整数，0 表示不限制。')
    await request(`/api/users/${account.id}/subscription`, { method: 'PATCH', body: JSON.stringify({ maxAccess: value }) })
    toast.success('访问额度已更新'); onChanged(); onClose()
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (tab === 'subscription') { void saveQuota(); return }
    void perform(async () => {
      const payload = { ...form, expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null }
      if (account) {
        await request(`/api/users/${account.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        toast.success('账户与授权已保存'); onChanged(); onClose()
      } else {
        const result = await request<{ user: { id: string; role: Account['role'] } }>('/api/users', { method: 'POST', body: JSON.stringify(payload) })
        setCreated(result.user); setForm(value => ({ ...value, password: '' })); onChanged()
      }
    })
  }
  // perform invokes this synchronously in the click task, preserving ClipboardItem's user gesture.
  const copy = (rocket = false) => perform(async () => { const id = created?.id || account?.id; if (id) await copyAccountLink(id, rocket) })
  const confirmInfo = {
    discard: ['放弃未保存的修改？', '尚未保存的账户、授权或额度修改将被丢弃。', '放弃修改'],
    pause: [account?.isActive ? '停用这个账户？' : '恢复这个账户？', account?.isActive ? '该账户将无法使用订阅，现有登录会话也会被撤销。' : '恢复后仍需满足有效期、额度和配置条件。', account?.isActive ? '确认停用' : '确认恢复'],
    ban: [account?.isBanned ? '解除账户封禁？' : '封禁这个账户？', '账户权限将改变，现有登录会话会被撤销。请确认这是你的预期。', account?.isBanned ? '解除封禁' : '确认封禁'],
    delete: ['永久删除这个账户？', `将删除 ${account?.email || ''} 及其关联订阅、账户拥有的配置与访问记录。此操作不可撤销。`, '永久删除'],
    rotate: ['更换订阅链接？', '旧链接会立即失效，必须把新链接交给用户。已使用次数和访问额度不会重置。', '更换链接'],
  }
  const mutate = async () => {
    if (confirm === 'discard') { onClose(); return }
    if (!account) return
    if (confirm === 'delete') await request(`/api/users/${account.id}`, { method: 'DELETE' })
    if (confirm === 'pause') await request(`/api/users/${account.id}`, { method: 'PUT', body: JSON.stringify({ isActive: !account.isActive }) })
    if (confirm === 'ban') await request(`/api/users/${account.id}`, { method: 'PUT', body: JSON.stringify({ isBanned: !account.isBanned }) })
    if (confirm === 'rotate') await request(`/api/users/${account.id}/subscription/reset`, { method: 'POST' })
    toast.success('操作已完成'); onChanged(); onClose()
  }
  return <>
    <Drawer title={created ? '账户已准备好' : account ? account.email : '创建订阅账户'} description={account ? '管理授权、有效期与额度。' : '填写邮箱并分配配置。'} onClose={close}>
      {created ? <div className="o-drawer-body">
        <Saved>账户已创建，授权配置已保存。</Saved>
        {error && <Problem message={error}/>}
        {created.role === 'user' ? <>
          <p className="o-description" style={{ margin: '16px 0' }}>订阅用户无需登录，复制链接交给用户即可。</p>
          <SubscriptionActions disabled={busy} onCopy={rocket => void copy(rocket)}/>
        </> : <p className="o-description" style={{ marginTop: 20 }}>管理员可使用刚才设置的邮箱与密码登录。</p>}
        <div className="o-actions" style={{ marginTop: 24 }}><Action disabled={busy} onClick={close}>完成</Action></div>
      </div> : <>
        <div className="o-tabs" style={{ padding: '14px 26px 0' }} aria-label="账户详情视图"><button type="button" disabled={busy} aria-pressed={tab === 'access'} onClick={() => changeTab('access')}>账户与授权</button>{account?.subscription && <button type="button" disabled={busy} aria-pressed={tab === 'subscription'} onClick={() => changeTab('subscription')}>链接与额度</button>}</div>
        <form onSubmit={submit} className="o-drawer-form" aria-label={tab === 'access' ? '账户与授权' : '订阅额度'} aria-busy={busy}>
          <div className="o-drawer-body">
            {error && <Problem message={error}/>}
            {tab === 'access' ? <>
              <label className="o-field"><span>账户邮箱</span><input className="o-input" type="email" required autoComplete="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} disabled={busy}/></label>
              <div className="o-form-grid"><label className="o-field"><span>账户角色</span><select className="o-select" value={form.role} onChange={event => setForm({ ...form, role: event.target.value as Account['role'], password: '' })} disabled={busy}><option value="user">订阅用户</option><option value="admin">管理员</option></select></label><label className="o-field"><span>有效期至（本地时间）</span><input className="o-input" type="datetime-local" step="1" value={form.expiresAt} onChange={event => setForm({ ...form, expiresAt: event.target.value })} disabled={busy}/><small>留空表示长期有效。</small></label></div>
              {form.role === 'admin' && <label className="o-field" style={{ marginTop: 19 }}><span>{account?.role === 'admin' ? '重设密码（可选）' : '管理员密码'}</span><input className="o-input" type="password" autoComplete="new-password" minLength={12} maxLength={128} required={account?.role !== 'admin'} value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} disabled={busy}/><small>{account?.role === 'admin' ? '留空保留原密码；设置新密码会撤销现有会话。' : account ? '升级为管理员需设置新密码，原认证绑定和会话将清除。' : '至少 12 个字符，仅管理员可以登录。'}</small></label>}
              <section className="o-form-section"><h3>允许使用的配置</h3><fieldset disabled={busy}><ProfilePicker selected={form.configIds} onChange={configIds => setForm({ ...form, configIds })}/></fieldset>{account && account.userConfigs.length > 0 && <div className="o-profile-links" style={{ maxWidth: '100%', marginTop: 12 }}>{account.userConfigs.map(({ config }) => <Link prefetch={false} key={config.id} href={configHref(config.id)}>{config.name}<ArrowUpRight size={11}/></Link>)}</div>}</section>
              {account && <section className="o-form-section"><h3>账户控制</h3><p className="o-footnote">更改状态会撤销登录会话。{dirty ? '请先保存或放弃上方修改，再操作状态。' : '订阅权限始终由服务端校验。'}</p><div className="o-actions" style={{ marginTop: 12 }}><Action disabled={dirty || busy} onClick={() => setConfirm('pause')}>{account.isActive ? '停用账户' : '恢复账户'}</Action><Action disabled={dirty || busy} onClick={() => setConfirm('ban')}>{account.isBanned ? '解除封禁' : '封禁账户'}</Action><Action variant="quiet" disabled={dirty || busy} onClick={() => setConfirm('delete')}>删除账户</Action></div></section>}
            </> : account?.subscription && <>
              <Pill tone={accountState(account).tone}>{accountState(account).label}</Pill>
              <div className="o-insight"><h3>订阅链接</h3><p>订阅链接默认长期有效。复制不会消耗额度；直接打开订阅地址会计入访问次数。</p></div>
              <SubscriptionActions disabled={busy} onCopy={rocket => void copy(rocket)}/>
              <section className="o-form-section"><h3>访问额度</h3><dl className="o-facts"><div><dt>已使用</dt><dd>{account.subscription.accessCount.toLocaleString()} 次</dd></div><div><dt>链接更新于</dt><dd>{formatDate(account.subscription.tokenRotatedAt, true)}</dd></div></dl><label className="o-field" style={{ marginTop: 18 }}><span>允许的总访问次数</span><input className="o-input" type="number" required min="0" max="2147483647" step="1" value={quota} onChange={event => setQuota(event.target.value)} disabled={busy}/><small>0 表示不限制。这里调整总上限，不会清空已使用次数。</small></label><Action type="submit" disabled={busy || formDirty} variant="primary">{busy ? '正在处理…' : '保存额度'}</Action></section>
              <section className="o-form-section"><h3>更换链接</h3><p className="o-footnote">旧链接会立即失效，访问次数与额度保持不变。</p><Action disabled={busy || dirty} onClick={() => setConfirm('rotate')} style={{ marginTop: 12 }}>更换订阅链接</Action></section>
            </>}
          </div>
          <footer className="o-drawer-footer"><Action onClick={close} disabled={busy}>关闭</Action>{tab === 'access' ? <Action type="submit" variant="primary" disabled={busy}>{busy ? '正在保存…' : account ? '保存修改' : '创建账户'}</Action> : account && <Link prefetch={false} href={`/monitor?userId=${account.id}`} className="o-button">查看访问记录<ArrowUpRight/></Link>}</footer>
        </form>
      </>}
    </Drawer>
    {confirm && <Confirm title={confirmInfo[confirm][0]} description={confirmInfo[confirm][1]} confirmLabel={confirmInfo[confirm][2]} onClose={() => setConfirm(null)} onConfirm={mutate}/>}
  </>
}
function AccountLoader({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const resource = useResource<AccountList>(`/api/workspace?view=accounts&id=${encodeURIComponent(id)}`)
  if (!resource.data?.users[0]) return <Drawer title="账户详情" description="读取账户的授权与订阅条件。" onClose={onClose}><div className="o-drawer-body">{resource.error ? <Problem message={resource.error} retry={resource.reload}/> : resource.loading ? <Loading/> : <Empty title="账户不存在" description="它可能已被删除，请关闭详情并刷新列表。"/>}</div></Drawer>
  return <AccountEditor account={resource.data.users[0]} onClose={onClose} onChanged={onChanged}/>
}
export default function AccountPanel({ id, onClose, onChanged }: { id?: string; onClose: () => void; onChanged: () => void }) {
  return id ? <AccountLoader id={id} onClose={onClose} onChanged={onChanged}/> : <AccountEditor account={null} onClose={onClose} onChanged={onChanged}/>
}
