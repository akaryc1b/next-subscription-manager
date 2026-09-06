import type { Metadata } from 'next'
import { AuthFrame } from '@/components/workspace/auth-ui'

export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: 'no-referrer' }
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthFrame>{children}</AuthFrame>
}
