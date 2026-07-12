'use server'

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
