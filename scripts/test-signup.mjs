import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

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
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

for (const email of [
  'Test@bizlite.com',
  `bizlite.user.${Date.now()}@gmail.com`,
]) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: 'TestPass123!',
  })
  console.log(email, '=>', error?.message || `OK user=${data.user?.id} session=${!!data.session}`)
}
