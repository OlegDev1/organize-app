// The sleep plan. It adapts to what really happened: a bedtime logged later than planned
// (beyond the tolerance) becomes the new starting point, and the plan walks back to the
// target from there: fast down to `fastUntil`, a short stay there, then slowly to `targetBed`.
import type { Settings, Sleep } from './model.ts'
import { at, daysBetween, HOUR, keyOf, MIN, minutesFrom, parseKey, shiftKey, type DateKey } from './time.ts'

/** Night = the evening date D; sleep starts after midnight and ends on the morning of D+1. */
export interface Night {
  key: DateKey
  /** Planned bedtime, and the same as minutes after midnight of `key`. */
  bed: number
  bedMin: number
  /** Logged bedtime, if he tapped «Лёг». */
  realBed?: number
  /** The logged bedtime was later than the plan allows; the next nights start from it. */
  late: boolean
  nightDose: number
  windDown: number
  /** Wake-up on the morning after: from the real bedtime if logged, else from the planned one. */
  wake: number
  /** Bedtime + sleep length, before the university cap. */
  natural: number
  /** University morning after this night, if any. */
  uni: { getReady: number; leave: number; readyBy: number } | null
}

export interface Plan {
  s: Settings
  night(key: DateKey): Night
  /** Wake-up for night `key` if he falls asleep at `bed` (university cap applied). */
  wakeAfter(key: DateKey, bed: number): number
  /** First night from `from` whose planned bedtime is the target. */
  targetNight(from: DateKey): DateKey | undefined
  /** Which night's day a moment belongs to (boundary: 3 h before the wake-up). */
  cycleOf(t: number): DateKey
}

/** Planned bedtimes stay on a 15-minute grid, also after a restart from a real bedtime. */
const GRID = 15
/** A "bedtime" later than noon is treated as noon, so one odd day can't break the plan. */
const LATEST_BED = 36 * 60

interface Step {
  bed: number
  /** Nights this bedtime still repeats before the slow steps start. */
  hold: number
}

export function makePlan(s: Settings, sleeps: Sleep[] = []): Plan {
  const steps: Step[] = []
  const cache = new Map<DateKey, Night>()
  const realBeds = new Map<DateKey, number>()
  for (const x of sleeps) if (x.bed != null) realBeds.set(x.night, x.bed)
  // On university days even the last alarm of the series must ring before getting ready.
  const lateTail = Math.max(0, ...s.phoneOffsets) * MIN

  const grid = (m: number) => Math.floor(m / GRID) * GRID

  /** The bedtime the next night starts from: the real one if it was late, else the planned one. */
  function effective(key: DateKey, planned: number): number {
    const real = realBeds.get(key)
    if (real == null) return planned
    const m = Math.min(LATEST_BED, minutesFrom(key, real))
    return m > planned + s.bedTolerance ? m : planned
  }

  function nextStep(prev: Step, eff: number): Step {
    if (eff > s.fastUntil) {
      const bed = Math.max(s.fastUntil, grid(eff - s.fastStep))
      return { bed, hold: bed === s.fastUntil ? Math.max(0, s.holdNights - 1) : 0 }
    }
    if (eff <= s.targetBed) return { bed: s.targetBed, hold: 0 }
    if (eff === prev.bed && prev.hold > 0) return { bed: prev.bed, hold: prev.hold - 1 }
    return { bed: Math.max(s.targetBed, grid(eff - s.slowStep)), hold: 0 }
  }

  function step(index: number): Step {
    if (!steps.length) steps.push({ bed: Math.max(s.targetBed, s.startBed), hold: 0 })
    for (let i = steps.length; i <= index; i++) {
      const prev = steps[i - 1]
      steps.push(nextStep(prev, effective(shiftKey(s.planStart, i - 1), prev.bed)))
    }
    return steps[index]
  }

  function wakeAfter(key: DateKey, bed: number): number {
    const natural = bed + s.sleepMin * MIN
    const morning = shiftKey(key, 1)
    const ready = s.readyBy[parseKey(morning).getDay()]
    if (ready == null) return natural
    return Math.min(natural, at(morning, ready).getTime() - s.prepMin * MIN - lateTail)
  }

  function night(key: DateKey): Night {
    const hit = cache.get(key)
    if (hit) return hit
    const bedMin = step(Math.max(0, daysBetween(s.planStart, key))).bed
    const bed = at(key, bedMin).getTime()
    const realBed = realBeds.get(key)
    const morning = shiftKey(key, 1)
    const ready = s.readyBy[parseKey(morning).getDay()]
    let uni: Night['uni'] = null
    if (ready != null) {
      const readyBy = at(morning, ready).getTime()
      uni = { getReady: readyBy - s.prepMin * MIN, readyBy, leave: readyBy - s.leaveBefore * MIN }
    }
    const n: Night = {
      key,
      bed,
      bedMin,
      realBed,
      late: effective(key, bedMin) !== bedMin,
      nightDose: bed - s.doseBefore * MIN,
      windDown: bed - s.windDownBefore * MIN,
      wake: wakeAfter(key, realBed ?? bed),
      natural: (realBed ?? bed) + s.sleepMin * MIN,
      uni,
    }
    cache.set(key, n)
    return n
  }

  function targetNight(from: DateKey): DateKey | undefined {
    for (let i = 0; i < 60; i++) {
      const key = shiftKey(from, i)
      if (night(key).bedMin === s.targetBed) return key
    }
    return undefined
  }

  function cycleOf(t: number): DateKey {
    const d = keyOf(t)
    const prev = shiftKey(d, -1)
    return t < night(prev).wake - 3 * HOUR ? prev : d
  }

  return { s, night, wakeAfter, targetNight, cycleOf }
}
