import { redirect } from 'next/navigation'
import { prisma } from './prisma'
import { createClient } from './supabase/server'
import { ensureExpenseCategories } from './expense-categories'

export async function getSessionUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function requireUser() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  return user
}

export async function getUserProfile() {
  const user = await requireUser()
  const profile = await prisma.userProfile.findUnique({ where: { id: user.id } })
  return { user, profile }
}

export async function requireProfile() {
  const { user, profile } = await getUserProfile()
  if (!profile) {
    await prisma.userProfile.create({
      data: {
        id: user.id,
        email: user.email ?? '',
      },
    })
    await ensureExpenseCategories(user.id)
    redirect('/setup')
  }
  if (!profile.setupCompleted) redirect('/setup')
  return { user, profile }
}

export async function ensureProfile(userId: string, email: string) {
  const profile = await prisma.userProfile.upsert({
    where: { id: userId },
    update: { email },
    create: { id: userId, email },
  })
  await ensureExpenseCategories(userId)
  return profile
}
