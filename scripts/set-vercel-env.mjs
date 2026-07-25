import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'

const source = path.join(process.env.USERPROFILE || '', 'finance-app', '.env.finance.prod')
const raw = fs.readFileSync(source, 'utf8')
const env = {}
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
  env[key] = val
}

const keys = [
  'DATABASE_URL',
  'DIRECT_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
]

for (const key of keys) {
  if (!env[key]) {
    console.error(`Missing ${key}`)
    process.exit(1)
  }
}

// Also write local .env for migrate
const localLines = keys.map((k) => `${k}="${env[k].replaceAll('"', '\\"')}"`)
localLines.push('SUPABASE_SERVICE_ROLE_KEY=""')
fs.writeFileSync(path.join(process.cwd(), '.env'), localLines.join('\n') + '\n')
console.log('Updated local .env')

for (const key of keys) {
  for (const environment of ['production', 'preview', 'development']) {
    const result = spawnSync(
      'npx',
      ['vercel', 'env', 'add', key, environment, '--scope', 'jamhads-projects', '--force'],
      {
        input: env[key] + '\n',
        encoding: 'utf8',
        shell: true,
        cwd: process.cwd(),
      },
    )
    if (result.status !== 0) {
      console.error(`Failed ${key} ${environment}:`, result.stderr || result.stdout)
      process.exit(result.status || 1)
    }
    console.log(`Set ${key} (${environment})`)
  }
}

console.log('All Vercel env vars set')
