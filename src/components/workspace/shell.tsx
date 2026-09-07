'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import dynamic from 'next/dynamic'
import { Command, LogOut, Menu, Moon, Search, Sun, X } from 'lucide-react'
import { Toaster, toast } from 'react-hot-toast'
import { authClient } from '@/lib/auth-client'
import { useTheme } from '@/components/theme-provider'
import { Action, Avatar, BrandMark } from './ui'
import { navigation, canLeaveEditor } from './navigation'

const CommandPalette = dynamic(() => import('./command-palette'), { ssr: false })

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const { data: session } = authClient.useSession()
  const [commandOpen, setCommandOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const signingOutRef = useRef(false)
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (canLeaveEditor()) setCommandOpen(value => !value)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])
  const openCommand = () => {
    if (!canLeaveEditor()) return
    setMobileOpen(false)
    setCommandOpen(true)
  }
  const signOut = async () => {
    // Guard before revoking the session, not just before the subsequent navigation.
    if (signingOutRef.current || !canLeaveEditor()) return
    signingOutRef.current = true
    setSigningOut(true)
    try {
      const result = await authClient.signOut()
      if (result.error) throw new Error('退出没有完成，请重试。')
      router.push('/login')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '退出没有完成')
    } finally {
      signingOutRef.current = false
      setSigningOut(false)
    }
  }
  const nav = <><Link prefetch={false} href="/dashboard" className="o-brand" onClick={() => setMobileOpen(false)} aria-label="sub 订阅工作台"><span><BrandMark/></span><strong>sub<span>.</span></strong></Link><nav aria-label="主导航">{navigation.map(item => <Link prefetch={false} key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined} onClick={() => setMobileOpen(false)}><item.icon/><span>{item.label}</span>{pathname === item.href && <i aria-hidden="true" className="o-nav-marker"/>}</Link>)}</nav><div className="o-nav-bottom"><button type="button" className="o-nav-shortcut" onClick={openCommand}><Command/><span>快速搜索</span><kbd>⌘ K</kbd></button><div className="o-nav-account"><Avatar name={session?.user.email || 'ME'}/><div><strong>{session?.user.name || '管理员'}</strong><span>{session?.user.email || '当前工作空间'}</span></div><Action variant="quiet" aria-label="退出登录" disabled={signingOut} onClick={() => void signOut()}><LogOut/></Action></div></div></>
  return <div className="orbit-root"><a href="#workspace-content" className="o-skip">跳转到主要内容</a><aside className="o-sidebar">{nav}</aside><div className="o-shell-main"><header className="o-topbar"><div className="o-topbar-location"><Action variant="quiet" className="o-mobile-menu" aria-label="打开导航" onClick={() => setMobileOpen(true)}><Menu/></Action><span className="o-breadcrumb">工作空间 <span>/</span></span><strong>{navigation.find(item => item.href === pathname)?.label || '工作台'}</strong></div><div className="o-topbar-actions"><button className="o-search-trigger" type="button" onClick={openCommand}><Search/><span>搜索或快速操作</span><kbd>⌘ K</kbd></button><Action variant="quiet" onClick={toggleTheme} aria-label={theme === 'dark' ? '切换浅色主题' : '切换深色主题'}>{theme === 'dark' ? <Sun/> : <Moon/>}</Action></div></header><main id="workspace-content" className="o-main" tabIndex={-1}><div className="o-canvas">{children}</div></main></div><Toaster position="bottom-center" toastOptions={{ className: 'o-toast', duration: 3500 }}/>{commandOpen && <CommandPalette onClose={() => setCommandOpen(false)}/>}<Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}><Dialog.Portal><Dialog.Overlay className="o-overlay orbit-portal"/><Dialog.Content className="o-mobile-nav orbit-portal"><Dialog.Title className="sr-only">工作空间导航</Dialog.Title><Dialog.Description className="sr-only">选择工作台、订阅账户、配置库或访问动态。</Dialog.Description><Dialog.Close asChild><Action variant="quiet" className="o-mobile-close" aria-label="关闭导航"><X/></Action></Dialog.Close>{nav}</Dialog.Content></Dialog.Portal></Dialog.Root></div>
}
