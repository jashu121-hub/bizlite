import fs from 'fs'
const e = fs.readFileSync('.env', 'utf8')
const keys = [
  'DATABASE_URL',
  'DIRECT_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]
for (const k of keys) {
  const m = e.match(new RegExp(`^${k}=(.*)$`, 'm'))
  const v = (m?.[1] || '').replace(/^["']|["']$/g, '')
  const ok =
    v &&
    !v.includes('example') &&
    !v.includes('[PROJECT') &&
    !v.includes('your-') &&
    !v.includes('localhost')
  console.log(`${k}: ${ok ? 'SET' : 'PLACEHOLDER/MISSING'}`)
}
