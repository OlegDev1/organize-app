// Checks the Mac wake-up series timing in headless Chrome with a fake clock.
// Usage: npm run build && npx vite preview --port 4173 & TZ=Europe/Madrid node tests/alarm.mjs
import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'

const wake = new Date(2026, 10, 10, 11, 15).getTime()
const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--autoplay-policy=no-user-gesture-required'],
})
const page = await browser.newPage({ timezoneId: 'Europe/Madrid' })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

await page.clock.install({ time: new Date(2026, 10, 10, 10, 50) })
await page.addInitScript((w) => {
  if (!localStorage.getItem('rezhim-v4'))
    localStorage.setItem('rezhim-v4', JSON.stringify({ v: 4, armed: { wake: w } }))
}, wake)
await page.goto('http://localhost:4173/')
await page.clock.runFor(1000)

async function at(clock) {
  const [h, m, s = 0] = clock.split(':').map(Number)
  await page.clock.pauseAt(new Date(2026, 10, 10, h, m, s))
  await page.clock.runFor(1200)
  return page.evaluate(() => ({
    ringing: !!document.querySelector('.overlay.ringing'),
    what: document.querySelector('.overlay .what')?.textContent?.trim(),
    state: document.querySelector('.overlay .state')?.textContent?.trim(),
  }))
}

const expect = [
  ['10:54:00', false, 'Будильник ждёт'],
  ['10:55:10', true, 'Колокольчики'],
  ['10:59:50', true, 'Колокольчики'],
  ['11:00:10', false, 'Тишина'],
  ['11:05:10', true, 'Бип-бип'],
  ['11:15:10', true, 'Сирена'],
  ['11:20:10', false, 'Тишина'],
  ['11:25:10', true, 'Гонг'],
  ['11:30:10', true, 'Тревога'],
  ['11:35:10', false, 'Тишина'],
  ['11:40:10', true, 'Колокольчики'],
]
for (const [clock, ringing, text] of expect) {
  const st = await at(clock)
  assert.equal(st.ringing, ringing, `${clock}: ringing should be ${ringing} (${JSON.stringify(st)})`)
  assert.ok(`${st.what} ${st.state}`.includes(text), `${clock}: expected «${text}», got ${JSON.stringify(st)}`)
  console.log(clock, ringing ? 'звонит' : 'тихо  ', st.state || st.what)
}

await page.click('button.stop')
await page.clock.resume() // lets the fade-out finish
await page.waitForTimeout(800)
assert.equal(await page.locator('.overlay').count(), 0, '«Я встал» closes the overlay')
assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('rezhim-v4')).armed), null)
console.log('«Я встал»: остановлен')

await browser.close()
assert.deepEqual(errors, [])
console.log('alarm series: ok')
