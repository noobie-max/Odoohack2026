import { Prisma } from '@prisma/client'

// Prisma Decimal instances can't cross the RSC/server-action boundary —
// convert them to plain numbers, recursively, leaving Dates intact.
export function plain<T>(value: T): T {
  if (value === null || value === undefined) return value
  if (Prisma.Decimal.isDecimal(value as unknown as object)) {
    return Number(value) as unknown as T
  }
  if (value instanceof Date) return value
  if (Array.isArray(value)) {
    return value.map(plain) as unknown as T
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = plain(v)
    }
    return out as T
  }
  return value
}
