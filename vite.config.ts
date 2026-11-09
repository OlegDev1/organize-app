import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig, type Plugin } from 'vite'
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

// Gives dist/sw.js a fresh cache name on every build and the list of files to precache.
function stampServiceWorker(): Plugin {
  const out = 'dist'
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name)
      return statSync(path).isDirectory() ? walk(path) : [path]
    })
  return {
    name: 'stamp-service-worker',
    apply: 'build',
    closeBundle() {
      const swPath = join(out, 'sw.js')
      const files = walk(out)
        .map((p) => './' + relative(out, p).split('\\').join('/'))
        .filter((p) => p !== './sw.js' && !p.endsWith('.woff2') && !p.endsWith('.map'))
      const version = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
      const sw = readFileSync(swPath, 'utf8')
        .replace('__VERSION__', version)
        .replace('/*FILES*/[]', JSON.stringify(['./', ...files]))
      writeFileSync(swPath, sw)
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [svelte(), stampServiceWorker()],
})
