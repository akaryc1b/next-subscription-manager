'use client'

import { useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowUpRight, Plus, Search } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useDebounced, useResource } from '@/hooks/use-workspace'
import { accountFilters, accountState, configHref, formatDate, type AccountList } from '@/lib/workspace'
import { copyAccountLink } from './subscription-link'
import { SubscriptionActions } from './subscription-actions'
import { Action, Avatar, Empty, Loading, PageTitle, Pager, Pill, Problem, Refresh } from './ui'

const AccountPanel = dynamic(() => import('./account-editor'), { ssr: false, loading: () => <Loading/> })

export function AccountsPage() {
  const params = useSearchParams()
  const router = useRouter()
  const filter = params.get('filter') || 'all'
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [copying, setCopying] = useState<string | null>(null)
  const copyingRef = useRef(false)
  const search = useDebounced(query)
  const resource = useResource<AccountList>(`/api/workspace?view=accounts&filter=${encodeURIComponent(filter)}&page=${page}&q=${encodeURIComponent(search)}`)
  const navigate = (key: string, value?: string) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); router.push(`/users?${next}`) }
  const close = () => { const next = new URLSearchParams(params); next.delete('account'); next.delete('new'); router.replace(`/users?${next}`, { scroll: false }) }
  const copy = async (id: string, rocket = false) => {
    if (copyingRef.current) return
    copyingRef.current = true
    setCopying(id)
    try { await copyAccountLink(id, rocket) }
    catch (error) { toast.error(error instanceof Error ? error.message : '复制失败，请检查剪贴板权限') }
    finally { copyingRef.current = false; setCopying(null) }
  }
  return <div className="o-page">
    <PageTitle title="订阅账户" actions={<><Refresh loading={resource.loading} onClick={resource.reload}/><Action variant="primary" onClick={() => navigate('new', '1')}><Plus/>创建账户</Action></>}/>
    <div className="o-toolbar"><div className="o-tabs" aria-label="账户筛选">{accountFilters.slice(0, 3).map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => { setPage(1); navigate('filter', key) }}>{label}</button>)}</div><label className="o-search"><Search/><input aria-label="搜索账户邮箱" placeholder="搜索邮箱…" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }}/></label><select aria-label="更多账户筛选" className="o-filter-select" value={filter} onChange={event => { setPage(1); navigate('filter', event.target.value) }}>{accountFilters.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
    {resource.error && <Problem message={resource.error} retry={resource.reload}/>}
    {resource.loading && !resource.data ? <Loading/> : resource.data && <>
      {resource.data.users.length ? <div className="o-table-wrap"><table className="o-table"><thead><tr><th>账户</th><th>访问条件</th><th>配置授权</th><th>访问次数</th><th>操作</th></tr></thead><tbody>{resource.data.users.map(account => {
        const state = accountState(account, new Date(resource.data!.asOf).getTime())
        return <tr key={account.id}>
          <td><div className="o-person"><Avatar name={account.email}/><div className="o-person-copy"><button type="button" className="o-text-link" onClick={() => navigate('account', account.id)}>{account.email}</button><small>{account.role === 'admin' ? '管理员' : '订阅用户'} · {formatDate(account.expiresAt)}</small></div></div></td>
          <td data-label="访问条件"><Pill tone={state.tone}>{state.label}</Pill><span className="o-cell-secondary">{state.detail}</span></td>
          <td data-label="配置授权"><div className="o-profile-links">{account.userConfigs.length ? account.userConfigs.slice(0, 2).map(({ config }) => <Link prefetch={false} key={config.id} href={configHref(config.id)}>{config.name}{!config.isActive && '（停用）'}</Link>) : <span className="o-muted">尚未分配</span>}{account.userConfigs.length > 2 && <button type="button" className="o-text-link" onClick={() => navigate('account', account.id)}>+{account.userConfigs.length - 2}</button>}</div></td>
          <td data-label="访问次数">{account.subscription ? <><span>{account.subscription.accessCount.toLocaleString()} / {account.subscription.maxAccess === 0 ? '不限' : account.subscription.maxAccess.toLocaleString()}</span>{account.subscription.maxAccess > 0 && <span className="o-meter" aria-hidden="true"><i style={{ width: `${Math.min(100, account.subscription.accessCount / account.subscription.maxAccess * 100)}%` }}/></span>}</> : <span className="o-muted">无订阅</span>}</td>
          <td><div className="o-row-actions">{account.subscription && <SubscriptionActions compact email={account.email} disabled={copying !== null} onCopy={rocket => void copy(account.id, rocket)}/>}<Action variant="quiet" aria-label={`管理 ${account.email}`} onClick={() => navigate('account', account.id)}><ArrowUpRight/></Action></div></td>
        </tr>
      })}</tbody></table></div> : <Empty title={search ? '没有找到这个账户' : filter === 'all' ? '还没有订阅账户' : '这个筛选下没有账户'} description={search ? '换一个邮箱关键词再试试。' : filter === 'all' ? '创建账户、分配配置，然后交付订阅链接。' : '可以切换到全部账户，查看完整列表。'} action={<Action onClick={() => { setPage(1); if (search) setQuery(''); else navigate(filter === 'all' ? 'new' : 'filter', filter === 'all' ? '1' : 'all') }}>{search ? '清空搜索' : filter === 'all' ? '创建账户' : '查看全部'}</Action>}/>}
      <Pager pagination={resource.data.pagination} onPage={setPage}/>
    </>}
    {params.get('account') && <AccountPanel key={params.get('account')} id={params.get('account')!} onClose={close} onChanged={resource.reload}/>}
    {params.has('new') && !params.has('account') && <AccountPanel onClose={close} onChanged={resource.reload}/>}
  </div>
}
