'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowUpRight, FileSliders, Plus, Search } from 'lucide-react'
import { useDebounced, useResource } from '@/hooks/use-workspace'
import { formatDate, type ProfileList } from '@/lib/workspace'
import { Action, Empty, Loading, PageTitle, Pager, Pill, Problem, Refresh } from './ui'

const ProfilePanel = dynamic(() => import('./profile-editor'), { ssr: false, loading: () => <Loading/> })

export function ProfilesPage() {
  const params = useSearchParams()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const search = useDebounced(query)
  const resource = useResource<ProfileList>(`/api/workspace?view=configs&page=${page}&q=${encodeURIComponent(search)}`)
  const open = (id?: string) => router.push(id ? `/configs?config=${encodeURIComponent(id)}` : '/configs?new=1')
  const close = () => router.replace('/configs', { scroll: false })
  return <div className="o-page"><PageTitle title="配置库" actions={<><Refresh loading={resource.loading} onClick={resource.reload}/><Action variant="primary" onClick={() => open()}><Plus/>新建配置</Action></>}/><div className="o-toolbar"><label className="o-search"><Search/><input aria-label="搜索配置名称" placeholder="搜索配置名称…" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }}/></label></div>{resource.error && <Problem message={resource.error} retry={resource.reload}/>} {resource.loading && !resource.data ? <Loading/> : resource.data && <>{resource.data.configs.length ? <div className="o-table-wrap"><table className="o-table"><thead><tr><th>配置</th><th>状态</th><th>分配范围</th><th>最近更新</th><th>操作</th></tr></thead><tbody>{resource.data.configs.map(profile => <tr key={profile.id}><td><div className="o-person"><span className="o-avatar" data-tone="1"><FileSliders size={17}/></span><div className="o-person-copy"><button type="button" className="o-text-link" onClick={() => open(profile.id)}>{profile.name}</button><small>{profile.user.email}</small></div></div></td><td data-label="状态"><Pill tone={profile.isActive ? 'good' : 'muted'}>{profile.isActive ? '已启用' : '已停用'}</Pill></td><td data-label="分配范围">{profile._count.userConfigs} 个账户<span className="o-cell-secondary">{profile._count.userConfigs ? '已建立配置授权' : '尚未分配给账户'}</span></td><td data-label="最近更新">{formatDate(profile.updatedAt)}<span className="o-cell-secondary">{new Date(profile.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span></td><td><Action variant="quiet" onClick={() => open(profile.id)} aria-label={`编辑 ${profile.name}`}>编辑<ArrowUpRight/></Action></td></tr>)}</tbody></table></div> : <Empty title={search ? '没有匹配的配置' : '暂无配置'} description={search ? '试试更短的名称关键词。' : '新建配置后分配给账户。'} action={<Action variant="primary" onClick={() => { if (search) setQuery(''); else open() }}>{search ? '清空搜索' : '创建第一份配置'}</Action>}/>}<Pager pagination={resource.data.pagination} onPage={setPage}/></>}{params.get('config') && <ProfilePanel key={params.get('config')} id={params.get('config')!} onClose={close} onChanged={resource.reload}/>} {params.has('new') && !params.has('config') && <ProfilePanel onClose={close} onChanged={resource.reload}/>}</div>
}
