import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { AccountSettings } from '@/components/workspace/settings'

export const metadata = { title: '账户设置' }
export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth.api.getSession({ headers: await headers(), query: { disableCookieCache: true } })
  if (!session) redirect('/login')
  const params = await searchParams
  return <AccountSettings user={{ id: session.user.id, email: session.user.email, name: session.user.name || '' }} currentSessionId={session.session.id} githubEnabled={Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)} callbackError={Boolean(params.error)}/>
}
