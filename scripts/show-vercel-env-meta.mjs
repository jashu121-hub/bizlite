import fs from 'fs'
const raw = fs.readFileSync('.env.vercel.check', 'utf8')
for (const line of raw.split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue
  const i = line.indexOf('=')
  if (i < 0) continue
  const k = line.slice(0, i)
  let v = line.slice(i + 1)
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1)
  }
  console.log(k, 'len=' + v.length, 'valuePreview=' + JSON.stringify(v.slice(0, 20)))
}
