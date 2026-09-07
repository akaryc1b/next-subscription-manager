'use client'

import { useCallback, useEffect, useState } from 'react'

export async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...init, cache: 'no-store', headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers } })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(response.status === 401 ? '登录已过期，请重新登录。' : body?.error || '操作没有完成，请重试。')
  if (body === null) throw new Error('服务器返回了无法识别的响应。')
  return body as T
}

interface ResourceState<T> {
  url: string
  revision: number
  data: T | null
  error: string
  loading: boolean
}

export function useResource<T>(url: string) {
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<ResourceState<T>>({ url, revision: 0, data: null, error: '', loading: true })
  const reload = useCallback(() => setRevision(value => value + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    setState(previous => ({ url, revision, data: previous.url === url ? previous.data : null, error: '', loading: true }))
    void request<T>(url, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setState({ url, revision, data, error: '', loading: false })
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) {
        setState(previous => ({ url, revision, data: previous.url === url ? previous.data : null, error: reason instanceof Error ? reason.message : '暂时无法加载，请重试。', loading: false }))
      }
    })
    return () => controller.abort()
  }, [url, revision])
  // A changed URL must hide old data during render, not one effect later.
  // Same-URL refreshes can retain data, with loading/error reported explicitly.
  const matches = state.url === url
  const current = matches && state.revision === revision
  return { data: matches ? state.data : null, error: current ? state.error : '', loading: !current || state.loading, reload }
}

export function useDebounced(value: string, delay = 250) {
  const [result, setResult] = useState(value)
  useEffect(() => { const timer = setTimeout(() => setResult(value), delay); return () => clearTimeout(timer) }, [value, delay])
  return result
}
