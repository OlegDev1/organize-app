// Screenshots of the main screens with sample data and a fixed clock.
// Usage: npm run build && npx vite preview --port 4173 & TZ=Europe/Madrid node tests/screens.mjs [outDir]
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const URL = 'http://localhost:4173/'
const out = process.argv[2] ?? '/tmp/shots'
mkdirSync(out, { recursive: true })

const local = (y, m, d, h, min) => new Date(y, m - 1, d, h, min).getTime()
const key = (t) => new Date(t).toLocaleDateString('sv-SE')

// Two weeks of sample history (not real data).
function seed() {
  const doses = []
  const sleeps = []
  for (let i = 12; i >= 1; i--) {
    const d = new Date(2026, 10, 9 - i)
    const k = key(d)
    const late = (i * 37) % 120
    const bed = local(d.getFullYear(), d.getMonth() + 1, d.getDate() + 1, 4, 30 + late)
    sleeps.push({ id: 's' + i, night: k, bed, wake: bed + (8 * 60 + (i % 3) * 20) * 60000 })
    doses.push({ id: 'n' + i, kind: 'night', at: bed - (55 + (i % 4) * 10) * 60000, cycle: k })
    const nd = new Date(2026, 10, 9 - i)
    doses.push({ id: 'd' + i, kind: 'day', at: local(nd.getFullYear(), nd.getMonth() + 1, nd.getDate(), 13, (i * 13) % 60), cycle: k })
  }
  const notes = [
    { id: 'a', at: local(2026, 11, 8, 15, 20), text: 'Днём сонливость после 15:00, к вечеру проходит.' },
    { id: 'b', at: local(2026, 11, 9, 12, 5), text: 'Заснул быстро, проснулся один раз около 9.' },
  ]
  return {
    v: 4,
    settings: { dayName: 'Препарат А', nightName: 'Препарат Б' },
    doses,
    sleeps,
    notes,
    graces: [],
    alarms: [{ id: 'x', min: 18 * 60 + 30, label: 'Выйти в зал', daily: true, on: true, date: '2026-11-09' }],
    armed: null,
    wakeOverride: null,
    alarmsAck: null,
  }
}

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
const errors = []

async function shot(name, { time, tab, width = 360, height = 800, data = seed(), extra }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, timezoneId: 'Europe/Madrid' })
  const page = await ctx.newPage()
  page.on('console', (m) => m.type() === 'error' && errors.push(`${name}: ${m.text()}`))
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`))
  await page.clock.setFixedTime(time)
  await page.addInitScript(
    ([d, t]) => {
      localStorage.setItem('rezhim-v4', JSON.stringify(d))
      localStorage.setItem('rezhim-v4-tab', t)
    },
    [data, tab],
  )
  await page.goto(URL)
  await page.waitForTimeout(600)
  if (extra) await extra(page)
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true })
  await ctx.close()
}

const nov = (d, h, m) => new Date(local(2026, 11, d, h, m))

await shot('now-day', { time: nov(9, 14, 10), tab: 'now' })
await shot('now-night', { time: nov(10, 3, 10), tab: 'now' })
await shot('now-uni', { time: nov(10, 11, 40), tab: 'now' })
await shot('sleep', { time: nov(9, 14, 10), tab: 'sleep' })
await shot('doses', { time: nov(9, 14, 10), tab: 'doses' })
await shot('notes', { time: nov(9, 14, 10), tab: 'notes' })
await shot('alarm', { time: nov(9, 22, 30), tab: 'alarm' })
await shot('settings', { time: nov(9, 14, 10), tab: 'now', extra: (p) => p.click('button[aria-label="Настройки"]') })
await shot('mac-alarm', { time: nov(9, 22, 30), tab: 'alarm', width: 1280, height: 860 })
await shot('mac-armed', {
  time: nov(10, 1, 10),
  tab: 'alarm',
  width: 1280,
  height: 800,
  data: { ...seed(), armed: { wake: local(2026, 11, 10, 11, 15) } },
})

await browser.close()
console.log(errors.length ? errors.join('\n') : 'no console errors')
