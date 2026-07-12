'use server'

import { prisma } from '@/lib/prisma'
import { plain } from '@/lib/serialize'
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
  return { success: true, booking: plain(booking) }
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

export async function rescheduleBooking(bookingId: string, newStart: string, newEnd: string) {
  const user = await getUser()

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { asset: true },
  })

  if (!booking) return { error: 'Booking not found.' }
  if (booking.requestedById !== user.id && user.role !== 'ADMIN' && user.role !== 'ASSET_MANAGER') {
    return { error: 'Unauthorized to reschedule this booking.' }
  }
  if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') {
    return { error: 'Completed or cancelled bookings cannot be rescheduled.' }
  }

  const startTime = new Date(newStart)
  const endTime = new Date(newEnd)
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    return { error: 'Invalid start or end time.' }
  }
  if (startTime >= endTime) return { error: 'End time must be after start time.' }

  // §4.5 overlap check, excluding this booking itself
  const conflictingBooking = await prisma.booking.findFirst({
    where: {
      assetId: booking.assetId,
      id: { not: bookingId },
      status: { in: ['UPCOMING', 'ONGOING'] },
      AND: [
        { startTime: { lt: endTime } },
        { endTime: { gt: startTime } },
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

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { startTime, endTime, status: 'UPCOMING', reminderSentAt: null },
  })

  await createNotification({
    userId: booking.requestedById,
    type: 'BOOKING_CONFIRMED',
    message: `Booking rescheduled: ${booking.asset.name} is now reserved from ${formatTime(startTime)} to ${formatTime(endTime)}.`,
    entityType: 'Booking',
    entityId: bookingId,
  })

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'booking.reschedule',
      entityType: 'Booking',
      entityId: bookingId,
      metadata: {
        assetName: booking.asset.name,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      },
    },
  })

  revalidatePath('/bookings')
  revalidatePath('/dashboard')
  return { success: true, booking: updated }
}

// §4.5 Persist booking lifecycle transitions + fire due reminders
export async function syncBookingStatuses() {
  const now = new Date()

  await prisma.booking.updateMany({
    where: { status: { in: ['UPCOMING', 'ONGOING'] }, endTime: { lte: now } },
    data: { status: 'COMPLETED' },
  })

  await prisma.booking.updateMany({
    where: { status: 'UPCOMING', startTime: { lte: now }, endTime: { gt: now } },
    data: { status: 'ONGOING' },
  })

  // One-time reminders for bookings starting within the next 60 minutes
  const soon = new Date(now.getTime() + 60 * 60 * 1000)
  const dueForReminder = await prisma.booking.findMany({
    where: {
      status: 'UPCOMING',
      reminderSentAt: null,
      startTime: { gt: now, lte: soon },
    },
    include: { asset: true },
  })

  for (const booking of dueForReminder) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { reminderSentAt: now },
    })
    await createNotification({
      userId: booking.requestedById,
      type: 'BOOKING_REMINDER',
      message: `Reminder: your booking for ${booking.asset.name} starts at ${formatTime(booking.startTime)}.`,
      entityType: 'Booking',
      entityId: booking.id,
    })
  }
}

export async function getBookingsForAsset(assetId: string, date?: string) {
  await syncBookingStatuses()

  const targetDate = date ? new Date(date) : new Date()
  const dayStart = new Date(targetDate)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(targetDate)
  dayEnd.setHours(23, 59, 59, 999)

  // Include any booking that overlaps the day, not just fully-contained ones
  return prisma.booking.findMany({
    where: {
      assetId,
      status: { in: ['UPCOMING', 'ONGOING', 'COMPLETED'] },
      startTime: { lt: dayEnd },
      endTime: { gt: dayStart },
    },
    include: { requestedBy: true },
    orderBy: { startTime: 'asc' },
  })
}

export async function getActiveBookings() {
  await syncBookingStatuses()

  const now = new Date()
  return plain(await prisma.booking.findMany({
    where: {
      status: { in: ['UPCOMING', 'ONGOING'] },
      endTime: { gt: now },
    },
    include: { asset: true, requestedBy: true },
    orderBy: { startTime: 'asc' },
  }))
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}
