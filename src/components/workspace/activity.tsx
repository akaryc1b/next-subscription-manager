'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { useDebounced, useResource } from '@/hooks/use-workspace'
import { DAY, formatDate, type Activity } from '@/lib/workspace'
import { ActivityTimeline, Empty, Loading, PageTitle, Problem, Refresh } from './ui'

export function ActivityPage() {
  const params = useSearchParams()
  const [kind, setKind] = useState(params.get('kind') || 'all')
  const [range, setRange] = useState(params.has('from') ? 'custom' : params.get('range') || '7d')
  const [query, setQuery] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const search = useDebounced(query)
  const fromParam = params.get('from')
  const toParam = params.get('to')
  const userId = params.get('userId')
  const url = useMemo(() => {
    const from = range === 'custom' && fromParam ? fromParam : new Date(now - (range === '24h' ? 1 : range === '30d' ? 30 : 7) * DAY).toISOString()
    const to = range === 'custom' && toParam ? toParam : new Date(now).toISOString()
    return `/api/workspace?${new URLSearchParams({ view: 'activity', kind, from, to, q: search, ...(userId ? { userId } : {}) })}`
  }, [range, fromParam, toParam, now, kind, search, userId])
  const resource = useResource<{ items: Activity[]; asOf: string; from: string; to: string; limit: number }>(url)
  return <div className="o-page"><PageTitle eyebrow="ACTIVITY STREAM" title="发生了什么，一眼看懂。" description="先看请求结果，再沿着时间与账户追溯。技术细节只在需要时展开。" actions={<Refresh loading={resource.loading} onClick={() => setNow(Date.now())}/>}/>{userId && <div className="o-saved">正在查看所选账户的记录 <Link href="/monitor" className="o-button" data-variant="quiet"><X size={14}/>清除账户筛选</Link></div>}<div className="o-toolbar"><div className="o-tabs" aria-label="事件类型">{[['all', '全部动态'], ['delivery', '订阅返回'], ['security', '认证与安全']].map(([value, label]) => <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)}>{label}</button>)}</div><label className="o-search"><Search/><input aria-label="搜索事件" value={query} onChange={event => setQuery(event.target.value)} placeholder="IP、访问邮箱或安全原因…"/></label><select className="o-filter-select" aria-label="记录时间范围" value={range} onChange={event => setRange(event.target.value)}><option value="24h">近 24 小时</option><option value="7d">近 7 天</option><option value="30d">近 30 天</option>{fromParam && <option value="custom">所选日期</option>}</select></div>{resource.error && <Problem message={resource.error} retry={resource.reload}/>} {resource.loading && !resource.data ? <Loading/> : resource.data && <>{resource.data.items.length ? <ActivityTimeline items={resource.data.items} asOf={resource.data.asOf}/> : <Empty title="这个时间范围内，没有匹配记录" description="缩短关键词或切换时间范围。没有记录，不等于系统已做过连通性检查。"/>}<p className="o-footnote">{formatDate(resource.data.from, true)} — {formatDate(resource.data.to, true)}（本地时间）<br/>显示筛选范围内最新 {resource.data.items.length} 条，最多 {resource.data.limit} 条。此处为访问与认证记录，不是配置内容的历史版本。</p></>}</div>
}
