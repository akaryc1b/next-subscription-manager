import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAdminLogin } from '@/lib/admin-login-policy'
import { AccountSettings } from '@/components/workspace/settings'

export const metadata = { title: '账户设置' }
export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth.api.getSession({ headers: await headers(), query: { disableCookieCache: true } })
  if (!session?.user?.id) redirect('/login')
  // Server pages can render independently of their parent layout. Guard before
  // serializing any account/session props into HTML or the RSC payload.
  const account = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, isActive: true, isBanned: true } })
  if (!canAdminLogin(account)) redirect('/login?reason=forbidden')
  const params = await searchParams
  return <AccountSettings user={{ id: session.user.id, email: session.user.email, name: session.user.name || '' }} currentSessionId={session.session.id} githubEnabled={Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)} callbackError={Boolean(params.error)}/>
}
