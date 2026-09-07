import type { Metadata } from 'next'
import './globals.css'
import '@/styles/workspace.css'
import '@/styles/product.css'
import { ThemeProvider } from '@/components/theme-provider'
import { HistoryGuard } from '@/components/workspace/history-guard'

export const metadata: Metadata = {
  title: { default: 'sub. · 订阅工作空间', template: '%s · sub.' },
  description: '管理订阅授权、配置分发和访问记录。让重要的事一目了然。',
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><body><ThemeProvider><HistoryGuard/>{children}</ThemeProvider></body></html>
}
