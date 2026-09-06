'use client'

import { useEffect, useRef, useState } from 'react'

export async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...init, cache: 'no-store', headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers } })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(response.status === 401 ? '登录已过期，请重新登录。' : body?.error || '操作没有完成，请重试。')
  if (body === null) throw new Error('服务器返回了无法识别的响应。')
  return body as T
}
export function useResource<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const previousUrl = useRef(url)
  useEffect(() => {
    const controller = new AbortController()
    if (previousUrl.current !== url) { setData(null); previousUrl.current = url }
    setLoading(true)
    setError('')
    void request<T>(url, { signal: controller.signal }).then((result) => {
      if (!controller.signal.aborted) setData(result)
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : '暂时无法加载，请重试。')
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [url, revision])
  return { data, error, loading, reload: () => setRevision(value => value + 1) }
}
export function useDebounced(value: string, delay = 250) {
  const [result, setResult] = useState(value)
  useEffect(() => { const timer = setTimeout(() => setResult(value), delay); return () => clearTimeout(timer) }, [value, delay])
  return result
}
