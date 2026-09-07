'use client'

import Link from 'next/link'
import { ArrowUpRight, Plus } from 'lucide-react'
import { useResource } from '@/hooks/use-workspace'
import { accountHref, accountState, formatDate, type Overview } from '@/lib/workspace'
import { ActivityTimeline, Avatar, DeliveryChart, Empty, Loading, PageTitle, Pill, Problem, Refresh, SectionTitle } from './ui'

export function OverviewPage() {
  const resource = useResource<Overview>('/api/workspace')
  const { data } = resource
  return <div className="o-page">
    <PageTitle title="工作台" actions={<><Refresh loading={resource.loading} onClick={resource.reload}/><Link prefetch={false} className="o-button" data-variant="primary" href="/users?new=1"><Plus/>创建账户</Link></>}/>
    {resource.error && <Problem message={data ? `刷新失败，以下为上次数据。${resource.error}` : resource.error} retry={resource.reload}/>}
    {!data ? !resource.error && <Loading/> : <>
      {data.counts.accounts === 0 && <div className="o-setup-row"><span>{data.counts.configs > 0 ? '配置已就绪' : '暂无启用配置'}</span><Link prefetch={false} className="o-button" href={data.counts.configs > 0 ? '/users?new=1' : '/configs?new=1'}>{data.counts.configs > 0 ? '创建第一个账户' : '准备可用配置'}<ArrowUpRight/></Link></div>}
      <div className="o-overview-facts">
        <Link prefetch={false} href="/users"><strong>{data.counts.accounts.toLocaleString()}</strong>订阅用户<ArrowUpRight/></Link>
        <Link prefetch={false} href="/configs"><strong>{data.counts.configs.toLocaleString()}</strong>启用配置<ArrowUpRight/></Link>
        <Link prefetch={false} href="/monitor?kind=delivery&range=24h"><strong>{data.counts.deliveries.toLocaleString()}</strong>24h 内容返回<ArrowUpRight/></Link>
        <Link prefetch={false} href="/monitor?kind=security&range=24h"><strong>{data.counts.security.toLocaleString()}</strong>24h 安全提醒<ArrowUpRight/></Link>
      </div>
      <div className="o-dashboard-middle">
        <section aria-label="待处理账户">
          <SectionTitle title="待处理"><Link prefetch={false} href="/users?filter=attention"><Pill tone={data.counts.attention ? 'warn' : 'muted'}>{data.counts.attention} 个账户</Pill><ArrowUpRight/></Link></SectionTitle>
          {data.attention.length ? data.attention.map(account => {
            const state = accountState(account, new Date(data.asOf).getTime())
            return <div className="o-queue-row" key={account.id}><Avatar name={account.email}/><div className="o-queue-copy"><strong>{account.email}</strong><p>{state.label} · {state.detail}</p></div><Link prefetch={false} href={accountHref(account.id)}>{state.action}<ArrowUpRight/></Link></div>
          }) : <Empty title="暂无待处理账户"/>}
        </section>
        <section><SectionTitle title="订阅返回趋势"><Link prefetch={false} href="/monitor?kind=delivery">查看记录<ArrowUpRight/></Link></SectionTitle><DeliveryChart data={data.trend}/></section>
      </div>
      <section className="o-activity-section"><SectionTitle title="最近动态"><Link prefetch={false} href="/monitor">全部记录<ArrowUpRight/></Link></SectionTitle>{data.activity.length ? <ActivityTimeline items={data.activity} asOf={data.asOf} compact/> : <Empty title="近 24 小时暂无记录"/>}</section>
      <p className="o-footnote">更新于 {formatDate(data.asOf, true)} · 返回记录不代表节点连通</p>
    </>}
  </div>
}
