import { APIError } from 'better-auth/api'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import type { Prisma, PrismaClient } from '@prisma/client'
import { canAdminLogin, type LoginAccount } from './admin-login-policy'

type AdapterFactory = ReturnType<typeof prismaAdapter>
type Adapter = ReturnType<AdapterFactory>
type Operations = Omit<Adapter, 'transaction'>
type Conditions = Parameters<Operations['update']>[0]['where']
type Transaction = Prisma.TransactionClient
const transactionOptions = { maxWait: 5000, timeout: 10000 }

function denied(): never {
  throw new APIError('FORBIDDEN', { code: 'ADMIN_ONLY', message: '仅启用且未封禁的管理员可以管理认证方式' })
}

async function lockEligibleUser(tx: Transaction, userId: unknown) {
  if (typeof userId !== 'string' || !userId) denied()
  // Hold the user row lock until the same transaction's auth write commits.
  // A status UPDATE either precedes this check or waits for this authorized write.
  const users = await tx.$queryRaw<LoginAccount[]>`
    SELECT role::text AS role, is_active AS "isActive", is_banned AS "isBanned"
    FROM users WHERE id = ${userId} FOR UPDATE
  `
  if (!canAdminLogin(users[0])) denied()
}

/** Auth-only writes serialize against administrator status changes. */
export function adminAuthAdapter(client: PrismaClient): AdapterFactory {
  return options => {
    function protect(database: PrismaClient | Transaction, activeTx?: Transaction): Adapter {
      const raw = prismaAdapter(database, { provider: 'postgresql' })(options)
      const atomic = <T>(operation: (tx: Transaction, writer: Operations) => Promise<T>): Promise<T> => {
        if (activeTx) return operation(activeTx, raw)
        return client.$transaction(tx => operation(tx, prismaAdapter(tx, { provider: 'postgresql' })(options)), transactionOptions)
      }
      async function lockTarget(tx: Transaction, writer: Operations, model: string, where: Conditions, update: Record<string, unknown>) {
        if (where.some(condition => condition.connector === 'OR')) denied()
        const exact = (field: string) => {
          const matches = where.filter(condition => condition.field === field)
          if (matches.length !== 1) return undefined
          const condition = matches[0]
          return (!condition.operator || condition.operator === 'eq') && condition.mode !== 'insensitive'
            && typeof condition.value === 'string' ? condition.value : undefined
        }
        if (model === 'user') {
          if ('role' in update || 'isActive' in update || 'isBanned' in update || 'id' in update) denied()
          await lockEligibleUser(tx, exact('id'))
        } else {
          if ('userId' in update || 'id' in update) denied()
          const id = exact('id')
          if (id) {
            const record = await writer.findOne<{ userId: string }>({ model: 'account', where, select: ['userId'] })
            await lockEligibleUser(tx, record?.userId)
          } else {
            // Native password updateMany targets a user; broad/OR conditions fail closed.
            await lockEligibleUser(tx, exact('userId'))
          }
        }
      }
      return {
        ...raw,
        async create(params) {
          if (params.model === 'user') denied()
          if (['account', 'passkey', 'session'].includes(params.model)) {
            return atomic(async (tx, writer) => {
              await lockEligibleUser(tx, params.data.userId)
              return writer.create(params)
            })
          }
          return raw.create(params)
        },
        async update(params) {
          if (params.model === 'account' || params.model === 'user') {
            return atomic(async (tx, writer) => {
              await lockTarget(tx, writer, params.model, params.where, params.update)
              return writer.update(params)
            })
          }
          return raw.update(params)
        },
        async updateMany(params) {
          if (params.model === 'account' || params.model === 'user') {
            return atomic(async (tx, writer) => {
              await lockTarget(tx, writer, params.model, params.where, params.update)
              return writer.updateMany(params)
            })
          }
          return raw.updateMany(params)
        },
        transaction: callback => activeTx
          ? callback(protect(activeTx, activeTx))
          : client.$transaction(tx => callback(protect(tx, tx)), transactionOptions),
      }
    }
    return protect(client)
  }
}
