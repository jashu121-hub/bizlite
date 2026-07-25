'use client'

import { useRouter } from 'next/navigation'
import * as React from 'react'

import { createClient } from '@/lib/supabase/client'

export function useLogout() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)

  const logout = React.useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }, [router])

  return { logout, loading }
}
