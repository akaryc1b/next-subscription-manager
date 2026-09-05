import { describe, expect, it } from 'vitest'
import { accountState, DAY, relativeTime, securityCopy, subscriptionUrl, type Account } from './workspace'
const now = Date.parse('2026-09-05T12:00:00Z')
const account: Account = { id: '1', email: 'test@example.com', role: 'user', isActive: true, isBanned: false, expiresAt: null, createdAt: '2026-01-01', subscription: { accessCount: 20, maxAccess: 0, tokenRotatedAt: '2026-01-01' }, userConfigs: [{ configId: 'a', config: { id: 'a', name: 'Default', isActive: true } }] }
describe('workspace access semantics', () => {
  it('treats zero quota as unlimited, not exhausted', () => expect(accountState(account, now).label).toBe('可分发'))
  it('detects the exact quota boundary', () => expect(accountState({ ...account, subscription: { ...account.subscription!, maxAccess: 20 } }, now).label).toBe('额度用尽'))
  it('detects expiration within the current day', () => expect(accountState({ ...account, expiresAt: new Date(now - 1).toISOString() }, now).label).toBe('已到期'))
  it('uses an explicit seven day horizon', () => {
    expect(accountState({ ...account, expiresAt: new Date(now + 7 * DAY).toISOString() }, now).label).toBe('即将到期')
    expect(accountState({ ...account, expiresAt: new Date(now + 7 * DAY + 1).toISOString() }, now).label).toBe('可分发')
  })
  it('does not mistake assigned disabled profiles for usable profiles', () => expect(accountState({ ...account, userConfigs: [{ configId: 'a', config: { id: 'a', name: 'Default', isActive: false } }] }, now).label).toBe('无可用配置'))
  it('does not present banned or paused accounts as ready', () => {
    expect(accountState({ ...account, isBanned: true }, now).label).toBe('已封禁')
    expect(accountState({ ...account, isActive: false }, now).label).toBe('已停用')
  })
  it('handles missing subscriptions', () => expect(accountState({ ...account, subscription: null }, now).label).toBe('无订阅'))
  it('gives denied requests a reason-specific next step', () => expect(securityCopy('subscription_denied', 'access_limit_exceeded').nextStep).toContain('上限'))
  it('does not infer an attack from an unknown event', () => expect(securityCopy('unknown').title).toBe('认证请求未完成'))
  it('clamps future relative dates and handles invalid dates', () => {
    expect(relativeTime(new Date(now + DAY).toISOString(), now)).toBe('刚刚')
    expect(relativeTime('invalid', now)).toBe('时间未知')
  })
  it('encodes tokens and rejects non-web origins', () => {
    expect(subscriptionUrl('https://example.com/path', 'a/b')).toBe('https://example.com/api/sub/a%2Fb')
    expect(() => subscriptionUrl('javascript:alert(1)', 'token')).toThrow()
  })
})
