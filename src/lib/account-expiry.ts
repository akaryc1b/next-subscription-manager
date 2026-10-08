/** Local wall-clock values for the account editor; API values remain ISO instants. */
export function localDateTime(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${String(date.getFullYear()).padStart(4, '0')}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function expiryToISOString(value: string): string | null {
  if (!value) return null
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value) || Number(value.slice(0, 4)) < 1) throw new Error('请选择完整的有效期日期和时间。')
  const normalized = value.length === 16 ? `${value}:00` : value
  const date = new Date(normalized)
  // Reject rollover dates and nonexistent local times at a daylight-saving jump.
  if (Number.isNaN(date.getTime()) || localDateTime(normalized) !== normalized) throw new Error('该日期或本地时间无效，请重新选择。')
  return date.toISOString()
}

/** Future expiry extends from the draft; expired/unlimited accounts start today. */
export function extendExpiry(value: string, months: number, now = new Date()): string {
  const current = value ? new Date(value) : null
  const future = current && Number.isFinite(current.getTime()) && current.getTime() > now.getTime()
  const date = new Date(future ? current : now)
  if (!future) date.setHours(23, 59, 59, 0)
  const day = date.getDate()
  date.setDate(1)
  date.setMonth(date.getMonth() + months)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(day, lastDay))
  return localDateTime(date.toISOString())
}

export function parseAccessQuota(value: string): number {
  const quota = Number(value)
  if (!/^\d+$/.test(value.trim()) || !Number.isInteger(quota) || quota < 0 || quota > 2147483647) throw new Error('请输入 0 到 2147483647 之间的整数，0 表示不限制。')
  return quota
}
