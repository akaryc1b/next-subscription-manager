import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WorkspaceShell } from '@/components/workspace/shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers(), query: { disableCookieCache: true } })
  if (!session?.user?.id) redirect('/login')
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, isActive: true, isBanned: true } })
  if (!user || user.role !== 'admin' || !user.isActive || user.isBanned) redirect('/login?reason=forbidden')
  return <WorkspaceShell>{children}</WorkspaceShell>
}
