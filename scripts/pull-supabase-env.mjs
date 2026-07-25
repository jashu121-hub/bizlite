import fs from 'fs'
import path from 'path'

const candidates = [
  path.join(process.env.USERPROFILE || '', 'finance-app', '.env.local'),
  path.join(process.env.USERPROFILE || '', 'finance-app', '.env'),
  path.join(process.env.USERPROFILE || '', 'finance-app-fresh', '.env.local'),
  path.join(process.env.USERPROFILE || '', 'finance-app-fresh', '.env'),
  path.join(process.env.USERPROFILE || '', 'VehGuard', '.env'),
  path.join(process.env.USERPROFILE || '', '.env.local'),
]

function parseEnv(file) {
  if (!fs.existsSync(file)) return null
  const raw = fs.readFileSync(file, 'utf8')
  const out = {}
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue
    const i = line.indexOf('=')
    if (i === -1) continue
    const key = line.slice(0, i).trim()
    let val = line.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return { file, out }
}

const needed = [
  'DATABASE_URL',
  'DIRECT_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]

const aliases = {
  NEXT_PUBLIC_SUPABASE_URL: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'],
  NEXT_PUBLIC_SUPABASE_ANON_KEY: [
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  ],
  SUPABASE_SERVICE_ROLE_KEY: ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY'],
  DATABASE_URL: ['DATABASE_URL', 'POSTGRES_PRISMA_URL', 'POSTGRES_URL'],
  DIRECT_URL: ['DIRECT_URL', 'POSTGRES_URL_NON_POOLING', 'DATABASE_URL_UNPOOLED'],
}

function isUsable(v) {
  if (!v) return false
  if (v.includes('example') || v.includes('your-') || v.includes('[PROJECT')) return false
  if (v.includes('localhost') && !v.includes('supabase')) return false
  return true
}

const found = {}
const sources = {}

for (const file of candidates) {
  const parsed = parseEnv(file)
  if (!parsed) continue
  for (const key of needed) {
    if (found[key]) continue
    for (const alias of aliases[key]) {
      const val = parsed.out[alias]
      if (isUsable(val)) {
        found[key] = val
        sources[key] = `${path.basename(path.dirname(file))}/${path.basename(file)} via ${alias}`
        break
      }
    }
  }
}

const missing = needed.filter((k) => !found[k])
console.log(JSON.stringify({ found: Object.keys(found), missing, sources }, null, 2))

if (missing.length) {
  process.exitCode = 2
} else {
  const outPath = path.join(process.cwd(), '.env.supabase.tmp')
  const lines = needed.map((k) => `${k}=${JSON.stringify(found[k])}`)
  fs.writeFileSync(outPath, lines.join('\n') + '\n')
  console.log(`WROTE ${outPath}`)
}
