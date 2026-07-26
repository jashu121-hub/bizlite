import type { Metadata } from 'next'

import { APP_NAME } from '@/lib/constants'

export const metadata: Metadata = {
  title: `${APP_NAME} User Manual`,
  description: `${APP_NAME} user guide for managing sales, expenses, products, customers, and reports.`,
}

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children
}
