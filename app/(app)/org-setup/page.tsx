import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDepartments, getCategories, getUsers } from '@/lib/actions/org'
import { OrgSetupClient } from './OrgSetupClient'

export const dynamic = 'force-dynamic'

export default async function OrgSetupPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  // Server-side admin guard
  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const [departments, categories, users] = await Promise.all([
    getDepartments(),
    getCategories(),
    getUsers(),
  ])

  return <OrgSetupClient departments={departments} categories={categories} users={users} />
}
