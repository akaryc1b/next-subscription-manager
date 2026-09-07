'use client'

import { toast } from 'react-hot-toast'
import { request } from '@/hooks/use-workspace'
import { subscriptionUrl } from '@/lib/workspace'
import { copyText } from '@/lib/copy-text'

export async function copyAccountLink(id: string, shadowrocket = false) {
  await copyText(async () => {
    // Never preview /api/sub/:token: that consumes the user's quota.
    const result = await request<{ subscription: { token: string } }>(`/api/users/${encodeURIComponent(id)}/subscription`)
    const link = subscriptionUrl(window.location.origin, result.subscription.token)
    return shadowrocket ? `sub://${btoa(link)}` : link
  })
  toast.success(shadowrocket ? '已复制 Shadowrocket 链接' : '已复制订阅链接')
}
