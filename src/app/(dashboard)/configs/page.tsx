import { Suspense } from 'react'
import { ProfilesPage } from '@/components/workspace/profiles'
import { Loading } from '@/components/workspace/ui'
export default function Page() { return <Suspense fallback={<Loading/>}><ProfilesPage/></Suspense> }
