import { expect, test } from 'vitest'
import { userCreateSchema, userUpdateSchema } from '../src/lib/api-schemas'

test('userCreateSchema normalizes email and parses expiresAt', () => {
  const parsed = userCreateSchema.parse({
    email: 'USER@Example.COM',
    role: 'user',
    expiresAt: '2026-12-31T00:00:00.000Z',
  })

  expect(parsed.email).toBe('user@example.com')
  expect(parsed.expiresAt).toBeInstanceOf(Date)
})

test('userCreateSchema treats blank regular-user password as omitted', () => {
  const parsed = userCreateSchema.parse({ email: 'user@example.com', role: 'user', password: '' })

  expect(parsed.password).toBeUndefined()
})

test('userUpdateSchema treats blank password as omitted', () => {
  const parsed = userUpdateSchema.parse({ password: '   ' })

  expect(parsed.password).toBeUndefined()
})

test('userCreateSchema requires password for admins', () => {
  expect(() => userCreateSchema.parse({ email: 'admin@example.com', role: 'admin' })).toThrow()
})
