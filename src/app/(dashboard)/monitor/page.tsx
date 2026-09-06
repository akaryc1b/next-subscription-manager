import { Suspense } from 'react'
import { ActivityPage } from '@/components/workspace/activity'
import { Loading } from '@/components/workspace/ui'
export default function Page() { return <Suspense fallback={<Loading/>}><ActivityPage/></Suspense> }
