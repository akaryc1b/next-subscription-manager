export type Tone = 'good' | 'warn' | 'bad' | 'muted' | 'accent'
export interface Profile {
  id: string; userId: string; name: string; isActive: boolean; updatedAt: string
  createdAt: string; content?: string; user: { email: string }; _count: { userConfigs: number }
}
export interface Account {
  id: string; email: string; role: 'admin' | 'user'; isActive: boolean; isBanned: boolean
  expiresAt: string | null; createdAt: string
  subscription: { accessCount: number; maxAccess: number; tokenRotatedAt: string } | null
  userConfigs: { configId: string; config: { id: string; name: string; isActive: boolean } }[]
}
export interface Activity {
  id: string; kind: 'delivery' | 'security'; at: string; title: string; detail: string
  tone: Tone; userId: string | null; email?: string; ip: string; agent: string | null
  status: number | null; nextStep: string
}
export interface PageInfo { page: number; pageSize: number; total: number; pageCount: number }
export interface AccountList { users: Account[]; pagination: PageInfo; asOf: string }
export interface ProfileList { configs: Profile[]; pagination: PageInfo }
export interface Overview {
  asOf: string
  counts: { accounts: number; configs: number; attention: number; expiring: number; deliveries: number; security: number }
  attention: Account[]; trend: { date: string; count: number }[]; activity: Activity[]
}
export const DAY = 86_400_000
export const accountFilters = [
  ['all', '全部账户'], ['attention', '需要关注'], ['expiring', '即将到期'],
  ['expired', '已到期'], ['exhausted', '额度用尽'], ['unassigned', '无可用配置'],
  ['paused', '已停用'], ['blocked', '已封禁'],
] as const
export type AccountFilter = typeof accountFilters[number][0]

// This describes stored access conditions, not network health or a live delivery probe.
export function accountState(account: Account, now = Date.now()): { label: string; detail: string; action: string; tone: Tone } {
  if (account.isBanned) return { label: '已封禁', detail: '订阅访问被阻止', action: '查看授权', tone: 'bad' }
  if (!account.isActive) return { label: '已停用', detail: '恢复后才能访问订阅', action: '查看授权', tone: 'muted' }
  const remaining = account.expiresAt ? new Date(account.expiresAt).getTime() - now : null
  if (remaining !== null && remaining < 0) return { label: '已到期', detail: '需要延长有效期', action: '调整有效期', tone: 'bad' }
  if (!account.subscription) return { label: '无订阅', detail: '此账户没有订阅链接', action: '查看账户', tone: 'muted' }
  const { maxAccess, accessCount } = account.subscription
  if (maxAccess > 0 && accessCount >= maxAccess) return { label: '额度用尽', detail: `已使用 ${accessCount} / ${maxAccess} 次`, action: '调整额度', tone: 'bad' }
  if (!account.userConfigs.some(({ config }) => config.isActive)) return { label: '无可用配置', detail: '分配至少一份已启用的配置', action: '分配配置', tone: 'warn' }
  if (remaining !== null && remaining <= 7 * DAY) return { label: '即将到期', detail: `${Math.max(1, Math.ceil(remaining / DAY))} 天内到期`, action: '调整有效期', tone: 'warn' }
  return { label: '可分发', detail: '账户、额度与配置条件满足', action: '查看订阅', tone: 'good' }
}
export function formatDate(value: string | null, time = false) {
  if (!value) return '长期有效'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '日期不可用'
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', ...(time ? { hour: '2-digit', minute: '2-digit', second: '2-digit' } as const : {}) }).format(date)
}
export function relativeTime(value: string, now = Date.now()) {
  const diff = Math.max(0, now - new Date(value).getTime())
  if (!Number.isFinite(diff)) return '时间未知'
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < DAY) return `${Math.floor(diff / 3_600_000)} 小时前`
  return `${Math.floor(diff / DAY)} 天前`
}
export function accountHref(id: string) { return `/users?account=${encodeURIComponent(id)}` }
export function configHref(id: string) { return `/configs?config=${encodeURIComponent(id)}` }
export function subscriptionUrl(origin: string, token: string) {
  const url = new URL(origin)
  if (!['http:', 'https:'].includes(url.protocol) || !token) throw new Error('订阅链接不可用')
  return `${url.origin}/api/sub/${encodeURIComponent(token)}`
}
export function securityCopy(type: string, reason?: unknown): { title: string; detail: string; nextStep: string } {
  const reasons: Record<string, [string, string]> = {
    user_inactive: ['已停用账户尝试访问订阅', '确认是否需要恢复账户。'],
    user_banned: ['已封禁账户尝试访问订阅', '核对封禁原因；不应仅为消除提醒而解封。'],
    subscription_expired: ['订阅因到期而被拒绝', '确认续期安排，并调整账户有效期。'],
    access_limit_exceeded: ['订阅因额度用尽而被拒绝', '查看已用次数，按需提高访问上限。'],
  }
  if (type === 'subscription_denied') {
    const entry = typeof reason === 'string' ? reasons[reason] : undefined
    return { title: entry?.[0] || '订阅访问被拒绝', detail: '本次请求没有获得订阅内容', nextStep: entry?.[1] || '核对账户状态、有效期和访问额度。' }
  }
  const labels: Record<string, [string, string, string]> = {
    subscription_token_invalid: ['订阅链接已失效或不存在', '请求未获得订阅内容', '核对客户端是否仍在使用旧链接。'],
    auth_failure: ['登录未成功', '凭据校验未通过', '确认是否为本人操作；持续异常时检查来源。'],
    auth_rate_limited: ['登录尝试暂时受限', '短时间内失败次数过多', '确认来源，等待限流窗口结束后再尝试。'],
    auth_sign_in_success: ['账户登录成功', '身份验证已通过', '不是本人操作时，请检查账户认证方式。'],
    activation_setup_success: ['账户激活成功', '账户已完成激活', '可继续检查订阅配置与有效期。'],
    activation_token_expired: ['激活链接已到期', '本次激活没有完成', '核对激活链接及其有效期。'],
    activation_token_used: ['激活链接已使用', '本次激活没有重复执行', '已激活用户应直接登录。'],
    admin_auth_forbidden: ['管理访问被阻止', '当前账户没有可用的管理员权限', '核对角色与账号状态。'],
    admin_auth_missing: ['管理请求未登录', '请求已被权限检查阻止', '确认是否为失效页面或未知来源的请求。'],
    admin_auth_invalid_session: ['管理会话已失效', '请求需要重新认证', '重新登录后再操作。'],
  }
  const entry = labels[type]
  return { title: entry?.[0] || '认证请求未完成', detail: entry?.[1] || `事件类型：${type}`, nextStep: entry?.[2] || '查看请求时间与来源，核对账户认证状态。' }
}
