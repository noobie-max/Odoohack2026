'use server'

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { bookingSchema } from '@/lib/validators'
import { revalidatePath } from 'next/cache'
import { createNotification } from './notifications'

async function getUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error('Unauthorized')
  return session.user as { id: string; role: any; departmentId: string | null }
}

export async function createBooking(data: {
  assetId: string
  startTime: string
  endTime: string
}) {
  const user = await getUser()

  const parsed = bookingSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const asset = await prisma.asset.findUnique({ where: { id: parsed.data.assetId } })
  if (!asset) return { error: 'Resource not found.' }
  if (!asset.isBookable) return { error: 'This asset is not a bookable resource.' }

  const startTime = new Date(parsed.data.startTime)
  const endTime = new Date(parsed.data.endTime)

  // §4.5 BUSINESS RULE: Strict inequality overlap check — allows back-to-back bookings
  // existing.startTime < new.endTime AND existing.endTime > new.startTime
  const conflictingBooking = await prisma.booking.findFirst({
    where: {
      assetId: parsed.data.assetId,
      status: { in: ['UPCOMING', 'ONGOING'] },
      AND: [
        { startTime: { lt: endTime } },   // existing start < new end
        { endTime: { gt: startTime } },   // existing end > new start
      ],
    },
    include: { requestedBy: true },
  })

  if (conflictingBooking) {
    return {
      error: `Slot unavailable. Requested ${formatTime(startTime)}–${formatTime(endTime)} conflicts with an existing booking (${formatTime(conflictingBooking.startTime)}–${formatTime(conflictingBooking.endTime)}).`,
      conflict: conflictingBooking,
    }
  }

  const booking = await prisma.booking.create({
    data: {
      assetId: parsed.data.assetId,
      requestedById: user.id,
      departmentId: user.departmentId,
      startTime,
      endTime,
      status: 'UPCOMING',
    },
    include: { asset: true },
  })

  await createNotification({
    userId: user.id,
    type: 'BOOKING_CONFIRMED',
    message: `Booking confirmed for ${asset.name} from ${formatTime(startTime)} to ${formatTime(endTime)}.`,
    entityType: 'Booking',
    entityId: booking.id,
  })

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'booking.create',
      entityType: 'Booking',
      entityId: booking.id,
      metadata: {
        assetName: asset.name,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      },
    },
  })

  revalidatePath('/bookings')
  revalidatePath('/dashboard')
  return { success: true, booking }
}

export async function cancelBooking(bookingId: string) {
  const user = await getUser()

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { asset: true },
  })

  if (!booking) return { error: 'Booking not found.' }
  if (booking.requestedById !== user.id && user.role !== 'ADMIN' && user.role !== 'ASSET_MANAGER') {
    return { error: 'Unauthorized to cancel this booking.' }
  }
  if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') {
    return { error: 'Booking is already completed or cancelled.' }
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CANCELLED' },
  })

  await createNotification({
    userId: booking.requestedById,
    type: 'BOOKING_CANCELLED',
    message: `Booking for ${booking.asset.name} has been cancelled.`,
    entityType: 'Booking',
    entityId: bookingId,
  })

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'booking.cancel',
      entityType: 'Booking',
      entityId: bookingId,
      metadata: { assetName: booking.asset.name },
    },
  })

  revalidatePath('/bookings')
  return { success: true }
}

export async function getBookingsForAsset(assetId: string, date?: string) {
  const targetDate = date ? new Date(date) : new Date()
  const dayStart = new Date(targetDate)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(targetDate)
  dayEnd.setHours(23, 59, 59, 999)

  const now = new Date()

  const bookings = await prisma.booking.findMany({
    where: {
      assetId,
      status: { in: ['UPCOMING', 'ONGOING', 'COMPLETED'] },
      startTime: { gte: dayStart },
      endTime: { lte: dayEnd },
    },
    include: { requestedBy: true },
    orderBy: { startTime: 'asc' },
  })

  // Derive booking status based on current time (§4.5 — derive on read)
  return bookings.map((b) => {
    let derivedStatus = b.status
    if (b.status !== 'CANCELLED') {
      if (now >= b.startTime && now <= b.endTime) derivedStatus = 'ONGOING'
      else if (now > b.endTime) derivedStatus = 'COMPLETED'
    }
    return { ...b, status: derivedStatus }
  })
}

export async function getActiveBookings() {
  const now = new Date()
  return prisma.booking.findMany({
    where: {
      status: { in: ['UPCOMING', 'ONGOING'] },
      endTime: { gt: now },
    },
    include: { asset: true, requestedBy: true },
    orderBy: { startTime: 'asc' },
  })
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}
