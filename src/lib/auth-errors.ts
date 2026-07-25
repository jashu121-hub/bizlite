export function friendlyAuthError(message: string | null | undefined): string {
  const m = (message || '').toLowerCase()

  if (!message) return 'Something went wrong. Please try again.'

  if (m.includes('rate limit') || m.includes('email rate limit')) {
    return 'Too many signup emails were sent. Wait about an hour, or in Supabase go to Authentication → Providers → Email and turn off “Confirm email”, then try again.'
  }

  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'This email is already registered. Please sign in instead.'
  }

  if (m.includes('invalid login') || m.includes('invalid credentials')) {
    return 'Incorrect email or password.'
  }

  if (m.includes('email address') && m.includes('invalid')) {
    return 'Please use a real email address (Gmail, Outlook, etc.).'
  }

  if (m.includes('fetch') || m.includes('supabase is not configured')) {
    return 'Server not connected. Check Supabase environment variables on Vercel.'
  }

  return message
}
