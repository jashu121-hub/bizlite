import { ManualView } from '@/components/help/manual-view'
import { requireProfile } from '@/lib/auth'

export default async function HelpPage() {
  const { profile } = await requireProfile()

  return (
    <ManualView
      profile={{
        businessName: profile.businessName,
        ownerName: profile.ownerName,
        phone: profile.phone,
        email: profile.email,
        currency: profile.currency,
      }}
    />
  )
}
