import Link from 'next/link'

export const metadata = {
  title: '激活入口已停用',
  robots: { index: false, follow: false },
  referrer: 'no-referrer' as const,
}

// Do not pass URL tokens into a client component or fetch a legacy activation API.
export default function ActivatePage() {
  return <div className="p-auth-content">
    <h1>此链接已停用</h1>
    <p className="o-description">订阅用户无需激活或登录，请使用管理员提供的订阅链接。</p>
    <Link prefetch={false} className="o-button" href="/login">管理员登录</Link>
  </div>
}
