import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Sidebar } from '@/components/features/sidebar'
import { Header } from '@/components/features/header'
import { MobileBottomNav } from '@/components/features/mobile-bottom-nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
    query: {
      disableCookieCache: true,
    },
  })

  if (!session?.user?.id) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      isActive: true,
      isBanned: true,
    },
  })

  if (!user || user.role !== 'admin' || !user.isActive || user.isBanned) {
    redirect('/login?reason=forbidden')
  }

  return (
    <div className="workspace-shell">
      <div className="hidden shrink-0 lg:block">
        <Sidebar />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header />
        <main className="workspace-main pb-[calc(env(safe-area-inset-bottom)+5.75rem)] lg:pb-0">
          <div className="workspace-canvas">{children}</div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  )
}
