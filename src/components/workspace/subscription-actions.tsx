"use client"

import { Copy, Rocket } from 'lucide-react'
import { Action } from './ui'

type Props = {
  disabled: boolean
  onCopy: (rocket: boolean) => void
  email?: string
  compact?: boolean
}

/** Presentation only: invoke the caller in the original click task. */
export function SubscriptionActions({ disabled, onCopy, email, compact = false }: Props) {
  const name = (kind: string) => email ? `复制 ${email} 的${kind === '订阅' ? '' : ' '}${kind}链接` : `复制${kind === '订阅' ? '' : ' '}${kind}链接`
  return <div className="o-delivery-actions" data-compact={compact || undefined} role="group" aria-label="订阅链接交付" aria-busy={disabled}>
    <Action variant={compact ? 'quiet' : 'secondary'} data-link-kind="subscription" disabled={disabled} aria-label={name('订阅')} title="复制订阅链接" onClick={() => onCopy(false)}><Copy aria-hidden="true"/><span>{compact ? '订阅' : '复制订阅链接'}</span></Action>
    <Action variant={compact ? 'quiet' : 'secondary'} data-link-kind="shadowrocket" disabled={disabled} aria-label={name('Shadowrocket ')} title="复制 Shadowrocket 链接" onClick={() => onCopy(true)}><Rocket aria-hidden="true"/><span>{compact ? 'Shadowrocket' : '复制 Shadowrocket 链接'}</span></Action>
  </div>
}
