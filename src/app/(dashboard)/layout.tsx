'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Sidebar } from '@/components/features/sidebar'
import { Header } from '@/components/features/header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/login')
    }
  }, [session, isPending, router])

  if (isPending || !session) {
    return null
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
        <main className="flex-1 overflow-y-auto rounded-[1.5rem] border border-border bg-background-secondary p-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-2xl sm:rounded-[2rem] sm:p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
