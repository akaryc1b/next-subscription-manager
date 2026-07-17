import assert from 'node:assert/strict'
import test from 'node:test'
import { userCreateSchema, userUpdateSchema } from '../src/lib/api-schemas'

test('userCreateSchema normalizes email and parses expiresAt', () => {
  const parsed = userCreateSchema.parse({
    email: 'USER@Example.COM',
    role: 'user',
    expiresAt: '2026-12-31T00:00:00.000Z',
  })

  assert.equal(parsed.email, 'user@example.com')
  assert.ok(parsed.expiresAt instanceof Date)
})

test('userCreateSchema treats blank regular-user password as omitted', () => {
  const parsed = userCreateSchema.parse({ email: 'user@example.com', role: 'user', password: '' })

  assert.equal(parsed.password, undefined)
})

test('userUpdateSchema treats blank password as omitted', () => {
  const parsed = userUpdateSchema.parse({ password: '   ' })

  assert.equal(parsed.password, undefined)
})

test('userCreateSchema requires password for admins', () => {
  assert.throws(() => userCreateSchema.parse({ email: 'admin@example.com', role: 'admin' }))
})
