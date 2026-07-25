import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

function withPoolParams(url: string | undefined) {
  if (!url) return url
  try {
    const parsed = new URL(url)
    // Always enforce serverless-friendly pool settings (override env if too low)
    parsed.searchParams.set('connection_limit', '5')
    parsed.searchParams.set('pool_timeout', '20')
    parsed.searchParams.set('connect_timeout', '15')
    if (!parsed.searchParams.has('pgbouncer') && parsed.port === '6543') {
      parsed.searchParams.set('pgbouncer', 'true')
    }
    return parsed.toString()
  } catch {
    return url
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: withPoolParams(process.env.DATABASE_URL),
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
