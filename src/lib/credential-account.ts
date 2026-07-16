import type { Account, Prisma } from '@prisma/client'
import { hashPassword } from 'better-auth/crypto'
import { prisma } from '@/lib/prisma'

export const CREDENTIAL_PROVIDER_ID = 'credential'

type AccountStore = typeof prisma | Prisma.TransactionClient

type AccountSummary = Pick<Account, 'id' | 'providerId' | 'password' | 'createdAt'>

export function getCredentialAccount(accounts: AccountSummary[]) {
  return accounts.find(
    account => account.providerId === CREDENTIAL_PROVIDER_ID && Boolean(account.password)
  )
}

export async function hashCredentialPassword(password: string) {
  return hashPassword(password)
}

export async function upsertCredentialPassword(
  db: AccountStore,
  userId: string,
  passwordHash: string
) {
  const existingAccount = await db.account.findFirst({
    where: {
      userId,
      providerId: CREDENTIAL_PROVIDER_ID,
    },
  })

  if (existingAccount) {
    return db.account.update({
      where: { id: existingAccount.id },
      data: {
        accountId: userId,
        password: passwordHash,
      },
    })
  }

  return db.account.create({
    data: {
      userId,
      accountId: userId,
      providerId: CREDENTIAL_PROVIDER_ID,
      password: passwordHash,
    },
  })
}

export async function deleteCredentialAccounts(db: AccountStore, userId: string) {
  return db.account.deleteMany({
    where: {
      userId,
      providerId: CREDENTIAL_PROVIDER_ID,
    },
  })
}
