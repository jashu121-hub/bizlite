import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const outDir = join(process.cwd(), 'public', 'icons')
mkdirSync(outDir, { recursive: true })

async function makeIcon(size: number, maskable = false) {
  const padding = maskable ? Math.round(size * 0.18) : Math.round(size * 0.18)
  const inner = size - padding * 2
  const radius = Math.round(inner * 0.22)
  const fontSize = Math.round(inner * 0.55)

  const svg = `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="${maskable ? '#0f766e' : 'transparent'}"/>
    <rect x="${padding}" y="${padding}" width="${inner}" height="${inner}" rx="${radius}" fill="#0f766e"/>
    <text x="${size / 2}" y="${size / 2 + fontSize * 0.35}" text-anchor="middle"
      font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="${fontSize}" fill="#ffffff">B</text>
    <circle cx="${padding + inner * 0.78}" cy="${padding + inner * 0.28}" r="${inner * 0.08}" fill="#5eead4"/>
  </svg>`

  const name = maskable ? `maskable-${size}x${size}.png` : `icon-${size}x${size}.png`
  await sharp(Buffer.from(svg)).png().toFile(join(outDir, name))
}

async function main() {
  await makeIcon(192, false)
  await makeIcon(512, false)
  await makeIcon(192, true)
  await makeIcon(512, true)

  const apple = `
  <svg width="180" height="180" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
    <rect width="180" height="180" rx="40" fill="#0f766e"/>
    <text x="90" y="118" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
      font-weight="800" font-size="96" fill="#ffffff">B</text>
    <circle cx="132" cy="48" r="12" fill="#5eead4"/>
  </svg>`
  await sharp(Buffer.from(apple)).png().toFile(join(outDir, 'apple-touch-icon.png'))

  const favicon = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
    <rect width="32" height="32" rx="8" fill="#0f766e"/>
    <text x="16" y="23" text-anchor="middle" font-family="Arial" font-weight="800" font-size="18" fill="#fff">B</text>
  </svg>`
  writeFileSync(join(process.cwd(), 'public', 'favicon.svg'), favicon)

  console.log('Icons generated in public/icons')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
