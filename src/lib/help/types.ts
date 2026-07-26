export type ManualBlock =
  | { type: 'p'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ol'; items: string[] }
  | { type: 'ul'; items: string[] }
  | { type: 'checklist'; items: string[] }
  | { type: 'tip'; text: string }
  | { type: 'info'; text: string }
  | { type: 'warning'; text: string }
  | { type: 'example'; title?: string; text: string }
  | { type: 'formula'; text: string }
  | { type: 'dl'; items: { term: string; definition: string }[] }

export type ManualSection = {
  id: string
  slug: string
  title: string
  icon: ManualIconName
  summary: string
  keywords: string[]
  content: ManualBlock[]
}

export type ManualIconName =
  | 'book'
  | 'rocket'
  | 'layout'
  | 'plus'
  | 'receipt'
  | 'wallet'
  | 'package'
  | 'calculator'
  | 'users'
  | 'landmark'
  | 'bar-chart'
  | 'settings'
  | 'edit'
  | 'trending'
  | 'help'

export type BusinessProfileManualData = {
  businessName?: string | null
  ownerName?: string | null
  phone?: string | null
  email?: string | null
  currency?: string | null
  businessType?: string | null
  address?: string | null
  logoUrl?: string | null
  financialYear?: string | null
  taxRegistrationNumber?: string | null
}
