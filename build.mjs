import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const dist = join(root, 'dist')

if (existsSync(dist)) rmSync(dist, { recursive: true, force: true })
mkdirSync(dist, { recursive: true })

for (const name of ['style.css', 'calculator.js', 'favicon.svg', 'robots.txt', 'sitemap.xml']) {
  cpSync(join(root, name), join(dist, name))
}

for (const name of [
  'index.html',
  'ac-btu-calculator.html',
  'heating-btu-calculator.html',
  'mini-split-btu-calculator.html',
  'radiator-btu-calculator.html',
  'btu-conversion-calculator.html',
  'special-spaces-btu-calculator.html',
  'fireplace-pool-btu-calculator.html',
  'btu-energy-cost-calculator.html',
  'how-to-calculate-btu.html',
  'privacy-policy.html',
  'terms-of-use.html'
]) {
  cpSync(join(root, name), join(dist, name))
}
