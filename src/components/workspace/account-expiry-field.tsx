'use client'

import { useId, useState } from 'react'
import { extendExpiry } from '@/lib/account-expiry'
import { Action } from './ui'

export function AccountExpiryField({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const id = useId()
  const [showTime, setShowTime] = useState(false)
  const [date = '', time = '23:59:59'] = value.split('T')
  return <section className="o-form-section" aria-label="账户有效期">
    <h3>有效期</h3>
    <div className="o-actions" role="group" aria-label="快捷续期" style={{ flexWrap: 'wrap', marginBottom: 14 }}>
      {([1, 3, 6, 12] as const).map(months => <Action key={months} disabled={disabled} style={{ minHeight: 44 }} onClick={() => onChange(extendExpiry(value, months))}>{months === 12 ? '+1 年' : `+${months} 个月`}</Action>)}
      <Action disabled={disabled} aria-pressed={!value} style={{ minHeight: 44 }} onClick={() => { onChange(''); setShowTime(false) }}>长期有效</Action>
    </div>
    <label className="o-field"><span>到期日期（本地时间）</span><input className="o-input" type="date" min="0001-01-01" max="9999-12-31" value={date} disabled={disabled} style={{ minWidth: 0, minHeight: 44, fontSize: 16 }} onChange={event => onChange(event.target.value ? `${event.target.value}T${time || '23:59:59'}` : '')}/></label>
    <div className="o-actions" style={{ justifyContent: 'space-between', marginTop: 8, flexWrap: 'wrap' }}>
      <small className="o-footnote">{value ? `于 ${time} 到期` : '长期有效'}</small>
      <Action variant="quiet" disabled={disabled || !value} aria-expanded={showTime} aria-controls={id} onClick={() => setShowTime(open => !open)}>{showTime ? '收起时间' : '调整时间'}</Action>
    </div>
    <div id={id} hidden={!showTime || !value}>
      <label className="o-field"><span>到期时间（本地时间）</span><input className="o-input" type="time" step="1" required={showTime && Boolean(value)} value={time} disabled={disabled || !value || !showTime} style={{ minHeight: 44, fontSize: 16 }} onChange={event => onChange(`${date}T${event.target.value}`)}/></label>
      <Action variant="quiet" disabled={disabled || !value} onClick={() => onChange(`${date}T23:59:59`)}>设为当天结束</Action>
    </div>
    <p className="o-footnote" style={{ marginTop: 8 }}>续期从当前到期日延长；已到期或长期有效时，从今天起算。</p>
  </section>
}
