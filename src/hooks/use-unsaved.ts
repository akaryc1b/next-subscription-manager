'use client'

import { useEffect } from 'react'
import { toast } from 'react-hot-toast'

/** Keep client-side links from discarding a dirty editor without an explicit close. */
export function useUnsaved(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    const beforeNavigate = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank' || anchor.hasAttribute('download')) return
      const url = new URL(anchor.href, location.href)
      if (url.href === location.href || (url.pathname === location.pathname && url.search === location.search && url.hash)) return
      event.preventDefault()
      event.stopPropagation()
      toast.error('还有未保存的修改。请先保存，或关闭编辑并确认放弃。', { id: 'unsaved-editor' })
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', beforeNavigate, true)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('click', beforeNavigate, true)
    }
  }, [dirty])
}
