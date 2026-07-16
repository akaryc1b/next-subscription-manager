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
    <div className="relative flex min-h-[100dvh] overflow-hidden p-3 lg:p-4">
      <div className="liquid-orb left-[-8rem] top-[-8rem] h-80 w-80 bg-background-active" />
      <div className="liquid-orb bottom-[-10rem] right-[-6rem] h-96 w-96 bg-background-active" />
      <div className="hidden lg:block relative z-10">
        <Sidebar />
      </div>
      <div className="relative z-10 flex min-w-0 flex-1 flex-col gap-3 lg:gap-4 lg:pl-4">
        <Header />
        <main className="flex-1 overflow-y-auto rounded-[2rem] border border-border bg-background-secondary p-4 backdrop-blur-2xl lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
