import { LoginForm } from '@/components/workspace/login'

export const metadata = { title: '管理员登录' }
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  return <LoginForm githubEnabled={Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)} forbidden={params.reason === 'forbidden'} activated={params.activated === '1'} callbackError={Boolean(params.error)}/>
}
