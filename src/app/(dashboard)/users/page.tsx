import { Suspense } from 'react'
import { AccountsPage } from '@/components/workspace/accounts'
import { Loading } from '@/components/workspace/ui'
export default function Page() { return <Suspense fallback={<Loading/>}><AccountsPage/></Suspense> }
