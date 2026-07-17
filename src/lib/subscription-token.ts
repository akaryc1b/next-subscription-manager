import { randomBytes } from 'node:crypto'

const SUBSCRIPTION_TOKEN_BYTES = 32

export function generateSubscriptionToken() {
  return randomBytes(SUBSCRIPTION_TOKEN_BYTES).toString('base64url')
}
