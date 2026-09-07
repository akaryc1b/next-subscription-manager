'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { useResource } from '@/hooks/use-workspace'
import { accountHref, accountState, formatDate, type Account, type AccountList } from '@/lib/workspace'
import { Avatar, Empty, Loading, PageTitle, Pager, Problem, Refresh } from './ui'

export function RenewalsPage() {
  const [filter, setFilter] = useState('expiring')
  const [page, setPage] = useState(1)
  const resource = useResource<AccountList>(`/api/workspace?view=accounts&filter=${filter}&pageSize=50&page=${page}`)
  const groups = new Map<string, Account[]>()
  for (const account of resource.data?.users || []) { const key = formatDate(account.expiresAt); groups.set(key, [...(groups.get(key) || []), account]) }
  return <div className="o-page"><PageTitle title="到期日程" actions={<Refresh loading={resource.loading} onClick={resource.reload}/>}/><div className="o-toolbar"><div className="o-tabs" aria-label="到期范围"><button type="button" aria-pressed={filter === 'expiring'} onClick={() => { setFilter('expiring'); setPage(1) }}>未来 7 天</button><button type="button" aria-pressed={filter === 'expired'} onClick={() => { setFilter('expired'); setPage(1) }}>已经到期</button></div><span className="o-footnote" style={{ margin: 0 }}>启用用户 · 本地日期</span></div>{resource.error && <Problem message={resource.error} retry={resource.reload}/>} {resource.loading && !resource.data ? <Loading/> : resource.data && <>{groups.size ? [...groups].map(([date, users]) => <section className="o-day-group" key={date}><header><strong>{new Date(users[0].expiresAt!).getDate().toString().padStart(2, '0')}</strong><span>{date}</span><span>{users.length} 个账户</span></header><div>{users.map(account => { const state = accountState(account, new Date(resource.data!.asOf).getTime()); return <div className="o-queue-row" key={account.id}><Avatar name={account.email}/><div className="o-queue-copy"><strong>{account.email}</strong><p>{state.label} · {formatDate(account.expiresAt, true)}</p></div><Link prefetch={false} href={accountHref(account.id)}>调整有效期<ArrowUpRight/></Link></div> })}</div></section>) : <Empty title={filter === 'expiring' ? '未来 7 天暂无到期' : '没有已到期的启用用户'} description=""/>}<Pager pagination={resource.data.pagination} onPage={setPage}/></>}</div>
}
