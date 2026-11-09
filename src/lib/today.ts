import type { Data, Dose, DoseKind, Sleep } from './model.ts'
import type { Night, Plan } from './plan.ts'
import { duration, HOUR, hm, MIN, shiftKey, signed, type DateKey } from './time.ts'

export const MIN_GAP = 8 * HOUR
const NIGHT_EARLY = 30 * MIN

/** A sleep session still open (he tapped «Ложусь» and not «Встал»). */
export function openSleep(data: Data, now: number): Sleep | undefined {
  return data.sleeps.find((x) => x.bed != null && x.wake == null && now - x.bed < 18 * HOUR && x.bed <= now)
}

/** The day he is living now: like plan.cycleOf, but after «Встал» the next day starts at once. */
export function activeCycle(plan: Plan, data: Data, now: number): DateKey {
  const k = plan.cycleOf(now)
  const woke = data.sleeps.some((x) => x.night === k && x.wake != null && x.wake <= now)
  return woke ? shiftKey(k, 1) : k
}

/** The night whose planned wake is closest to now (for «Встал» without «Ложусь»). */
export function nightJustEnded(plan: Plan, now: number): DateKey {
  const k = plan.cycleOf(now)
  const prev = shiftKey(k, -1)
  return Math.abs(plan.night(prev).wake - now) <= Math.abs(plan.night(k).wake - now) ? prev : k
}

export const doseOf = (data: Data, cycle: DateKey, kind: DoseKind): Dose | undefined =>
  data.doses.filter((d) => d.cycle === cycle && d.kind === kind).sort((a, b) => a.at - b.at)[0]

/** Day dose of `cycle` is allowed 8 h after the actual night dose before it (or the planned one). */
export function dayDoseFrom(plan: Plan, data: Data, cycle: DateKey): number {
  const prev = shiftKey(cycle, -1)
  const taken = data.doses.filter((d) => d.cycle === prev && d.kind === 'night').sort((a, b) => b.at - a.at)[0]
  return (taken ? taken.at : plan.night(prev).nightDose) + MIN_GAP
}

/** Why logging this dose now needs a second tap, or null. */
export function doseWarning(plan: Plan, data: Data, kind: DoseKind, now: number): string | null {
  const cycle = activeCycle(plan, data, now)
  const taken = doseOf(data, cycle, kind)
  if (kind === 'day') {
    if (taken) return `Дневная доза уже отмечена сегодня в ${hm(taken.at)}.`
    const from = dayDoseFrom(plan, data, cycle)
    if (now < from)
      return `После ночной прошло ${duration(now - (from - MIN_GAP))}. Твоё правило — не меньше 8 ч, то есть с ${hm(from)}.`
    return null
  }
  if (taken) return `Ночная доза уже отмечена в ${hm(taken.at)}.`
  const planned = plan.night(cycle).nightDose
  if (now < planned - NIGHT_EARLY) return `По плану ночная в ${hm(planned)}. Сейчас на ${duration(planned - now)} раньше.`
  return null
}

export type Tone = 'calm' | 'accent' | 'warn' | 'late' | 'night'
export type Action = 'wake' | 'day' | 'night' | 'bed'

export interface Hero {
  label: string
  target: number
  /** The moment passed: count up and say how late. */
  over: boolean
  /** Start of this stretch, for the progress bar. */
  from: number
  sub: string
  tone: Tone
  chip?: string
  primary?: Action
  secondary?: Action
}

export interface Row {
  id: string
  time: number
  label: string
  prefix?: string
  /** Actual time of the logged action, if done. */
  done?: number
  missed?: boolean
  tomorrow?: boolean
}

export interface Today {
  cycle: DateKey
  prev: Night
  tonight: Night
  dayFrom: number
  day?: Dose
  night?: Dose
  asleep?: Sleep
  hero: Hero
  rows: Row[]
}

