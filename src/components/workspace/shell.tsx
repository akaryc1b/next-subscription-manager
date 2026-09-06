'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { MotionConfig, motion } from 'framer-motion'
import { Activity, ArrowUpRight, CalendarDays, Command, FileSliders, LayoutDashboard, LogOut, Menu, Moon, Plus, Search, Settings2, Sun, Users, X } from 'lucide-react'
import { Toaster, toast } from 'react-hot-toast'
import { authClient } from '@/lib/auth-client'
import { useTheme } from '@/components/theme-provider'
import { useDebounced, useResource } from '@/hooks/use-workspace'
import { accountHref, configHref, type AccountList, type ProfileList } from '@/lib/workspace'
import { Action, Avatar, BrandMark } from './ui'

const navigation = [
  { href: '/dashboard', label: '工作台', icon: LayoutDashboard },
  { href: '/users', label: '订阅账户', icon: Users },
  { href: '/configs', label: '配置库', icon: FileSliders },
  { href: '/calendar', label: '到期日程', icon: CalendarDays },
  { href: '/monitor', label: '访问动态', icon: Activity },
  { href: '/settings', label: '账户设置', icon: Settings2 },
]
function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const search = useDebounced(query)
  const users = useResource<AccountList>(`/api/workspace?view=accounts&pageSize=5&q=${encodeURIComponent(search)}`)
  const configs = useResource<ProfileList>(`/api/workspace?view=configs&pageSize=5&q=${encodeURIComponent(search)}`)
  const items = [
    ...navigation.filter(item => !query || item.label.includes(query)).map(item => ({ href: item.href, label: item.label, group: '页面', icon: item.icon })),
    ...(!query ? [{ href: '/users?new=1', label: '创建订阅账户', group: '操作', icon: Plus }, { href: '/configs?new=1', label: '新建配置', group: '操作', icon: Plus }] : []),
    ...(users.data?.users || []).map(user => ({ href: accountHref(user.id), label: user.email, group: '账户', icon: Users })),
    ...(configs.data?.configs || []).map(config => ({ href: configHref(config.id), label: config.name, group: '配置', icon: FileSliders })),
  ]
  const index = Math.min(selected, items.length - 1)
  const go = (href: string) => { onClose(); router.push(href) }
  return <Dialog.Root open onOpenChange={open => { if (!open) onClose() }}><Dialog.Portal><Dialog.Overlay className="o-overlay orbit-portal"/><Dialog.Content className="o-command orbit-portal"><Dialog.Title className="sr-only">搜索工作空间</Dialog.Title><Dialog.Description className="sr-only">搜索页面、账户邮箱或配置名称，使用方向键选择，回车打开。</Dialog.Description><div className="o-command-input"><Search/><input autoComplete="off" role="combobox" aria-expanded="true" aria-controls="workspace-results" aria-activedescendant={index >= 0 ? `workspace-result-${index}` : undefined} aria-label="搜索页面、账户或配置" placeholder="想找什么？输入账户、配置或页面…" value={query} onChange={event => { setQuery(event.target.value); setSelected(0) }} onKeyDown={event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setSelected(value => Math.min(items.length - 1, value + 1)) }
    if (event.key === 'ArrowUp') { event.preventDefault(); setSelected(value => Math.max(0, value - 1)) }
    if (event.key === 'Enter' && items[index]) { event.preventDefault(); go(items[index].href) }
  }}/><Dialog.Close asChild><Action variant="quiet" aria-label="关闭搜索"><X/></Action></Dialog.Close></div><div role="listbox" id="workspace-results" className="o-command-results" aria-label="搜索结果">{items.map((item, itemIndex) => <button key={`${item.group}-${item.href}`} id={`workspace-result-${itemIndex}`} role="option" aria-selected={index === itemIndex} type="button" onClick={() => go(item.href)} onMouseEnter={() => setSelected(itemIndex)}><item.icon/><span>{item.label}</span><small>{item.group}</small><ArrowUpRight/></button>)}{items.length === 0 && <p className="o-command-empty">{users.loading || configs.loading ? '正在查找…' : '没有匹配结果，试试邮箱或配置名称。'}</p>}</div>{(users.error || configs.error) && <p className="o-command-empty" role="status">部分搜索数据暂时不可用，页面快捷入口仍可使用。</p>}<footer><span>↑ ↓ 选择 · Enter 打开</span><span>Esc 关闭</span></footer></Dialog.Content></Dialog.Portal></Dialog.Root>
}
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const { data: session } = authClient.useSession()
  const [commandOpen, setCommandOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommandOpen(value => !value) } }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])
  const signOut = async () => {
    setSigningOut(true)
    try { const result = await authClient.signOut(); if (result.error) throw new Error('退出没有完成，请重试。'); router.push('/login'); router.refresh() }
    catch (error) { toast.error(error instanceof Error ? error.message : '退出没有完成') }
    finally { setSigningOut(false) }
  }
  const nav = <><Link href="/dashboard" className="o-brand" onClick={() => setMobileOpen(false)} aria-label="sub 订阅工作台"><span><BrandMark/></span><strong>sub<span>.</span></strong></Link><p className="o-nav-caption">你的订阅工作空间</p><nav aria-label="主导航">{navigation.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined} onClick={() => setMobileOpen(false)}><item.icon/><span>{item.label}</span>{pathname === item.href && <motion.i layoutId="nav-marker" transition={{ type: 'spring', stiffness: 380, damping: 32 }} className="o-nav-marker"/>}</Link>)}</nav><div className="o-nav-bottom"><button type="button" className="o-nav-shortcut" onClick={() => { setMobileOpen(false); setCommandOpen(true) }}><Command/><span>少一点寻找，多一点掌控</span><kbd>⌘ K</kbd></button><div className="o-nav-account"><Avatar name={session?.user.email || 'ME'}/><div><strong>{session?.user.name || '管理员'}</strong><span>{session?.user.email || '当前工作空间'}</span></div><Action variant="quiet" aria-label="退出登录" disabled={signingOut} onClick={() => void signOut()}><LogOut/></Action></div></div></>
  return <MotionConfig reducedMotion="user"><div className="orbit-root"><a href="#workspace-content" className="o-skip">跳转到主要内容</a><aside className="o-sidebar">{nav}</aside><div className="o-shell-main"><header className="o-topbar"><div className="o-topbar-location"><Action variant="quiet" className="o-mobile-menu" aria-label="打开导航" onClick={() => setMobileOpen(true)}><Menu/></Action><span className="o-breadcrumb">工作空间 <span>/</span></span><strong>{navigation.find(item => item.href === pathname)?.label || '工作台'}</strong></div><div className="o-topbar-actions"><button className="o-search-trigger" type="button" onClick={() => setCommandOpen(true)}><Search/><span>搜索或快速操作</span><kbd>⌘ K</kbd></button><Action variant="quiet" onClick={toggleTheme} aria-label={theme === 'dark' ? '切换浅色主题' : '切换深色主题'}>{theme === 'dark' ? <Sun/> : <Moon/>}</Action></div></header><main id="workspace-content" className="o-main" tabIndex={-1}><motion.div key={pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .22 }} className="o-canvas">{children}</motion.div></main></div><Toaster position="bottom-center" toastOptions={{ className: 'o-toast', duration: 3500 }}/>{commandOpen && <CommandPalette onClose={() => setCommandOpen(false)}/>}<Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}><Dialog.Portal><Dialog.Overlay className="o-overlay orbit-portal"/><Dialog.Content className="o-mobile-nav orbit-portal"><Dialog.Title className="sr-only">工作空间导航</Dialog.Title><Dialog.Description className="sr-only">选择工作台、订阅账户、配置库或访问动态。</Dialog.Description><Dialog.Close asChild><Action variant="quiet" className="o-mobile-close" aria-label="关闭导航"><X/></Action></Dialog.Close>{nav}</Dialog.Content></Dialog.Portal></Dialog.Root></div></MotionConfig>
}
