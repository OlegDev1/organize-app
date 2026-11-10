// Plain asserts for the time math. Run: npm test (TZ=Europe/Madrid).
import assert from 'node:assert/strict'
import { emptyData, type Data } from '../src/lib/model.ts'
import { makePlan } from '../src/lib/plan.ts'
import { seriesAt } from '../src/lib/series.ts'
import { buildEvents } from '../src/lib/schedule.ts'
import { activeCycle, bedNight, computeToday, dayDoseFrom, doseWarning, lateCost, nightFor, phoneAlarms } from '../src/lib/today.ts'
import { at, hm, MIN } from '../src/lib/time.ts'

const data: Data = emptyData()
const plan = makePlan(data.settings)
const t = (key: string, clock: string) => {
  const [h, m] = clock.split(':').map(Number)
  return at(key, h * 60 + m).getTime()
}

// Bedtime: 2 h per night down to 02:00, two nights there, then 30 min per night to 00:00, then stays.
const bedsOf = (p: typeof plan, from = 9, n = 8) =>
  Array.from({ length: n }, (_, i) => hm(p.night(`2026-11-${String(from + i).padStart(2, '0')}`).bed))
assert.deepEqual(bedsOf(plan), ['04:00', '02:00', '02:00', '01:30', '01:00', '00:30', '00:00', '00:00'])
assert.equal(hm(plan.night('2026-11-09').nightDose), '03:00')
assert.equal(hm(plan.night('2026-11-09').windDown), '03:30')

// Wake: bed + 9 h, capped on university mornings to 12:10 − 40 − 15 = 11:15.
assert.equal(hm(plan.night('2026-11-09').wake), '11:15') // Tue morning
assert.equal(hm(plan.night('2026-11-13').wake), '10:00') // Sat morning, bed 01:00
assert.equal(hm(plan.night('2026-11-14').wake), '09:30') // Sun morning
assert.equal(hm(plan.night('2026-11-15').wake), '09:00') // Mon: 09:00 is before the cap

// Cycle boundary: 3 h before the planned wake.
assert.equal(plan.cycleOf(t('2026-11-10', '02:00')), '2026-11-09')
assert.equal(plan.cycleOf(t('2026-11-10', '09:00')), '2026-11-10')
assert.equal(plan.cycleOf(t('2026-11-09', '23:00')), '2026-11-09')

// A real bedtime later than plan + 15 min restarts the plan from it; within 15 min or early changes nothing.
const withBed = (clock: string) => makePlan(data.settings, [{ id: 's', night: '2026-11-09', bed: t('2026-11-10', clock) }])
const lateP = withBed('06:40')
assert.deepEqual(bedsOf(lateP, 10, 8), ['04:30', '02:30', '02:00', '02:00', '01:30', '01:00', '00:30', '00:00'])
assert.equal(lateP.night('2026-11-09').late, true)
assert.equal(hm(lateP.night('2026-11-09').wake), '11:15') // university cap still wins
assert.equal(hm(lateP.night('2026-11-09').bed), '04:00') // the plan of that night is kept for the statistics
assert.equal(hm(withBed('04:10').night('2026-11-10').bed), '02:00')
assert.equal(hm(withBed('01:00').night('2026-11-10').bed), '02:00')
assert.equal(hm(withBed('01:00').night('2026-11-09').wake), '10:00') // real bedtime + 9 h
assert.equal(lateCost(plan, data, '2026-11-09', t('2026-11-10', '06:40')), 2)
assert.equal(lateCost(plan, data, '2026-11-09', t('2026-11-10', '04:10')), 0)

// Still up after bedtime with nothing logged: it is still that night, and «Лёг» goes to it even past the wake-up time.
assert.equal(activeCycle(plan, data, t('2026-11-10', '09:00')), '2026-11-09')
assert.equal(bedNight(plan, data, t('2026-11-10', '12:00')), '2026-11-09')
assert.equal(bedNight(lateP, { ...data, sleeps: [{ id: 's', night: '2026-11-09', bed: 1 }] }, t('2026-11-10', '12:00')), '2026-11-10')

// Doses: day dose not before 12:00 and ≥ 8 h after the actual night dose; warnings for early or repeated doses.
const d2: Data = { ...emptyData(), doses: [{ id: 'n', kind: 'night', at: t('2026-11-10', '03:20'), cycle: '2026-11-09' }] }
assert.equal(hm(dayDoseFrom(plan, d2, '2026-11-10')), '12:00')
const late: Data = { ...emptyData(), doses: [{ id: 'n', kind: 'night', at: t('2026-11-10', '04:40'), cycle: '2026-11-09' }] }
assert.equal(hm(dayDoseFrom(plan, late, '2026-11-10')), '12:40')
assert.match(doseWarning(plan, d2, 'day', t('2026-11-10', '10:00')) ?? '', /8 ч/)
assert.match(doseWarning(plan, d2, 'day', t('2026-11-10', '11:30')) ?? '', /не раньше 12:00/)
assert.equal(doseWarning(plan, d2, 'day', t('2026-11-10', '12:05')), null)
assert.match(doseWarning(plan, late, 'day', t('2026-11-10', '12:10')) ?? '', /8 ч/)
assert.match(doseWarning(plan, d2, 'night', t('2026-11-10', '03:40')) ?? '', /уже отмечена/)
assert.match(doseWarning(plan, data, 'night', t('2026-11-10', '02:00')) ?? '', /раньше/)
assert.equal(doseWarning(plan, data, 'night', t('2026-11-10', '02:45')), null)

