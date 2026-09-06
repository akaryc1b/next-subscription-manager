'use client'

import { useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { hasUnsavedEditor } from '@/lib/navigation-guard'

const INDEX = '__subHistoryIndex'

/** Mark app-owned history entries while preserving all Next.js router state.
 * A blocked traversal is reversed before Next receives popstate, so the editor
 * remains mounted. Cross-document exits keep the native beforeunload warning.
 */
export function HistoryGuard() {
  useEffect(() => {
    const history = window.history
    const push = history.pushState
    const replace = history.replaceState
    let current = typeof history.state?.[INDEX] === 'number' ? history.state[INDEX] as number : 0
    let reversing = false
    replace.call(history, { ...history.state, [INDEX]: current }, '', location.href)

    const wrappedPush: History['pushState'] = function (state, unused, url) {
      const next = current + 1
      push.call(history, { ...state, [INDEX]: next }, unused, url)
      current = next
    }
    const wrappedReplace: History['replaceState'] = function (state, unused, url) {
      replace.call(history, { ...state, [INDEX]: current }, unused, url)
    }
    history.pushState = wrappedPush
    history.replaceState = wrappedReplace

    const onPopState = (event: PopStateEvent) => {
      const target: unknown = event.state?.[INDEX]
      if (reversing) {
        reversing = false
        event.stopImmediatePropagation()
        return
      }
      // Entries outside this document are handled by beforeunload.
      if (typeof target !== 'number') return
      if (hasUnsavedEditor() && target !== current) {
        event.stopImmediatePropagation()
        reversing = true
        history.go(current - target)
        toast.error('还有未保存的修改。请先保存，或关闭编辑并确认放弃。', { id: 'unsaved-editor' })
      } else {
        current = target
      }
    }
    window.addEventListener('popstate', onPopState, true)
    return () => {
      window.removeEventListener('popstate', onPopState, true)
      if (history.pushState === wrappedPush) history.pushState = push
      if (history.replaceState === wrappedReplace) history.replaceState = replace
    }
  }, [])
  return null
}
