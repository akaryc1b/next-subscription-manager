import { createHmac, timingSafeEqual } from 'node:crypto'
import { APIError, createAuthMiddleware, getOAuthState, getSessionFromCtx } from 'better-auth/api'
import type { Prisma, PrismaClient } from '@prisma/client'
import { canAdminLogin } from './admin-login-policy'

type LinkSession = { id: string; userId: string; token: string; expiresAt: Date }
type LinkProof = { sessionId: string; userId: string; signature: string }

function rejected(): never {
  throw new APIError('FORBIDDEN', { code: 'ADMIN_LINK_EXPIRED', message: '绑定授权已失效，请登录后从设置重新发起' })
}

function signature(session: Pick<LinkSession, 'id' | 'userId' | 'token'>) {
  return createHmac('sha256', session.token)
    .update(JSON.stringify(['sub.admin-link.v1', session.userId, session.id]))
    .digest('hex')
}

/** Never trust an additionalData authorization claim supplied by the browser. */
export function adminLinkHook(client: PrismaClient) {
  return createAuthMiddleware(async ctx => {
    if (ctx.path !== '/link-social') return
    const current = await getSessionFromCtx(ctx)
    if (!current) rejected()
    const user = await client.user.findUnique({
      where: { id: current.user.id },
      select: { role: true, isActive: true, isBanned: true },
    })
    if (!canAdminLogin(user)) rejected()
    const proof: LinkProof = {
      sessionId: current.session.id,
      userId: current.user.id,
      signature: signature(current.session),
    }
    return { context: { body: {
      ...ctx.body,
      additionalData: { ...ctx.body?.additionalData, adminLinkAuthorization: proof },
    } } }
  })
}

/** Called with the user already locked, on the transaction performing the write. */
export async function lockAdminLinkSession(tx: Prisma.TransactionClient, userId: string) {
  let state: Awaited<ReturnType<typeof getOAuthState>>
  try { state = await getOAuthState() }
  catch (error) {
    // Direct server-side adapter operations have no Better Auth request context.
    // Real HTTP/API callbacks always run in one; do not swallow other failures.
    if (error instanceof Error && error.message === 'No request state found. Please make sure you are calling this function within a `runWithRequestState` callback.') return
    throw error
  }
  if (!state?.link) return
  const candidate: unknown = state.adminLinkAuthorization
  if (!candidate || typeof candidate !== 'object') rejected()
  const proof = candidate as Partial<LinkProof>
  if (state.link.userId !== userId || proof.userId !== userId
    || typeof proof.sessionId !== 'string' || !proof.sessionId || proof.sessionId.length > 256
    || typeof proof.signature !== 'string' || !/^[0-9a-f]{64}$/.test(proof.signature)) rejected()
  // Revocation/promotion deletes this exact session. A different/newer login
  // cannot revive the old flow. Share-lock the row through the binding commit.
  const sessions = await tx.$queryRaw<LinkSession[]>`
    SELECT id, user_id AS "userId", token, expires_at AS "expiresAt"
    FROM sessions WHERE id = ${proof.sessionId} AND user_id = ${userId}
    FOR SHARE
  `
  const session = sessions[0]
  if (!session || session.expiresAt.getTime() <= Date.now()) rejected()
  if (!timingSafeEqual(Buffer.from(proof.signature, 'hex'), Buffer.from(signature(session), 'hex'))) rejected()
}
