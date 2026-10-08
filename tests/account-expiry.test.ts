import { describe, expect, it } from 'vitest'
import { expiryToISOString, extendExpiry, localDateTime, parseAccessQuota } from '../src/lib/account-expiry'

describe('account expiry editor', () => {
  it('preserves the original local time while clamping a month-end renewal', () => {
    expect(extendExpiry('2028-01-31T18:20:30', 1, new Date('2028-01-01T10:00:00'))).toBe('2028-02-29T18:20:30')
    expect(extendExpiry('2028-02-29T18:20:30', 12, new Date('2028-01-01T10:00:00'))).toBe('2029-02-28T18:20:30')
  })
  it('starts expired and unlimited accounts today, at the end of the target day', () => {
    for (const current of ['', '2020-01-01T12:00:00']) expect(extendExpiry(current, 1, new Date('2026-10-08T10:00:00'))).toBe('2026-11-08T23:59:59')
  })
  it('round-trips local date/time without treating a date-only string as UTC', () => {
    const value = '2026-10-08T23:59:59'
    expect(localDateTime(expiryToISOString(value))).toBe(value)
    expect(localDateTime(expiryToISOString('2026-10-08T23:59'))).toBe('2026-10-08T23:59:00')
  })
  it('uses null for unlimited validity and rejects incomplete or rollover dates', () => {
    expect(expiryToISOString('')).toBeNull()
    for (const value of ['2026-02-30T10:00:00', '2026-10-08', '2026-10-08T', '0000-01-01T10:00:00']) expect(() => expiryToISOString(value)).toThrow()
  })
})
describe('access quota validation before saving any fields', () => {
  it('accepts unlimited and the database integer limits', () => {
    expect(parseAccessQuota('0')).toBe(0)
    expect(parseAccessQuota('2147483647')).toBe(2147483647)
    expect(parseAccessQuota('0020')).toBe(20)
  })
  it('rejects empty, fractional, negative and out-of-range inputs', () => {
    for (const value of ['', ' ', '-1', '1.5', '1e3', 'Infinity', '2147483648']) expect(() => parseAccessQuota(value)).toThrow()
  })
})