export function computeToday(plan: Plan, data: Data, now: number): Today {
  const asleep = openSleep(data, now)
  const cycle = activeCycle(plan, data, now)
  const prev = plan.night(shiftKey(cycle, -1))
  const tonight = plan.night(cycle)
  const day = doseOf(data, cycle, 'day')
  const night = doseOf(data, cycle, 'night')
  const dayFrom = dayDoseFrom(plan, data, cycle)
  const woke = data.sleeps.find((x) => x.night === prev.key && x.wake != null)
  const bedLog = data.sleeps.find((x) => x.night === cycle && x.bed != null)

  const rows: Row[] = [{ id: 'wake0', time: prev.wake, label: 'Подъём', done: woke?.wake }]
  if (prev.uni) {
    rows.push({ id: 'ready', time: prev.uni.getReady, label: 'Собираться' })
    rows.push({ id: 'readyBy', time: prev.uni.readyBy, label: 'Быть готовым' })
  }
  rows.push({ id: 'day', time: dayFrom, label: 'Дневная доза', prefix: 'с', done: day?.at, missed: !day && now >= tonight.nightDose })
  rows.push({ id: 'night', time: tonight.nightDose, label: 'Ночная доза', done: night?.at })
  rows.push({ id: 'wind', time: tonight.windDown, label: 'Готовиться ко сну' })
  rows.push({ id: 'bed', time: tonight.bed, label: 'Отбой', done: bedLog?.bed })
  rows.push({ id: 'wake1', time: tonight.wake, label: 'Подъём', tomorrow: true })
  rows.sort((a, b) => a.time - b.time)

  return { cycle, prev, tonight, dayFrom, day, night, asleep, hero: pickHero(), rows }

  function pickHero(): Hero {
    // Asleep: only the wake-up matters.
    if (asleep) {
      const n = plan.night(asleep.night)
      const over = now >= n.wake
      return {
        label: over ? 'Пора вставать' : 'Подъём через',
        target: n.wake,
        over,
        from: asleep.bed ?? n.bed,
        sub: `Встать в ${hm(n.wake)}`,
        tone: over ? 'late' : 'night',
        primary: 'wake',
      }
    }

    const action = pickAction()
    const base = { ...action, chip: action.primary ? chipFor(action.primary) : undefined }

    // Morning, not up yet (on university days only until getting ready starts).
    if (!woke && now < Math.min(prev.wake + 2 * HOUR, prev.uni?.getReady ?? Infinity)) {
      const over = now >= prev.wake
      return {
        ...base,
        label: over ? 'Пора вставать' : 'Подъём через',
        target: prev.wake,
        over,
        from: prev.bed,
        sub: `Встать в ${hm(prev.wake)}`,
        tone: over ? 'late' : 'calm',
        chip: undefined,
        primary: 'wake',
        secondary: undefined,
      }
    }

    // University morning: getting ready on time beats everything.
    if (prev.uni && now < prev.uni.readyBy) {
      const { getReady, readyBy } = prev.uni
      if (now < getReady)
        return {
          ...base,
          label: 'Собираться через',
          target: getReady,
          over: false,
          from: prev.wake,
          sub: `Быть готовым к ${hm(readyBy)}`,
          tone: getReady - now < 10 * MIN ? 'warn' : 'calm',
        }
      return {
        ...base,
        chip: base.chip ?? 'Собирайся',
        label: 'Быть готовым через',
        target: readyBy,
        over: false,
        from: getReady,
        sub: `К ${hm(readyBy)}. Опаздывать нельзя`,
        tone: readyBy - now < 10 * MIN ? 'late' : 'warn',
      }
    }

    // Waiting for the day dose to be allowed.
    if (!day && now < dayFrom && dayFrom < tonight.nightDose)
      return {
        ...base,
        label: 'Дневная доза через',
        target: dayFrom,
        over: false,
        from: dayFrom - MIN_GAP,
        sub: `Можно с ${hm(dayFrom)}: 8 ч после ночной`,
        tone: 'calm',
      }

    const sub = night
      ? `Лечь в ${hm(tonight.bed)} · подъём в ${hm(tonight.wake)}`
      : `Лечь в ${hm(tonight.bed)} · ночная доза в ${hm(tonight.nightDose)}`
    if (now < tonight.bed)
      return {
        ...base,
        label: 'Отбой через',
        target: tonight.bed,
        over: false,
        from: Math.max(prev.wake, tonight.bed - 16 * HOUR),
        sub,
        tone: now >= tonight.windDown ? 'warn' : action.primary ? 'accent' : 'calm',
      }
    return {
      ...base,
      label: 'Отбой был в ' + hm(tonight.bed),
      target: tonight.bed,
      over: true,
      from: tonight.bed,
      sub: `Подъём всё равно в ${hm(tonight.wake)}`,
      tone: 'late',
    }
  }

  function pickAction(): Pick<Hero, 'primary' | 'secondary'> {
    if (!day && now >= dayFrom && now < tonight.nightDose) return { primary: 'day' }
    if (!night && now >= tonight.nightDose)
      return { primary: 'night', secondary: now >= tonight.windDown ? 'bed' : undefined }
    if (night || now >= tonight.windDown) return { primary: 'bed' }
    return {}
  }

  function chipFor(a: Action): string | undefined {
    if (a === 'day') return 'Пора: дневная доза'
    if (a === 'night') return 'Пора: ночная доза'
    if (a === 'bed') return now >= tonight.bed ? 'Ложись' : now >= tonight.windDown ? 'Готовься ко сну' : undefined
    return undefined
  }
}

export interface PhoneAlarm {
  id: string
  time: number
  label: string
  /** Same alarm the night before, if its time was different. */
  was?: number
}

function alarmsFor(plan: Plan, n: Night): PhoneAlarm[] {
  const s = plan.s
  const list: PhoneAlarm[] = [
    { id: 'wind', time: n.windDown, label: 'Готовиться ко сну' },
    { id: 'bed', time: n.bed, label: 'Отбой' },
    ...s.phoneOffsets.map((o) => ({
      id: 'w' + o,
      time: n.wake + o * MIN,
      label: o === 0 ? 'Подъём' : `Подъём ${signed(o)} мин`,
    })),
  ]
  if (n.uni) {
    list.push({ id: 'ready', time: n.uni.getReady, label: 'Собираться' })
    list.push({ id: 'leave', time: n.uni.leave, label: `Через ${s.leaveBefore} мин выходить` })
  }
  return list.sort((a, b) => a.time - b.time)
}

const clockMinutes = (t: number) => {
  const d = new Date(t)
  return d.getHours() * 60 + d.getMinutes()
}

/** Alarms to have on the phone for night `key`, marking those that differ from the night before. */
export function phoneAlarms(plan: Plan, key: DateKey): PhoneAlarm[] {
  const before = new Map(alarmsFor(plan, plan.night(shiftKey(key, -1))).map((a) => [a.id, a.time]))
  return alarmsFor(plan, plan.night(key)).map((a) => {
    const was = before.get(a.id)
    return was == null || clockMinutes(was) === clockMinutes(a.time) ? a : { ...a, was }
  })
}
