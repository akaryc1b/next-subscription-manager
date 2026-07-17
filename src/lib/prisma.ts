import type { PrismaClient as PrismaClientType } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientType | undefined
}

type PrismaClientConstructor = new () => PrismaClientType

function createPrismaClient() {
  // Delay loading the generated Prisma client until the app actually touches
  // the database. This keeps Next.js page-data collection from crashing in
  // environments where `prisma generate` has not populated node_modules yet.
  const { PrismaClient } = require('@prisma/client') as {
    PrismaClient: PrismaClientConstructor
  }

  return new PrismaClient()
}

function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }

  return globalForPrisma.prisma
}

export const prisma = new Proxy({} as PrismaClientType, {
  get(_target, property, receiver) {
    return Reflect.get(getPrismaClient(), property, receiver)
  },
})
