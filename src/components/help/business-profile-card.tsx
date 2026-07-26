import { Building2 } from 'lucide-react'

import type { BusinessProfileManualData } from '@/lib/help/types'

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[10rem_1fr] sm:gap-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="text-sm font-medium text-zinc-900">{value}</dd>
    </div>
  )
}

export function BusinessProfileCard({ profile }: { profile: BusinessProfileManualData }) {
  const rows: { label: string; value: string }[] = []

  if (profile.businessName?.trim()) {
    rows.push({ label: 'Business name', value: profile.businessName.trim() })
  }
  if (profile.ownerName?.trim()) {
    rows.push({ label: 'Owner name', value: profile.ownerName.trim() })
  }
  if (profile.businessType?.trim()) {
    rows.push({ label: 'Business type', value: profile.businessType.trim() })
  }
  if (profile.phone?.trim()) {
    rows.push({ label: 'Phone number', value: profile.phone.trim() })
  }
  if (profile.email?.trim()) {
    rows.push({ label: 'Email address', value: profile.email.trim() })
  }
  if (profile.address?.trim()) {
    rows.push({ label: 'Address', value: profile.address.trim() })
  }
  if (profile.currency?.trim()) {
    rows.push({ label: 'Currency', value: profile.currency.trim() })
  }
  if (profile.financialYear?.trim()) {
    rows.push({ label: 'Financial year', value: profile.financialYear.trim() })
  }
  if (profile.taxRegistrationNumber?.trim()) {
    rows.push({
      label: 'Tax registration number',
      value: profile.taxRegistrationNumber.trim(),
    })
  }

  const logoUrl = profile.logoUrl?.trim() || null

  if (rows.length === 0 && !logoUrl) {
    return (
      <div className="rounded-xl border border-dashed border-teal-200 bg-teal-50/40 p-4 text-sm text-zinc-600">
        <p className="font-medium text-teal-900">Your business profile</p>
        <p className="mt-1">
          No business details yet. Complete your Business Profile in Settings to show them here.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-teal-100 bg-gradient-to-br from-white to-teal-50/50 p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        {logoUrl ? (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-teal-100 bg-white p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Business logo" className="max-h-full max-w-full object-contain" />
          </div>
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
            Your business profile
          </p>
          <p className="mt-0.5 text-base font-semibold text-zinc-900">
            {profile.businessName?.trim() || 'Business details'}
          </p>
          <p className="text-xs text-zinc-500">Loaded from Settings → Business Profile</p>
        </div>
      </div>
      <dl className="space-y-3">
        {rows.map((row) => (
          <DetailRow key={row.label} label={row.label} value={row.value} />
        ))}
      </dl>
    </div>
  )
}
