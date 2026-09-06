'use client'

import { useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowUpRight, Copy, Plus, Search } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { request, useDebounced, useResource } from '@/hooks/use-workspace'
import { useUnsaved } from '@/hooks/use-unsaved'
import { accountFilters, accountState, configHref, formatDate, subscriptionUrl, type Account, type AccountList, type ProfileList } from '@/lib/workspace'
import { Action, Avatar, Confirm, Drawer, Empty, Loading, PageTitle, Pager, Pill, Problem, Refresh, Saved } from './ui'

export { useUnsaved } from '@/hooks/use-unsaved'

export async function copyAccountLink(id: string, shadowrocket = false) {
  const result = await request<{ subscription: { token: string } }>(`/api/users/${encodeURIComponent(id)}/subscription`)
  const link = subscriptionUrl(window.location.origin, result.subscription.token)
  await navigator.clipboard.writeText(shadowrocket ? `sub://${btoa(link)}` : link)
  toast.success(shadowrocket ? '已复制 Shadowrocket 导入链接' : '已复制订阅链接，请仅交给授权用户')
}
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
    <label className="o-search"><Search/><input value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} placeholder="查找要授权的配置" aria-label="查找配置"/></label>
    {resource.error && <Problem message={resource.error} retry={resource.reload}/>}
    {resource.data?.configs.map(config => <label className="o-picker-row" key={config.id}><input type="checkbox" checked={selected.includes(config.id)} onChange={() => onChange(selected.includes(config.id) ? selected.filter(id => id !== config.id) : [...selected, config.id])}/><span>{config.name}</span><small>{config.isActive ? '已启用' : '已停用'}</small></label>)}
    {resource.loading && !resource.data && <p className="o-footnote" style={{ padding: 12 }}>正在读取配置…</p>}
    {resource.data?.configs.length === 0 && <p className="o-footnote" style={{ padding: 12 }}>没有匹配配置。<Link href="/configs?new=1">先创建配置</Link></p>}
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
  const [activation, setActivation] = useState<string | null>(null)
  const [created, setCreated] = useState(false)
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
    // A keyboard submit belongs to the visible form, never a hidden account editor.
    if (tab === 'subscription') { void saveQuota(); return }
    void perform(async () => {
      const payload = { ...form, expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null }
      if (account) {
        await request(`/api/users/${account.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        toast.success('账户与授权已保存'); onChanged(); onClose()
      } else {
        const result = await request<{ activationLink: string | null }>('/api/users', { method: 'POST', body: JSON.stringify(payload) })
        setActivation(result.activationLink); setCreated(true); onChanged()
      }
    })
  }
  const copy = (rocket = false) => perform(async () => { if (account) await copyAccountLink(account.id, rocket) })
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
    <Drawer title={created ? '账户已准备好' : account ? account.email : '创建订阅账户'} description={account ? '查看授权、分配配置，或处理订阅访问条件。' : '先确定谁可以用，再决定可以用什么。'} onClose={close}>
      {created ? <div className="o-drawer-body">
        <Saved>账户已创建，授权配置已保存。</Saved>
        {activation ? <><div className="o-insight"><h3>把激活链接交给用户</h3><p>用户通过它设置自己的登录密码。链接包含访问凭据，请私下发送。</p></div><div className="o-activation-link">{activation}</div><Action variant="primary" onClick={() => { void navigator.clipboard.writeText(activation).then(() => toast.success('已复制激活链接')).catch(() => toast.error('复制失败，请手动选中链接复制')) }}><Copy/>复制激活链接</Action></> : <p className="o-description" style={{ marginTop: 20 }}>管理员可使用刚才设置的邮箱与密码登录。</p>}
        <div className="o-actions" style={{ marginTop: 28 }}><Action onClick={onClose}>完成</Action></div>
      </div> : <>
        <div className="o-tabs" style={{ padding: '14px 26px 0' }} aria-label="账户详情视图"><button type="button" disabled={busy} aria-pressed={tab === 'access'} onClick={() => changeTab('access')}>账户与授权</button>{account?.subscription && <button type="button" disabled={busy} aria-pressed={tab === 'subscription'} onClick={() => changeTab('subscription')}>链接与额度</button>}</div>
        <form onSubmit={submit} className="o-drawer-form" aria-label={tab === 'access' ? '账户与授权' : '订阅额度'} aria-busy={busy}>
          <div className="o-drawer-body">
            {error && <Problem message={error}/>}
            {tab === 'access' ? <>
              <label className="o-field"><span>账户邮箱</span><input className="o-input" type="email" required autoComplete="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} disabled={busy}/></label>
              <div className="o-form-grid"><label className="o-field"><span>账户角色</span><select className="o-select" value={form.role} onChange={event => setForm({ ...form, role: event.target.value as Account['role'] })} disabled={busy}><option value="user">订阅用户</option><option value="admin">管理员</option></select></label><label className="o-field"><span>有效期至（本地时间）</span><input className="o-input" type="datetime-local" step="1" value={form.expiresAt} onChange={event => setForm({ ...form, expiresAt: event.target.value })} disabled={busy}/><small>留空表示长期有效。</small></label></div>
              {(form.role === 'admin' || account) && <label className="o-field" style={{ marginTop: 19 }}><span>{account ? '重设密码（可选）' : '管理员密码'}</span><input className="o-input" type="password" autoComplete="new-password" minLength={12} maxLength={128} required={!account && form.role === 'admin'} value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} disabled={busy}/><small>{account ? '留空保留原密码；设置新密码会撤销现有会话。' : '至少 12 个字符。普通用户通过激活链接自行设置。'}</small></label>}
              <section className="o-form-section"><h3>允许使用的配置</h3><fieldset disabled={busy}><ProfilePicker selected={form.configIds} onChange={configIds => setForm({ ...form, configIds })}/></fieldset>{account && account.userConfigs.length > 0 && <div className="o-profile-links" style={{ maxWidth: '100%', marginTop: 12 }}>{account.userConfigs.map(({ config }) => <Link key={config.id} href={configHref(config.id)}>{config.name}<ArrowUpRight size={11}/></Link>)}</div>}</section>
              {account && <section className="o-form-section"><h3>账户控制</h3><p className="o-footnote">更改状态会撤销登录会话。{dirty ? '请先保存或放弃上方修改，再操作状态。' : '订阅权限始终由服务端校验。'}</p><div className="o-actions" style={{ marginTop: 12 }}><Action disabled={dirty || busy} onClick={() => setConfirm('pause')}>{account.isActive ? '停用账户' : '恢复账户'}</Action><Action disabled={dirty || busy} onClick={() => setConfirm('ban')}>{account.isBanned ? '解除封禁' : '封禁账户'}</Action><Action variant="quiet" disabled={dirty || busy} onClick={() => setConfirm('delete')}>删除账户</Action></div></section>}
            </> : account?.subscription && <>
              <Pill tone={accountState(account).tone}>{accountState(account).label}</Pill>
              <div className="o-insight"><h3>交付给用户，而不是公开分享</h3><p>订阅链接默认长期有效。复制不会消耗额度；直接打开订阅地址会计入访问次数。</p></div>
              <div className="o-actions"><Action onClick={() => void copy()} disabled={busy}><Copy/>复制订阅链接</Action><Action onClick={() => void copy(true)} disabled={busy}>复制 Shadowrocket 链接</Action></div>
              <section className="o-form-section"><h3>访问额度</h3><dl className="o-facts"><div><dt>已使用</dt><dd>{account.subscription.accessCount.toLocaleString()} 次</dd></div><div><dt>链接更新于</dt><dd>{formatDate(account.subscription.tokenRotatedAt, true)}</dd></div></dl><label className="o-field" style={{ marginTop: 18 }}><span>允许的总访问次数</span><input className="o-input" type="number" required min="0" max="2147483647" step="1" value={quota} onChange={event => setQuota(event.target.value)} disabled={busy}/><small>0 表示不限制。这里调整总上限，不会清空已使用次数。</small></label><Action type="submit" disabled={busy || formDirty} variant="primary">{busy ? '正在处理…' : '保存额度'}</Action></section>
              <section className="o-form-section"><h3>链接需要更换时</h3><p className="o-footnote">旧链接会立即失效，访问次数与额度保持不变。</p><Action disabled={busy || dirty} onClick={() => setConfirm('rotate')} style={{ marginTop: 12 }}>更换订阅链接</Action></section>
            </>}
          </div>
          <footer className="o-drawer-footer"><Action onClick={close} disabled={busy}>关闭</Action>{tab === 'access' ? <Action type="submit" variant="primary" disabled={busy}>{busy ? '正在保存…' : account ? '保存修改' : '创建账户'}</Action> : account && <Link href={`/monitor?userId=${account.id}`} className="o-button">查看访问记录<ArrowUpRight/></Link>}</footer>
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

export function AccountsPage() {
  const params = useSearchParams()
  const router = useRouter()
  const filter = params.get('filter') || 'all'
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [copying, setCopying] = useState<string | null>(null)
  const search = useDebounced(query)
  const resource = useResource<AccountList>(`/api/workspace?view=accounts&filter=${encodeURIComponent(filter)}&page=${page}&q=${encodeURIComponent(search)}`)
  const navigate = (key: string, value?: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); router.push(`/users?${next}`) }
  const close = () => { const next = new URLSearchParams(params); next.delete('account'); next.delete('new'); router.replace(`/users?${next}`, { scroll: false }) }
  const copy = async (id: string) => {
    if (copying) return
    setCopying(id)
    try { await copyAccountLink(id) }
    catch (error) { toast.error(error instanceof Error ? error.message : '复制失败，请检查剪贴板权限') }
    finally { setCopying(null) }
  }
  return <div className="o-page">
    <PageTitle eyebrow="PEOPLE & ACCESS" title="连接，从授权开始。" description="谁可以使用、还能用多久、拿到哪份配置，在这里清清楚楚。" actions={<><Refresh loading={resource.loading} onClick={resource.reload}/><Action variant="primary" onClick={() => navigate('new', '1')}><Plus/>创建账户</Action></>}/>
    <div className="o-toolbar"><div className="o-tabs" aria-label="账户筛选">{accountFilters.slice(0, 3).map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => { setPage(1); navigate('filter', key) }}>{label}</button>)}</div><label className="o-search"><Search/><input aria-label="搜索账户邮箱" placeholder="搜索邮箱…" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }}/></label><select aria-label="更多账户筛选" className="o-filter-select" value={filter} onChange={event => { setPage(1); navigate('filter', event.target.value) }}>{accountFilters.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
    {resource.error && <Problem message={resource.error} retry={resource.reload}/>}
    {resource.loading && !resource.data ? <Loading/> : resource.data && <>
      {resource.data.users.length ? <div className="o-table-wrap"><table className="o-table"><thead><tr><th>账户</th><th>访问条件</th><th>配置授权</th><th>访问次数</th><th>操作</th></tr></thead><tbody>{resource.data.users.map(account => {
        const state = accountState(account, new Date(resource.data!.asOf).getTime())
        return <tr key={account.id}>
          <td><div className="o-person"><Avatar name={account.email}/><div className="o-person-copy"><button type="button" className="o-text-link" onClick={() => navigate('account', account.id)}>{account.email}</button><small>{account.role === 'admin' ? '管理员' : '订阅用户'} · {formatDate(account.expiresAt)}</small></div></div></td>
          <td data-label="访问条件"><Pill tone={state.tone}>{state.label}</Pill><span className="o-cell-secondary">{state.detail}</span></td>
          <td data-label="配置授权"><div className="o-profile-links">{account.userConfigs.length ? account.userConfigs.slice(0, 2).map(({ config }) => <Link key={config.id} href={configHref(config.id)}>{config.name}{!config.isActive && '（停用）'}</Link>) : <span className="o-muted">尚未分配</span>}{account.userConfigs.length > 2 && <button type="button" className="o-text-link" onClick={() => navigate('account', account.id)}>+{account.userConfigs.length - 2}</button>}</div></td>
          <td data-label="访问次数">{account.subscription ? <><span>{account.subscription.accessCount.toLocaleString()} / {account.subscription.maxAccess === 0 ? '不限' : account.subscription.maxAccess.toLocaleString()}</span>{account.subscription.maxAccess > 0 && <span className="o-meter" aria-hidden="true"><i style={{ width: `${Math.min(100, account.subscription.accessCount / account.subscription.maxAccess * 100)}%` }}/></span>}</> : <span className="o-muted">无订阅</span>}</td>
          <td><div className="o-row-actions">{account.subscription && <Action variant="quiet" aria-label={`复制 ${account.email} 的订阅链接`} title="复制订阅链接" disabled={copying !== null} onClick={() => void copy(account.id)}><Copy/></Action>}<Action variant="quiet" aria-label={`管理 ${account.email}`} onClick={() => navigate('account', account.id)}><ArrowUpRight/></Action></div></td>
        </tr>
      })}</tbody></table></div> : <Empty title={search ? '没有找到这个账户' : filter === 'all' ? '还没有订阅账户' : '这个筛选下没有账户'} description={search ? '换一个邮箱关键词再试试。' : filter === 'all' ? '创建账户、分配配置，然后交付订阅链接。' : '可以切换到全部账户，查看完整列表。'} action={<Action onClick={() => { setPage(1); if (search) setQuery(''); else navigate(filter === 'all' ? 'new' : 'filter', filter === 'all' ? '1' : 'all') }}>{search ? '清空搜索' : filter === 'all' ? '创建账户' : '查看全部'}</Action>}/>}
      <Pager pagination={resource.data.pagination} onPage={setPage}/>
    </>}
    {params.get('account') && <AccountLoader key={params.get('account')} id={params.get('account')!} onClose={close} onChanged={resource.reload}/>}
    {params.has('new') && !params.has('account') && <AccountEditor account={null} onClose={close} onChanged={resource.reload}/>}
  </div>
}
