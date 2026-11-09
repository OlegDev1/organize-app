// Plain asserts for the time math. Run: npm test (TZ=Europe/Madrid).
import assert from 'node:assert/strict'
import { emptyData, type Data } from '../src/lib/model.ts'
import { graceInfo, makePlan } from '../src/lib/plan.ts'
import { seriesAt } from '../src/lib/series.ts'
import { buildEvents } from '../src/lib/schedule.ts'
import { computeToday, dayDoseFrom, doseWarning, phoneAlarms } from '../src/lib/today.ts'
import { at, hm, MIN } from '../src/lib/time.ts'

const data: Data = emptyData()
const plan = makePlan(data.settings, [])
const t = (key: string, clock: string) => {
  const [h, m] = clock.split(':').map(Number)
  return at(key, h * 60 + m).getTime()
}

// Bedtime: 1 h per night to 01:00, then 30 min to 00:00, then stays.
const beds = ['09', '10', '11', '12', '13', '14', '15'].map((d) => hm(plan.night(`2026-11-${d}`).bed))
assert.deepEqual(beds, ['04:00', '03:00', '02:00', '01:00', '00:30', '00:00', '00:00'])
assert.equal(hm(plan.night('2026-11-09').nightDose), '03:00')
assert.equal(hm(plan.night('2026-11-09').windDown), '03:30')

// Wake: bed + 9 h, capped on university mornings to 12:10 − 40 − 15 = 11:15.
assert.equal(hm(plan.night('2026-11-09').wake), '11:15') // Tue morning
assert.equal(hm(plan.night('2026-11-13').wake), '09:30') // Sat morning, bed 00:30
assert.equal(hm(plan.night('2026-11-14').wake), '09:00') // Sun morning
assert.equal(hm(plan.night('2026-11-15').wake), '09:00') // Mon: 09:00 is before the cap

// Cycle boundary: 3 h before the planned wake.
assert.equal(plan.cycleOf(t('2026-11-10', '02:00')), '2026-11-09')
assert.equal(plan.cycleOf(t('2026-11-10', '09:00')), '2026-11-10')
assert.equal(plan.cycleOf(t('2026-11-09', '23:00')), '2026-11-09')

// «Поблажка» on Nov 11 repeats Nov 10's times and shifts the rest by a night.
const graced = makePlan(data.settings, ['2026-11-11'])
assert.equal(hm(graced.night('2026-11-11').bed), '03:00')
assert.equal(hm(graced.night('2026-11-12').bed), '02:00')
assert.equal(graceInfo(graced, '2026-11-13', t('2026-11-13', '20:00')).state, 'blocked')
assert.equal(graceInfo(graced, '2026-11-18', t('2026-11-18', '20:00')).state, 'blocked') // target reached
assert.equal(graceInfo(plan, '2026-11-10', t('2026-11-10', '20:00')).state, 'available')
assert.equal(graceInfo(plan, '2026-11-10', t('2026-11-11', '03:30')).state, 'blocked') // after bedtime

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

// Home screen.
const evening = computeToday(plan, data, t('2026-11-09', '22:00'))
assert.equal(evening.hero.label, 'Отбой через')
assert.equal(hm(evening.hero.target), '04:00')
assert.equal(computeToday(plan, data, t('2026-11-10', '03:05')).hero.primary, 'night')
assert.equal(computeToday(plan, data, t('2026-11-10', '04:30')).hero.over, true)
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
assert.equal(ev.find((e) => e.kind === 'live' && e.at > t('2026-11-09', '22:00'))?.title, 'Отбой в 04:00')
assert.ok(ev.some((e) => e.group === 'leave-2026-11-09' && hm(e.at) === '12:00'))

console.log('time math: ok')
