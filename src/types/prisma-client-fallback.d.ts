declare module '@prisma/client' {
  export namespace Prisma {
    export type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>
  }

  export type Account = {
    id: string
    userId: string
    accountId: string
    providerId: string
    accessToken: string | null
    refreshToken: string | null
    idToken: string | null
    expiresAt: Date | null
    password: string | null
    createdAt: Date
    updatedAt: Date
    accessTokenExpiresAt: Date | null
    refreshTokenExpiresAt: Date | null
    scope: string | null
  }

  type ConfigPayload = {
    id: string
    name: string
    content: string
    isActive: boolean
  }

  type UserConfigPayload = {
    configId: string
    config: ConfigPayload
  }

  type ActivationTokenPayload = {
    token: string
    used: boolean
  }

  type PasskeyPayload = {
    createdAt: Date | string | null
  }

  type UserPayload = {
    id: string
    email: string
    name: string | null
    role: string
    isActive: boolean
    isBanned: boolean
    expiresAt: Date | string | null
    createdAt: Date | string
    accounts: Account[]
    passkeys: PasskeyPayload[]
    userConfigs: UserConfigPayload[]
    activationToken: ActivationTokenPayload | null
    subscription?: unknown
  }

  type SubscriptionPayload = {
    id: string
    token: string
    maxAccess: number
    accessCount: number
    user: UserPayload
  }

  type Delegate<TFindUnique = any> = {
    findFirst(args?: unknown): Promise<TFindUnique | null>
    findMany(args?: unknown): Promise<TFindUnique[]>
    findUnique(args?: unknown): Promise<TFindUnique | null>
    findUniqueOrThrow(args?: unknown): Promise<TFindUnique>
    create(args?: unknown): Promise<TFindUnique>
    createMany(args?: unknown): Promise<any>
    update(args?: unknown): Promise<TFindUnique>
    updateMany(args?: unknown): Promise<any>
    upsert(args?: unknown): Promise<TFindUnique>
    delete(args?: unknown): Promise<TFindUnique>
    deleteMany(args?: unknown): Promise<any>
    count(args?: unknown): Promise<number>
    groupBy(args?: unknown): Promise<any[]>
    aggregate(args?: unknown): Promise<any>
  }

  export class PrismaClient {
    account: Delegate<Account>
    accessLog: Delegate
    activationToken: Delegate
    config: Delegate<ConfigPayload>
    passkey: Delegate
    securityEvent: Delegate
    session: Delegate
    subscription: Delegate<SubscriptionPayload>
    user: Delegate<UserPayload>
    userConfig: Delegate<UserConfigPayload>
    verification: Delegate
    $connect(): Promise<void>
    $disconnect(): Promise<void>
    $transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>
    $transaction<T extends readonly unknown[]>(queries: T): Promise<T>
    $on(event: string, callback: (...args: any[]) => void): void
    $use(middleware: (...args: any[]) => any): void
    $extends(extension: unknown): this
  }
}
