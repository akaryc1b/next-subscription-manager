'use client'

import { useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowUpRight, FileSliders, Plus, Search } from 'lucide-react'
import { toast } from 'react-hot-toast'
import yaml from 'js-yaml'
import { authClient } from '@/lib/auth-client'
import { request, useDebounced, useResource } from '@/hooks/use-workspace'
import { formatDate, type Profile, type ProfileList } from '@/lib/workspace'
import { useUnsaved } from './accounts'
import { Action, Confirm, Drawer, Empty, Loading, PageTitle, Pager, Pill, Problem, Refresh, Saved } from './ui'

function ProfileEditor({ profile, onClose, onChanged }: { profile: Profile | null; onClose: () => void; onChanged: () => void }) {
  const { data: session } = authClient.useSession()
  const [name, setName] = useState(profile?.name || '')
  const [content, setContent] = useState(profile?.content || '')
  const [active, setActive] = useState(profile?.isActive ?? true)
  const [error, setError] = useState('')
  const [validated, setValidated] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmation, setConfirmation] = useState<'publish' | 'delete' | 'discard' | null>(null)
  const dirty = name !== (profile?.name || '') || content !== (profile?.content || '') || active !== (profile?.isActive ?? true)
  useUnsaved(dirty)
  const close = () => { if (busy) return; if (dirty) setConfirmation('discard'); else onClose() }
  const validate = () => {
    try {
      const parsed: unknown = yaml.load(content)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('配置必须是 YAML 对象，不能是空内容、纯文本或列表。')
      setValidated(true); setError(''); return true
    } catch (reason) { setValidated(false); setError(reason instanceof Error ? reason.message : 'YAML 语法检查未通过'); return false }
  }
  const publish = async () => {
    if (!profile && !session?.user.id) throw new Error('会话尚未就绪，请稍后重试。')
    await request(profile ? `/api/configs/${profile.id}` : '/api/configs', {
      method: profile ? 'PUT' : 'POST', body: JSON.stringify(profile ? { name, content, isActive: active } : { name, content, userId: session!.user.id }),
    })
    toast.success(profile ? '配置已保存' : '配置已创建，可以分配给账户了'); onChanged(); onClose()
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!validate()) return
    if (profile && profile._count.userConfigs > 0) { setConfirmation('publish'); return }
    setBusy(true)
    try { await publish() } catch (reason) { setError(reason instanceof Error ? reason.message : '配置未保存') } finally { setBusy(false) }
  }
  return <><Drawer title={profile ? profile.name : '创建一份配置'} description="配置是交付内容；分配给账户后，用户才能通过订阅链接获取。" onClose={close} wide><form onSubmit={submit} className="o-drawer-form"><div className="o-drawer-body">{error && <Problem message={error}/>}<div className="o-editor-info"><span>{profile ? `${profile._count.userConfigs} 个账户已分配此配置` : '创建后再分配给账户'}</span>{profile && <span>更新于 {formatDate(profile.updatedAt, true)}</span>}</div><label className="o-field"><span>配置名称</span><input className="o-input" required maxLength={120} value={name} onChange={event => setName(event.target.value)} placeholder="例如：日常使用 / 欧洲线路"/></label><label className="o-field"><span>YAML 配置内容</span><textarea className="o-textarea o-code-editor" required spellCheck={false} autoCapitalize="off" autoCorrect="off" value={content} onChange={event => { setContent(event.target.value); setValidated(false) }} placeholder="粘贴完整配置，不会自动填入演示节点。"/><small>内容仅在打开编辑时读取，不随配置列表下载。保留你的配置顺序与内容。</small></label><div className="o-actions"><Action onClick={validate}>检查 YAML 语法</Action><span className="o-footnote" style={{ margin: 0 }}>{content.split('\n').length} 行 · {content.length.toLocaleString()} 字符</span></div>{validated && <div style={{ marginTop: 14 }}><Saved>YAML 语法通过；这不代表节点可连接或客户端支持全部字段。</Saved></div>}{profile && <section className="o-form-section"><label className="o-checkbox"><input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)}/>启用这份配置</label><p className="o-footnote">停用后，所有已分配账户都不会再获得这份配置；分配关系会保留。</p></section>}</div><footer className="o-drawer-footer"><div className="o-actions"><Action onClick={close} disabled={busy}>关闭</Action>{profile && <Action variant="quiet" disabled={busy || dirty} onClick={() => setConfirmation('delete')}>删除配置</Action>}</div><Action type="submit" variant="primary" disabled={busy || (!profile && !session?.user.id)}>{busy ? '正在保存…' : profile ? '保存配置' : '创建配置'}</Action></footer></form></Drawer>{confirmation && <Confirm title={confirmation === 'discard' ? '放弃未保存的配置？' : confirmation === 'delete' ? '永久删除这份配置？' : '将修改应用到订阅？'} description={confirmation === 'discard' ? '未保存的名称、内容和启用状态修改将被丢弃。' : confirmation === 'delete' ? `将删除配置及其 ${profile?._count.userConfigs || 0} 个账户分配关系。此操作不可撤销。` : `这份配置已分配给 ${profile?._count.userConfigs || 0} 个账户。${active ? '新的内容会在他们下一次获取订阅时生效。' : '停用后，他们将不再获得这份配置。'}`} confirmLabel={confirmation === 'discard' ? '放弃修改' : confirmation === 'delete' ? '永久删除' : '确认应用'} danger={confirmation !== 'publish'} onClose={() => setConfirmation(null)} onConfirm={async () => {
    if (confirmation === 'discard') { onClose(); return }
    if (confirmation === 'delete') { await request(`/api/configs/${profile!.id}`, { method: 'DELETE' }); toast.success('配置已删除'); onChanged(); onClose(); return }
    await publish()
  }}/>}</>
}
function ProfileLoader({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const resource = useResource<{ config: Profile }>(`/api/workspace?view=config&id=${encodeURIComponent(id)}`)
  if (!resource.data) return <Drawer title="配置编辑" description="读取所选配置内容。" onClose={onClose} wide><div className="o-drawer-body">{resource.error ? <Problem message={resource.error} retry={resource.reload}/> : <Loading/>}</div></Drawer>
  return <ProfileEditor profile={resource.data.config} onClose={onClose} onChanged={onChanged}/>
}
export function ProfilesPage() {
  const params = useSearchParams()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const search = useDebounced(query)
  const resource = useResource<ProfileList>(`/api/workspace?view=configs&page=${page}&q=${encodeURIComponent(search)}`)
  const open = (id?: string) => router.push(id ? `/configs?config=${encodeURIComponent(id)}` : '/configs?new=1')
  const close = () => router.replace('/configs', { scroll: false })
  return <div className="o-page"><PageTitle eyebrow="CONFIGURATION LIBRARY" title="好用的配置，各就各位。" description="名称、使用范围和启用状态先看清，需要修改时再进入编辑。" actions={<><Refresh loading={resource.loading} onClick={resource.reload}/><Action variant="primary" onClick={() => open()}><Plus/>新建配置</Action></>}/><div className="o-toolbar"><label className="o-search"><Search/><input aria-label="搜索配置名称" placeholder="搜索配置名称…" value={query} onChange={event => { setQuery(event.target.value); setPage(1) }}/></label><span className="o-footnote" style={{ margin: 0 }}>配置列表不载入 YAML 或订阅凭据</span></div>{resource.error && <Problem message={resource.error} retry={resource.reload}/>} {resource.loading && !resource.data ? <Loading/> : resource.data && <>{resource.data.configs.length ? <div className="o-table-wrap"><table className="o-table"><thead><tr><th>配置</th><th>状态</th><th>分配范围</th><th>最近更新</th><th>操作</th></tr></thead><tbody>{resource.data.configs.map(profile => <tr key={profile.id}><td><div className="o-person"><span className="o-avatar" data-tone="1"><FileSliders size={17}/></span><div className="o-person-copy"><button type="button" className="o-text-link" onClick={() => open(profile.id)}>{profile.name}</button><small>{profile.user.email}</small></div></div></td><td data-label="状态"><Pill tone={profile.isActive ? 'good' : 'muted'}>{profile.isActive ? '已启用' : '已停用'}</Pill></td><td data-label="分配范围">{profile._count.userConfigs} 个账户<span className="o-cell-secondary">{profile._count.userConfigs ? '已建立配置授权' : '尚未分配给账户'}</span></td><td data-label="最近更新">{formatDate(profile.updatedAt)}<span className="o-cell-secondary">{new Date(profile.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span></td><td><Action variant="quiet" onClick={() => open(profile.id)} aria-label={`编辑 ${profile.name}`}>编辑<ArrowUpRight/></Action></td></tr>)}</tbody></table></div> : <Empty title={search ? '没有匹配的配置' : '配置库，留给真正有用的内容'} description={search ? '试试更短的名称关键词。' : '添加你的第一份 YAML 配置，再把它分配给需要的用户。'} action={<Action variant="primary" onClick={() => { if (search) setQuery(''); else open() }}>{search ? '清空搜索' : '创建第一份配置'}</Action>}/>}<Pager pagination={resource.data.pagination} onPage={setPage}/></>}{params.get('config') && <ProfileLoader key={params.get('config')} id={params.get('config')!} onClose={close} onChanged={resource.reload}/>} {params.has('new') && !params.has('config') && <ProfileEditor profile={null} onClose={close} onChanged={resource.reload}/>}</div>
}
