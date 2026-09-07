import { ActivationForm } from '@/components/workspace/activate'

export const metadata = { title: '激活账户' }
export default async function ActivatePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const token = typeof params.token === 'string' && params.token.length <= 512 ? params.token : null
  return <ActivationForm key={token || 'missing'} token={token}/>
}
