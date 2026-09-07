'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowUpRight, Plus, Search, Users, FileSliders, X } from 'lucide-react'
import { useDebounced, useResource } from '@/hooks/use-workspace'
import { accountHref, configHref, type AccountList, type ProfileList } from '@/lib/workspace'
import { navigation, canLeaveEditor } from './navigation'
import { Action } from './ui'

export default function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const search = useDebounced(query)
  const users = useResource<AccountList>(`/api/workspace?view=accounts&pageSize=5&q=${encodeURIComponent(search)}`)
  const configs = useResource<ProfileList>(`/api/workspace?view=configs&pageSize=5&q=${encodeURIComponent(search)}`)
  const settled = search === query
  // Both debounce and request identity must match before a result is actionable.
  const userResults = settled && !users.loading && !users.error ? users.data?.users || [] : []
  const configResults = settled && !configs.loading && !configs.error ? configs.data?.configs || [] : []
  const pending = !settled || users.loading || configs.loading
  const items = [
    ...navigation.filter(item => !query || item.label.includes(query)).map(item => ({ href: item.href, label: item.label, group: '页面', icon: item.icon })),
    ...(!query ? [{ href: '/users?new=1', label: '创建订阅账户', group: '操作', icon: Plus }, { href: '/configs?new=1', label: '新建配置', group: '操作', icon: Plus }] : []),
    ...userResults.map(user => ({ href: accountHref(user.id), label: user.email, group: '账户', icon: Users })),
    ...configResults.map(config => ({ href: configHref(config.id), label: config.name, group: '配置', icon: FileSliders })),
  ]
  const index = items.length ? Math.max(0, Math.min(selected, items.length - 1)) : -1
  const go = (href: string) => { if (canLeaveEditor()) { onClose(); router.push(href) } }
  return (
    <Dialog.Root open onOpenChange={open => { if (!open) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="o-overlay orbit-portal"/>
        <Dialog.Content className="o-command orbit-portal">
          <Dialog.Title className="sr-only">搜索工作空间</Dialog.Title>
          <Dialog.Description className="sr-only">搜索页面、账户邮箱或配置名称，使用方向键选择，回车打开。</Dialog.Description>
          <div className="o-command-input">
            <Search/>
            <input autoComplete="off" role="combobox" aria-expanded="true" aria-controls="workspace-results" aria-activedescendant={index >= 0 ? `workspace-result-${index}` : undefined} aria-label="搜索页面、账户或配置" placeholder="搜索账户、配置或页面" value={query}
              onChange={event => { setQuery(event.target.value); setSelected(0) }}
              onKeyDown={event => {
                if (event.nativeEvent.isComposing) return
                if (event.key === 'ArrowDown') { event.preventDefault(); setSelected(Math.max(0, Math.min(items.length - 1, index + 1))) }
                if (event.key === 'ArrowUp') { event.preventDefault(); setSelected(Math.max(0, index - 1)) }
                if (event.key === 'Enter') { event.preventDefault(); if (items[index]) go(items[index].href) }
              }}/>
            <Dialog.Close asChild><Action variant="quiet" aria-label="关闭搜索"><X/></Action></Dialog.Close>
          </div>
          <div role="listbox" id="workspace-results" className="o-command-results" aria-label="搜索结果" aria-busy={pending}>
            {items.map((item, itemIndex) => <button key={`${item.group}-${item.href}`} id={`workspace-result-${itemIndex}`} role="option" aria-selected={index === itemIndex} type="button" onClick={() => go(item.href)} onMouseEnter={() => setSelected(itemIndex)}><item.icon/><span>{item.label}</span><small>{item.group}</small><ArrowUpRight/></button>)}
            {items.length === 0 && <p className="o-command-empty">{pending ? '正在查找…' : '没有匹配结果，试试邮箱或配置名称。'}</p>}
          </div>
          {settled && (users.error || configs.error) && <p className="o-command-empty" role="status">部分搜索数据暂时不可用，页面快捷入口仍可使用。</p>}
          <footer><span>↑ ↓ 选择 · Enter 打开</span><span>Esc 关闭</span></footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
