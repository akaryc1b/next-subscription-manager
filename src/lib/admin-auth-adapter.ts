import { APIError } from 'better-auth/api'
import type { prismaAdapter } from 'better-auth/adapters/prisma'
import { canAdminLogin, type LoginAccount } from './admin-login-policy'

type AdapterFactory = ReturnType<typeof prismaAdapter>
type Adapter = ReturnType<AdapterFactory>
type Operations = Omit<Adapter, 'transaction'>
type Lookup = (userId: string) => Promise<LoginAccount | null>
type Conditions = Parameters<Operations['update']>[0]['where']

function denied(): never {
  throw new APIError('FORBIDDEN', { code: 'ADMIN_ONLY', message: '仅启用且未封禁的管理员可以管理认证方式' })
}

/** Guard the actual binding owner, including OAuth callbacks without a session. */
export function adminAuthAdapter(factory: AdapterFactory, lookup: Lookup): AdapterFactory {
  const check = async (userId: unknown) => {
    if (typeof userId !== 'string' || !userId || !canAdminLogin(await lookup(userId))) denied()
  }
  function protect(raw: Operations): Operations {
    async function checkTarget(model: string, where: Conditions, update: Record<string, unknown>) {
      // All current auth writes target one id or one user's accounts. Fail closed
      // rather than checking one arbitrary result of an OR/broad bulk update.
      if (where.some(condition => condition.connector === 'OR')) denied()
      const exact = (field: string) => where.find(condition => condition.field === field
        && (!condition.operator || condition.operator === 'eq') && condition.mode !== 'insensitive'
        && typeof condition.value === 'string')?.value
      if (model === 'user') {
        if ('role' in update || 'isActive' in update || 'isBanned' in update || 'id' in update) denied()
        await check(exact('id'))
      } else {
        if ('userId' in update || 'id' in update) denied()
        const id = exact('id')
        const record = typeof id === 'string'
          ? await raw.findOne<{ userId: string }>({ model: 'account', where: [{ field: 'id', value: id }], select: ['userId'] })
          : null
        await check(record?.userId ?? exact('userId'))
      }
    }
    return {
      ...raw,
      async create(params) {
        // Administrators are provisioned by the protected management API, not by
        // implicit OAuth registration. Subscription accounts never enroll here.
        if (params.model === 'user') denied()
        if (params.model === 'account' || params.model === 'passkey') await check(params.data.userId)
        return raw.create(params)
      },
      async update(params) {
        if (params.model === 'account' || params.model === 'user') await checkTarget(params.model, params.where, params.update)
        return raw.update(params)
      },
      async updateMany(params) {
        if (params.model === 'account' || params.model === 'user') await checkTarget(params.model, params.where, params.update)
        return raw.updateMany(params)
      },
    }
  }
  return options => {
    const raw = factory(options)
    return { ...protect(raw), transaction: callback => raw.transaction(tx => callback(protect(tx))) }
  }
}
