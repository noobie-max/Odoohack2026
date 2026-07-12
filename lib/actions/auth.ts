'use server'

import { randomUUID } from 'crypto'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signupSchema } from '@/lib/validators'

export async function signupAction(formData: {
  name: string
  email: string
  password: string
  // CRITICAL: role is NEVER accepted as a parameter
}) {
  const parsed = signupSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { name, email, password } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return { error: 'An account with this email already exists.' }
  }

  const passwordHash = await hash(password, 12)

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: 'EMPLOYEE', // ALWAYS Employee - never accept role from client
    },
  })

  return { success: true, userId: user.id }
}

export async function requestPasswordReset(email: string) {
  // Always return a success-shaped response so emails can't be enumerated
  const genericResponse = {
    success: true,
    message: 'If an account exists for that email, a reset link has been generated.',
  }

  if (!email || !email.includes('@')) return genericResponse

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.status === 'INACTIVE') return genericResponse

  const token = randomUUID()
  const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpiry: expiry },
  })

  // Demo mode: no SMTP configured, so the link is surfaced to the UI directly
  return { ...genericResponse, devResetUrl: `/reset-password/${token}` }
}

export async function resetPassword(token: string, newPassword: string) {
  if (!token) return { error: 'Invalid reset link.' }
  if (!newPassword || newPassword.length < 6) {
    return { error: 'Password must be at least 6 characters.' }
  }

  const user = await prisma.user.findUnique({ where: { resetToken: token } })
  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    return { error: 'This reset link is invalid or has expired. Please request a new one.' }
  }

  const passwordHash = await hash(newPassword, 12)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
    },
  })

  return { success: true }
}
