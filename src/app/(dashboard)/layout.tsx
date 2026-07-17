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
    <div className="relative flex min-h-[100dvh] overflow-hidden px-2 py-2 sm:px-3 lg:p-4">
      <div className="liquid-orb left-[-10rem] top-[-9rem] h-72 w-72 bg-background-active sm:h-80 sm:w-80" />
      <div className="liquid-orb bottom-[-10rem] right-[-8rem] h-80 w-80 bg-background-active sm:h-96 sm:w-96" />
      <div className="hidden lg:relative lg:z-10 lg:block">
        <Sidebar />
      </div>
      <div className="relative z-10 flex min-w-0 flex-1 flex-col gap-2 sm:gap-3 lg:gap-4 lg:pl-4">
        <Header />
        <main className="flex-1 overflow-y-auto rounded-[1.5rem] border border-border bg-background-secondary p-3 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] sm:rounded-[2rem] sm:p-4 sm:pb-[calc(env(safe-area-inset-bottom)+6.5rem)] lg:p-6 lg:pb-6">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  )
}