// The 8 h rule works both ways: a late day dose pushes the night dose, and bedtime waits for it.
const lateDay: Data = { ...emptyData(), doses: [{ id: 'd', kind: 'day', at: t('2026-11-09', '21:00'), cycle: '2026-11-09' }] }
const pushed = nightFor(plan, lateDay, '2026-11-09')
assert.deepEqual([hm(pushed.nightDose), hm(pushed.bed), hm(pushed.windDown)], ['05:00', '05:00', '04:30'])
assert.match(computeToday(plan, lateDay, t('2026-11-09', '23:00')).hero.sub, /не раньше 05:00/)
assert.match(doseWarning(plan, lateDay, 'night', t('2026-11-10', '03:10')) ?? '', /8 ч/)
assert.equal(doseWarning(plan, lateDay, 'night', t('2026-11-10', '05:00')), null)
const onTime: Data = { ...emptyData(), doses: [{ id: 'd', kind: 'day', at: t('2026-11-09', '14:00'), cycle: '2026-11-09' }] }
assert.equal(hm(nightFor(plan, onTime, '2026-11-09').nightDose), '03:00')
// No dose is ever suggested before the last dose + 8 h, in the app or in a notification.
for (const now of ['21:30', '23:00'].map((c) => t('2026-11-09', c)).concat(t('2026-11-10', '04:00')))
  for (const e of buildEvents(plan, lateDay, now)) if (e.dose) assert.ok(e.at >= t('2026-11-10', '05:00'), `${e.title} at ${hm(e.at)}`)
assert.notEqual(computeToday(plan, lateDay, t('2026-11-10', '04:00')).hero.primary, 'night')

// The day dose is open from 12:00; 5 h later the screen turns red until it is taken.
assert.equal(computeToday(plan, data, t('2026-11-09', '16:00')).hero.alert, undefined)
const red = computeToday(plan, data, t('2026-11-09', '17:30')).hero
assert.deepEqual([red.alert, red.primary, red.tone], [true, 'day', 'late'])

// Home screen.
const evening = computeToday(plan, onTime, t('2026-11-09', '22:00'))
assert.equal(evening.hero.label, 'Отбой через')
assert.equal(hm(evening.hero.target), '04:00')
assert.equal(computeToday(plan, data, t('2026-11-10', '03:05')).hero.primary, 'night')
const up = computeToday(plan, data, t('2026-11-10', '04:30')).hero
assert.deepEqual([up.over, up.primary, up.secondary, up.alert], [true, 'bed', 'night', true])
assert.match(up.sub, /подъём в 11:15/)
const uni = computeToday(plan, data, t('2026-11-10', '11:40'))
assert.equal(uni.hero.label, 'Быть готовым через')

// Phone alarms for tonight and what changed since the night before.
const tonight = phoneAlarms(plan, '2026-11-09').map((a) => `${hm(a.time)} ${a.label}`)
assert.deepEqual(tonight, [
  '03:30 Готовиться ко сну',
  '04:00 Отбой',
  '11:00 Подъём −15 мин',
  '11:10 Подъём −5 мин',
  '11:15 Подъём',
  '11:25 Подъём +10 мин',
  '11:30 Подъём +15 мин',
  '11:30 Собираться',
  '12:00 Через 10 мин выходить',
])
const next = phoneAlarms(plan, '2026-11-10')
assert.equal(hm(next.find((a) => a.id === 'bed')?.was ?? 0), '04:00')

// Mac series: −20, −10, 0, +10, +15; 5 min ring, 5 min silence, loop after the last.
const W = t('2026-11-10', '11:15')
const at_ = (m: number) => seriesAt(W, [-20, -10, 0, 10, 15], 5, 5, W + m * MIN)
assert.equal(at_(-21).ringing, false)
assert.equal(at_(-20).ringing, true)
assert.equal(at_(-16).sound, 0)
assert.equal(at_(-15).ringing, false)
assert.equal(at_(-15).next, W - 10 * MIN)
assert.equal(at_(-10).sound, 1)
assert.equal(at_(0).sound, 2)
assert.equal(at_(10).sound, 3)
assert.equal(at_(15).sound, 4)
assert.equal(at_(20).ringing, false)
assert.equal(at_(25).ringing, true)
assert.equal(at_(25).sound, 0)
assert.equal(at_(30).ringing, false)

// Android schedule: tonight's wake series (5 + an hour of loops), reminders, live card.
const ev = buildEvents(plan, data, t('2026-11-09', '22:00'))
const wakeAlarms = ev.filter((e) => e.group === 'wake-2026-11-09')
assert.equal(wakeAlarms.length, 11)
assert.deepEqual(wakeAlarms.slice(0, 6).map((e) => hm(e.at)), ['11:00', '11:10', '11:15', '11:25', '11:30', '11:40'])
assert.ok(ev.some((e) => e.kind === 'remind' && hm(e.at) === '03:30'))
// Up after bedtime: a reminder every 20 min until «Лёг».
assert.deepEqual(ev.filter((e) => e.title === 'Пора спать').slice(0, 3).map((e) => hm(e.at)), ['04:20', '04:40', '05:00'])
assert.ok(ev.length < 400, `too many events for AlarmManager: ${ev.length}`)
assert.equal(ev.find((e) => e.kind === 'live' && e.at > t('2026-11-09', '22:00'))?.title, 'Отбой в 04:00')
assert.ok(ev.some((e) => e.group === 'leave-2026-11-09' && hm(e.at) === '12:00'))

console.log('time math: ok')
