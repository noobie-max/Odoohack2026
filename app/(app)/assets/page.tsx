import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAssets } from '@/lib/actions/assets'
import { getCategories, getDepartments } from '@/lib/actions/org'
import { AssetsClient } from './AssetsClient'

export const dynamic = 'force-dynamic'

export default async function AssetsPage() {
  const session = await getServerSession(authOptions)
  const [assets, categories, departments] = await Promise.all([
    getAssets(),
    getCategories(),
    getDepartments(),
  ])

  return (
    <AssetsClient
      assets={assets as any}
      categories={categories}
      departments={departments as any}
      userRole={session?.user?.role as string}
    />
  )
}
