import fs from 'fs'

function load(f) {
  const o = {}
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    if (!line || line[0] === '#') continue
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

const a = load('.env')
const b = load('.env.vercel.check')
for (const k of [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'DATABASE_URL',
  'DIRECT_URL',
]) {
  console.log(k, {
    localLen: a[k]?.length,
    vercelLen: b[k]?.length,
    match: a[k] === b[k],
  })
}
