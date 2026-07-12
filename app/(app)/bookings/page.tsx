import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAssets } from '@/lib/actions/assets'
import { getActiveBookings } from '@/lib/actions/bookings'
import { BookingsClient } from './BookingsClient'

export const dynamic = 'force-dynamic'

export default async function BookingsPage() {
  const session = await getServerSession(authOptions)
  const [bookableAssets, activeBookings] = await Promise.all([
    getAssets({ isBookable: true }),
    getActiveBookings(),
  ])

  return (
    <BookingsClient
      bookableAssets={bookableAssets as any}
      activeBookings={activeBookings as any}
      userId={session?.user?.id as string}
      role={session?.user?.role as string}
    />
  )
}
