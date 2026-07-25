import fs from 'fs'
import path from 'path'

function load(file) {
  if (!fs.existsSync(file)) return null
  const out = {}
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf('=')
    if (i < 0) continue
    let v = line.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    out[line.slice(0, i).trim()] = v
  }
  return out
}

const files = [
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), '.env.local'),
  path.join(process.env.USERPROFILE, 'finance-app', '.env.local'),
  path.join(process.env.USERPROFILE, 'finance-app', '.env'),
]

for (const file of files) {
  const env = load(file)
  if (!env) continue
  console.log('\nFILE', file)
  for (const k of [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY',
    'SUPABASE_ANON_KEY',
  ]) {
    const v = env[k]
    if (!v) continue
    console.log(
      k,
      'len=' + v.length,
      'prefix=' + v.slice(0, 12),
      'looksJwt=' + v.startsWith('eyJ'),
      'looksSb=' + v.startsWith('sb_'),
    )
  }
}
