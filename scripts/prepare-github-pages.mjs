import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const dist = resolve(process.cwd(), 'dist')
const index = resolve(dist, 'index.html')
const notFound = resolve(dist, '404.html')

if (process.env.GITHUB_PAGES_FALLBACK !== 'true') {
  console.log('GitHub Pages SPA-Fallback uebersprungen.')
  process.exit(0)
}

if (!existsSync(index)) {
  throw new Error('dist/index.html fehlt. Vite Build wurde nicht erzeugt.')
}

copyFileSync(index, notFound)
console.log('GitHub Pages SPA-Fallback erzeugt: dist/404.html')
