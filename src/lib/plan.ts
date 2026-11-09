import type { Settings } from './model.ts'
import { at, daysBetween, HOUR, keyOf, MIN, parseKey, shiftKey, type DateKey } from './time.ts'

/** Night = the evening date D; sleep starts after midnight and ends on the morning of D+1. */
export interface Night {
  key: DateKey
  index: number
  grace: boolean
  bed: number
  nightDose: number
  windDown: number
  /** Planned wake-up on the morning after. */
  wake: number
  /** bed + sleep length, before the university cap. */
  natural: number
  /** University morning after this night, if any. */
  uni: { getReady: number; leave: number; readyBy: number } | null
}

export interface Plan {
  s: Settings
  graces: DateKey[]
  night(key: DateKey): Night
  bedMinutes(index: number): number
  /** Which night's day a moment belongs to (boundary: 3 h before the planned wake). */
  cycleOf(t: number): DateKey
}

export function makePlan(s: Settings, graces: DateKey[]): Plan {
  const cache = new Map<DateKey, Night>()
  // On university days even the last alarm of a series must ring before getting ready.
  const lateTail = Math.max(0, ...s.phoneOffsets, ...s.macOffsets) * MIN

  function bedMinutes(index: number): number {
    let bed = s.startBed
    for (let i = 0; i < index && bed > s.targetBed; i++) {
      bed = Math.max(s.targetBed, bed - (bed > s.fastUntil ? s.fastStep : s.slowStep))
    }
    return bed
  }

  function indexOf(key: DateKey): number {
    const n = daysBetween(s.planStart, key)
    if (n <= 0) return 0
    const used = graces.filter((g) => daysBetween(s.planStart, g) >= 1 && daysBetween(g, key) >= 0).length
    return Math.max(0, n - used)
  }

  function night(key: DateKey): Night {
    const hit = cache.get(key)
    if (hit) return hit
    const index = indexOf(key)
    const bed = at(key, bedMinutes(index)).getTime()
    const natural = bed + s.sleepMin * MIN
    const morning = shiftKey(key, 1)
    const ready = s.readyBy[parseKey(morning).getDay()]
    let wake = natural
    let uni: Night['uni'] = null
    if (ready != null) {
      const readyBy = at(morning, ready).getTime()
      const getReady = readyBy - s.prepMin * MIN
      uni = { getReady, readyBy, leave: readyBy - s.leaveBefore * MIN }
      wake = Math.min(natural, getReady - lateTail)
    }
    const n: Night = {
      key,
      index,
      grace: graces.includes(key),
      bed,
      nightDose: bed - s.doseBefore * MIN,
      windDown: bed - s.windDownBefore * MIN,
      wake,
      natural,
      uni,
    }
    cache.set(key, n)
    return n
  }

  function cycleOf(t: number): DateKey {
    const d = keyOf(t)
    const prev = shiftKey(d, -1)
    return t < night(prev).wake - 3 * HOUR ? prev : d
  }

  return { s, graces, night, bedMinutes, cycleOf }
}

export type GraceInfo =
  | { state: 'used' }
  | { state: 'available' }
  | { state: 'blocked'; reason: string }

/** «Поблажка» for night `key`: repeat yesterday's times, at most once per 7 days, before bedtime. */
export function graceInfo(plan: Plan, key: DateKey, now: number): GraceInfo {
  if (plan.graces.includes(key)) return { state: 'used' }
  const n = plan.night(key)
  if (daysBetween(plan.s.planStart, key) < 1) return { state: 'blocked', reason: 'План только начался.' }
  if (plan.bedMinutes(n.index) === plan.bedMinutes(Math.max(0, n.index - 1)))
    return { state: 'blocked', reason: 'Цель уже достигнута, повторять нечего.' }
  const recent = plan.graces.find((g) => {
    const d = daysBetween(g, key)
    return d >= 1 && d <= 6
  })
  if (recent) {
    const from = parseKey(shiftKey(recent, 7))
    return { state: 'blocked', reason: `Следующая — с ${from.getDate()}.${String(from.getMonth() + 1).padStart(2, '0')}.` }
  }
  if (now >= n.bed) return { state: 'blocked', reason: 'Отбой уже прошёл.' }
  return { state: 'available' }
}
