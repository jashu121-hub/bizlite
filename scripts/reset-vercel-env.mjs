import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'
import os from 'os'

function load(file) {
  const o = {}
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf('=')
    if (i < 0) continue
    let v = line.slice(i + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    o[line.slice(0, i).trim()] = v
  }
  return o
}

const env = load('.env')
const keys = [
  'DATABASE_URL',
  'DIRECT_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
]
const environments = ['production', 'preview', 'development']

for (const key of keys) {
  if (!env[key]) throw new Error(`Missing ${key} in .env`)
  for (const environment of environments) {
    // Remove existing
    spawnSync(
      'npx',
      ['vercel', 'env', 'rm', key, environment, '--scope', 'jamhads-projects', '--yes'],
      { shell: true, encoding: 'utf8', stdio: 'ignore' },
    )

    const tmp = path.join(os.tmpdir(), `bizlite-${key}-${environment}.txt`)
    fs.writeFileSync(tmp, env[key], 'utf8')

    const result = spawnSync(
      `Get-Content -Raw "${tmp}" | npx vercel env add ${key} ${environment} --scope jamhads-projects`,
      {
        shell: 'powershell.exe',
        encoding: 'utf8',
      },
    )
    fs.unlinkSync(tmp)

    if (result.status !== 0) {
      console.error(result.stdout)
      console.error(result.stderr)
      throw new Error(`Failed to set ${key} for ${environment}`)
    }
    console.log(`OK ${key} ${environment} (len=${env[key].length})`)
  }
}

console.log('Done')
