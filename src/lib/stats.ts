import type { Data } from './model.ts'
import type { Plan } from './plan.ts'
import { doseOf, MIN_GAP } from './today.ts'
import { MIN, minutesFrom, shiftKey, type DateKey } from './time.ts'

const ON_PLAN = 15 * MIN

export interface NightStat {
  key: DateKey
  /** Minutes after midnight of the evening date (04:00 next day = 1680). */
  planBed: number
  bed?: number
  wake?: number
  slept?: number
  onPlan?: boolean
}

export interface SleepStats {
  nights: NightStat[]
  avgBed?: number
  avgSlept?: number
  onPlan: number
  logged: number
  streak: number
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined)

/** The last `count` nights ending with `last`, oldest first. */
export function sleepStats(plan: Plan, data: Data, last: DateKey, count = 14): SleepStats {
  const nights: NightStat[] = []
  for (let i = count - 1; i >= 0; i--) {
    const key = shiftKey(last, -i)
    const n = plan.night(key)
    const s = data.sleeps.find((x) => x.night === key)
    const stat: NightStat = { key, planBed: minutesFrom(key, n.bed) }
    if (s?.bed != null) {
      stat.bed = minutesFrom(key, s.bed)
      stat.onPlan = s.bed <= n.bed + ON_PLAN
    }
    if (s?.wake != null) stat.wake = minutesFrom(key, s.wake)
    if (s?.bed != null && s.wake != null) stat.slept = s.wake - s.bed
    nights.push(stat)
  }
  const week = nights.slice(-7)
  let streak = 0
  for (let i = nights.length - 1; i >= 0 && nights[i].onPlan; i--) streak++
  return {
    nights,
    avgBed: avg(week.flatMap((n) => (n.bed != null ? [n.bed] : []))),
    avgSlept: avg(week.flatMap((n) => (n.slept != null ? [n.slept] : []))),
    onPlan: week.filter((n) => n.onPlan).length,
    logged: week.filter((n) => n.bed != null).length,
    streak,
  }
}

export interface DoseDay {
  key: DateKey
  /** Minutes after midnight of `key`. */
  day?: number
  night?: number
  /** From the night dose before to this day's dose. */
  gap?: number
}

export interface DoseStats {
  days: DoseDay[]
  both: number
  avgGap?: number
  gapOk: number
  gapCount: number
  streak: number
}

export function doseDay(data: Data, key: DateKey): DoseDay {
  const day = doseOf(data, key, 'day')
  const night = doseOf(data, key, 'night')
  const before = doseOf(data, shiftKey(key, -1), 'night')
  return {
    key,
    day: day && minutesFrom(key, day.at),
    night: night && minutesFrom(key, night.at),
    gap: day && before ? day.at - before.at : undefined,
  }
}

/** The last `count` days ending with `last` (today), oldest first. Week figures skip today. */
export function doseStats(data: Data, last: DateKey, count = 14): DoseStats {
  const days: DoseDay[] = []
  for (let i = count - 1; i >= 0; i--) days.push(doseDay(data, shiftKey(last, -i)))
  const week = days.slice(-8, -1)
  const gaps = week.flatMap((d) => (d.gap != null ? [d.gap] : []))
  let streak = 0
  for (let i = days.length - 2; i >= 0 && days[i].day != null && days[i].night != null; i--) streak++
  return {
    days,
    both: week.filter((d) => d.day != null && d.night != null).length,
    avgGap: avg(gaps),
    gapOk: gaps.filter((g) => g >= MIN_GAP).length,
    gapCount: gaps.length,
    streak,
  }
}
