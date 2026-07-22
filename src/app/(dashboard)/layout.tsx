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
    <div className="relative flex min-h-[100dvh] overflow-hidden p-2 sm:p-3 lg:p-4">
      <div className="liquid-orb -left-32 -top-32 h-72 w-72 bg-accent-primary/20" />
      <div className="liquid-orb -bottom-40 -right-32 h-80 w-80 bg-accent-info/10" />
      <div className="hidden lg:relative lg:z-10 lg:block">
        <Sidebar />
      </div>
      <div className="relative z-10 flex min-w-0 flex-1 flex-col gap-2 sm:gap-3 lg:gap-4 lg:pl-4">
        <Header />
        <main className="flex-1 overflow-y-auto overscroll-contain rounded-2xl border border-border bg-background-secondary/80 p-3 pb-[calc(env(safe-area-inset-bottom)+6.25rem)] shadow-2xl backdrop-blur-2xl sm:p-4 sm:pb-[calc(env(safe-area-inset-bottom)+6.25rem)] lg:p-5 lg:pb-5 xl:p-6">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  )
}
