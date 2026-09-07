'use client'

import { useRef, useState, type FormEvent } from 'react'
import { toast } from 'react-hot-toast'
import yaml from 'js-yaml'
import { authClient } from '@/lib/auth-client'
import { request, useResource } from '@/hooks/use-workspace'
import { useUnsaved } from '@/hooks/use-unsaved'
import { formatDate, type Profile } from '@/lib/workspace'
import { Action, Confirm, Drawer, Loading, Problem, Saved } from './ui'

function ProfileEditor({ profile, onClose, onChanged }: { profile: Profile | null; onClose: () => void; onChanged: () => void }) {
  const { data: session } = authClient.useSession()
  const [name, setName] = useState(profile?.name || '')
  const [content, setContent] = useState(profile?.content || '')
  const [active, setActive] = useState(profile?.isActive ?? true)
  const [error, setError] = useState('')
  const [validated, setValidated] = useState(false)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const [confirmation, setConfirmation] = useState<'publish' | 'delete' | 'discard' | null>(null)
  const dirty = name !== (profile?.name || '') || content !== (profile?.content || '') || active !== (profile?.isActive ?? true)
  useUnsaved(dirty || busy)
  const close = () => { if (pending.current) return; if (dirty) setConfirmation('discard'); else onClose() }
  const validate = () => {
    try {
      const parsed: unknown = yaml.load(content)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('配置必须是 YAML 对象，不能是空内容、纯文本或列表。')
      setValidated(true); setError(''); return true
    } catch (reason) { setValidated(false); setError(reason instanceof Error ? reason.message : 'YAML 语法检查未通过'); return false }
  }
  const publish = async () => {
    if (pending.current) return
    if (!profile && !session?.user.id) throw new Error('会话尚未就绪，请稍后重试。')
    pending.current = true
    setBusy(true)
    setError('')
    try {
      await request(profile ? `/api/configs/${profile.id}` : '/api/configs', {
        method: profile ? 'PUT' : 'POST', body: JSON.stringify(profile ? { name, content, isActive: active } : { name, content, userId: session!.user.id }),
      })
      toast.success(profile ? '配置已保存' : '配置已创建，可以分配给账户了'); onChanged(); onClose()
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (pending.current || !validate()) return
    if (profile && profile._count.userConfigs > 0) { setConfirmation('publish'); return }
    try { await publish() } catch (reason) { setError(reason instanceof Error ? reason.message : '配置未保存') }
  }
  return <><Drawer title={profile ? profile.name : '新建配置'} description="修改后在下次订阅请求时生效。" onClose={close} wide><form onSubmit={submit} className="o-drawer-form" aria-busy={busy}><div className="o-drawer-body">{error && <Problem message={error}/>}<div className="o-editor-info"><span>{profile ? `${profile._count.userConfigs} 个账户已分配此配置` : '创建后再分配给账户'}</span>{profile && <span>更新于 {formatDate(profile.updatedAt, true)}</span>}</div><label className="o-field"><span>配置名称</span><input className="o-input" required maxLength={120} value={name} onChange={event => setName(event.target.value)} disabled={busy} placeholder="例如：日常使用 / 欧洲线路"/></label><label className="o-field"><span>YAML 配置内容</span><textarea className="o-textarea o-code-editor" required spellCheck={false} autoCapitalize="off" autoCorrect="off" value={content} onChange={event => { setContent(event.target.value); setValidated(false) }} disabled={busy} placeholder="粘贴完整配置，不会自动填入演示节点。"/></label><div className="o-actions"><Action onClick={validate} disabled={busy}>检查 YAML 语法</Action><span className="o-footnote" style={{ margin: 0 }}>{content.split('\n').length} 行 · {content.length.toLocaleString()} 字符</span></div>{validated && <div style={{ marginTop: 14 }}><Saved>YAML 语法通过，未检查节点连通性。</Saved></div>}{profile && <section className="o-form-section"><label className="o-checkbox"><input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)} disabled={busy}/>启用这份配置</label><p className="o-footnote">停用后，所有已分配账户都不会再获得这份配置；分配关系会保留。</p></section>}</div><footer className="o-drawer-footer"><div className="o-actions"><Action onClick={close} disabled={busy}>关闭</Action>{profile && <Action variant="quiet" disabled={busy || dirty} onClick={() => setConfirmation('delete')}>删除配置</Action>}</div><Action type="submit" variant="primary" disabled={busy || (!profile && !session?.user.id)}>{busy ? '正在保存…' : profile ? '保存配置' : '创建配置'}</Action></footer></form></Drawer>{confirmation && <Confirm title={confirmation === 'discard' ? '放弃未保存的配置？' : confirmation === 'delete' ? '永久删除这份配置？' : '将修改应用到订阅？'} description={confirmation === 'discard' ? '未保存的名称、内容和启用状态修改将被丢弃。' : confirmation === 'delete' ? `将删除配置及其 ${profile?._count.userConfigs || 0} 个账户分配关系。此操作不可撤销。` : `这份配置已分配给 ${profile?._count.userConfigs || 0} 个账户。${active ? '新的内容会在他们下一次获取订阅时生效。' : '停用后，他们将不再获得这份配置。'}`} confirmLabel={confirmation === 'discard' ? '放弃修改' : confirmation === 'delete' ? '永久删除' : '确认应用'} danger={confirmation !== 'publish'} onClose={() => setConfirmation(null)} onConfirm={async () => {
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
export default function ProfilePanel({ id, onClose, onChanged }: { id?: string; onClose: () => void; onChanged: () => void }) {
  return id ? <ProfileLoader id={id} onClose={onClose} onChanged={onChanged}/> : <ProfileEditor profile={null} onClose={onClose} onChanged={onChanged}/>
}
