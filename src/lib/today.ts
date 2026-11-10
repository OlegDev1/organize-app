import type { Data, Dose, DoseKind, Sleep } from './model.ts'
import { makePlan, type Night, type Plan } from './plan.ts'
import { at, daysBetween, duration, HOUR, hm, MIN, shiftKey, signed, type DateKey } from './time.ts'

export const MIN_GAP = 8 * HOUR
const NIGHT_EARLY = 30 * MIN

/** A sleep session still open (he tapped «Ложусь» and not «Встал»). */
export function openSleep(data: Data, now: number): Sleep | undefined {
  return data.sleeps.find((x) => x.bed != null && x.wake == null && now - x.bed < 18 * HOUR && x.bed <= now)
}

const sleepOf = (data: Data, key: DateKey): Sleep | undefined => data.sleeps.find((x) => x.night === key)

/** The day he is living now: like plan.cycleOf, but it follows what he really did. */
export function activeCycle(plan: Plan, data: Data, now: number): DateKey {
  const k = plan.cycleOf(now)
  const prev = shiftKey(k, -1)
  // Still up after a planned bedtime with nothing logged for that night: it is still that night.
  if (prev >= plan.s.planStart && !sleepOf(data, prev) && now < plan.night(prev).wake) return prev
  // After «Встал» the next day starts at once.
  const woke = data.sleeps.some((x) => x.night === k && x.wake != null && x.wake <= now)
  return woke ? shiftKey(k, 1) : k
}

/** The night a «Лёг» (or a night dose) at `now` belongs to: the nearest planned bedtime still without a sleep. */
export function bedNight(plan: Plan, data: Data, now: number): DateKey {
  const k = activeCycle(plan, data, now)
  const prev = shiftKey(k, -1)
  if (prev < plan.s.planStart || sleepOf(data, prev)) return k
  return now - plan.night(prev).bed < plan.night(k).bed - now ? prev : k
}

/** The night whose planned wake is closest to now (for «Встал» without «Лёг»). */
export function nightJustEnded(plan: Plan, now: number): DateKey {
  const k = plan.cycleOf(now)
  const prev = shiftKey(k, -1)
  return Math.abs(plan.night(prev).wake - now) <= Math.abs(plan.night(k).wake - now) ? prev : k
}

export const doseOf = (data: Data, cycle: DateKey, kind: DoseKind): Dose | undefined =>
  data.doses.filter((d) => d.cycle === cycle && d.kind === kind).sort((a, b) => a.at - b.at)[0]

const lastDose = (doses: Dose[]): Dose | undefined =>
  doses.reduce<Dose | undefined>((a, d) => (!a || d.at > a.at ? d : a), undefined)

/** The hard rule: the next dose, of either kind, is never before the last logged dose + 8 h. */
export function doseFloor(data: Data): number | null {
  const last = lastDose(data.doses)
  return last ? last.at + MIN_GAP : null
}

/** When the day dose of `cycle` is allowed: not before 12:00 and ≥ 8 h after the last dose (the planned night dose if none was logged). */
export function dayDoseRule(plan: Plan, data: Data, cycle: DateKey): { from: number; afterNight: number; earliest: number } {
  const prev = shiftKey(cycle, -1)
  const before = lastDose(data.doses.filter((d) => d.cycle < cycle))
  const planned = doseOf(data, prev, 'night') ? -Infinity : plan.night(prev).nightDose
  const afterNight = Math.max(before?.at ?? -Infinity, planned) + MIN_GAP
  const earliest = at(cycle, plan.s.dayDoseEarliest).getTime()
  return { from: Math.max(afterNight, earliest), afterNight, earliest }
}

export const dayDoseFrom = (plan: Plan, data: Data, cycle: DateKey): number => dayDoseRule(plan, data, cycle).from

/** Why the day dose waits until `from`: the 8 h rule or the earliest time. */
export function dayDoseReason(plan: Plan, data: Data, cycle: DateKey): string {
  const r = dayDoseRule(plan, data, cycle)
  return r.afterNight > r.earliest ? '8 ч после ночной' : `не раньше ${hm(r.earliest)}`
}

/**
 * The open day dose of `cycle`: `deadline` is the last moment that keeps tonight's night dose
 * and bedtime in place; from `lateAt` the app insists (red screen, notifications).
 */
export function dayDoseWindow(plan: Plan, data: Data, cycle: DateKey): { from: number; deadline: number; lateAt: number } {
  const from = dayDoseFrom(plan, data, cycle)
  const deadline = plan.night(cycle).nightDose - MIN_GAP
  return { from, deadline, lateAt: Math.min(from + plan.s.doseLateMin * MIN, Math.max(deadline, from + HOUR)) }
}

/**
 * Night `key` with the 8 h rule applied: a late day dose pushes the night dose,
 * and bedtime waits for the dose. Unchanged once he is in bed or took the night dose.
 */
export function nightFor(plan: Plan, data: Data, key: DateKey): Night {
  const n = plan.night(key)
  const last = lastDose(data.doses)
  if (!last || last.cycle > key || n.realBed != null || doseOf(data, key, 'night')) return n
  const nightDose = Math.max(n.nightDose, last.at + MIN_GAP)
  if (nightDose === n.nightDose) return n
  const bed = Math.max(n.bed, nightDose)
  return {
    ...n,
    nightDose,
    bed,
    windDown: bed - plan.s.windDownBefore * MIN,
    wake: plan.wakeAfter(key, bed),
    natural: bed + plan.s.sleepMin * MIN,
  }
}

/** Nights added to the way to the target if he goes to bed at `bed` on night `key` instead of on plan. */
export function lateCost(plan: Plan, data: Data, key: DateKey, bed: number): number {
  const onPlan = plan.targetNight(key)
  const others = data.sleeps.filter((x) => x.night !== key)
  const ifLate = makePlan(plan.s, [...others, { id: '', night: key, bed }]).targetNight(key)
  return onPlan && ifLate ? Math.max(0, daysBetween(onPlan, ifLate)) : 0
}

/** Why logging this dose now needs a second tap, or null. */
export function doseWarning(plan: Plan, data: Data, kind: DoseKind, now: number): string | null {
  const floor = doseFloor(data)
  const tooSoon =
    floor != null && now < floor
      ? `С прошлой дозы прошло ${duration(now - (floor - MIN_GAP))}. Твоё правило — не меньше 8 ч, то есть с ${hm(floor)}.`
      : null
  if (kind === 'day') {
    const cycle = activeCycle(plan, data, now)
    const taken = doseOf(data, cycle, 'day')
    if (taken) return `Дневная доза уже отмечена сегодня в ${hm(taken.at)}.`
    if (tooSoon) return tooSoon
    const r = dayDoseRule(plan, data, cycle)
    if (now < r.afterNight)
      return `После ночной прошло ${duration(now - (r.afterNight - MIN_GAP))}. Твоё правило — не меньше 8 ч, то есть с ${hm(r.from)}.`
    if (now < r.earliest) return `Дневную ты принимаешь не раньше ${hm(r.earliest)}.`
    return null
  }
  const cycle = bedNight(plan, data, now)
  const taken = doseOf(data, cycle, 'night')
  if (taken) return `Ночная доза уже отмечена в ${hm(taken.at)}.`
  if (tooSoon) return tooSoon
  const planned = plan.night(cycle).nightDose
  if (now < planned - NIGHT_EARLY) return `По плану ночная в ${hm(planned)}. Сейчас на ${duration(planned - now)} раньше.`
  return null
}

export type Tone = 'calm' | 'accent' | 'warn' | 'late' | 'night'
export type Action = 'wake' | 'day' | 'night' | 'bed' | 'notAsleep'

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
  /** Stop point: the whole screen turns red until he acts. */
  alert?: boolean
}

export interface Row {
  id: string
  time: number
  label: string
  prefix?: string
  /** Actual time of the logged action, if done. */
  done?: number
  missed?: boolean
  /** Its moment came and it still waits for him. */
  pending?: boolean
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
  const tonight = nightFor(plan, data, cycle)
  const day = doseOf(data, cycle, 'day')
  const night = doseOf(data, cycle, 'night')
  const dayWin = dayDoseWindow(plan, data, cycle)
  const dayFrom = dayWin.from
  const dayOpen = !day && !night && now >= dayFrom && now < tonight.nightDose
  const woke = data.sleeps.find((x) => x.night === prev.key && x.wake != null)
  const bedLog = data.sleeps.find((x) => x.night === cycle && x.bed != null)

  const morningOpen = !woke && now < Math.min(prev.wake + 2 * HOUR, prev.uni?.getReady ?? Infinity)
  const rows: Row[] = [
    { id: 'wake0', time: prev.wake, label: 'Подъём', done: woke?.wake, pending: morningOpen && now >= prev.wake },
  ]
  if (prev.uni) {
    const { getReady, readyBy } = prev.uni
    rows.push({ id: 'ready', time: getReady, label: 'Собираться', pending: now >= getReady && now < readyBy })
    rows.push({ id: 'readyBy', time: readyBy, label: 'Быть готовым' })
  }
  rows.push({
    id: 'day',
    time: dayFrom,
    label: 'Дневная доза',
    prefix: 'с',
    done: day?.at,
    missed: !day && (night != null || now >= tonight.nightDose),
    pending: dayOpen,
  })
  rows.push({ id: 'night', time: tonight.nightDose, label: 'Ночная доза', done: night?.at, pending: !night && now >= tonight.nightDose })
  rows.push({ id: 'wind', time: tonight.windDown, label: 'Готовиться ко сну' })
  rows.push({ id: 'bed', time: tonight.bed, label: 'Отбой', done: bedLog?.bed, pending: !bedLog && now >= tonight.bed })
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
        secondary: asleep.bed != null && now - asleep.bed < 30 * MIN ? 'notAsleep' : undefined,
      }
    }

    const action = pickAction()
    const base = { ...action, chip: action.primary ? chipFor(action.primary) : undefined }

    // Morning, not up yet (on university days only until getting ready starts).
    if (morningOpen) {
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
        // Nothing logged for that night: maybe he has not slept yet.
        secondary: sleepOf(data, prev.key) ? undefined : 'bed',
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

    // The day dose is long overdue: nothing else matters until it is taken.
    if (dayOpen && now >= dayWin.lateAt)
      return {
        ...base,
        chip: 'Не откладывай',
        label: 'Дневная доза ждёт уже',
        target: dayFrom,
        over: true,
        from: dayFrom,
        sub:
          now > dayWin.deadline
            ? `Примешь сейчас — ночная не раньше ${hm(now + MIN_GAP)}, отбой сдвинется`
            : `Прими до ${hm(dayWin.deadline)}, иначе сдвинутся ночная и отбой`,
        tone: 'late',
        alert: true,
      }

    // Waiting for the day dose to be allowed.
    if (!day && now < dayFrom && dayFrom < tonight.nightDose)
      return {
        ...base,
        label: 'Дневная доза через',
        target: dayFrom,
        over: false,
        from: dayFrom - MIN_GAP,
        sub: `Можно с ${hm(dayFrom)}: ${dayDoseReason(plan, data, cycle)}`,
        tone: 'calm',
      }

    const pushed = tonight.nightDose > plan.night(cycle).nightDose
    const sub = night
      ? `Лечь в ${hm(tonight.bed)} · подъём в ${hm(tonight.wake)}`
      : dayOpen
        ? `Дневную — до ${hm(dayWin.deadline)}, чтобы отбой остался в ${hm(tonight.bed)}`
        : pushed
          ? `Ночная доза не раньше ${hm(tonight.nightDose)}: 8 ч после дневной`
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
    const cost = now > tonight.bed + plan.s.bedTolerance * MIN ? lateCost(plan, data, cycle, now) : 0
    return {
      ...base,
      label: 'Отбой был в ' + hm(tonight.bed),
      target: tonight.bed,
      over: true,
      from: tonight.bed,
      sub: `Ляжешь сейчас — подъём в ${hm(plan.wakeAfter(cycle, now))}` + (cost ? ` · цель позже на ${cost} дн.` : ''),
      tone: 'late',
      alert: true,
      secondary: base.secondary ?? (now > tonight.bed + 3 * HOUR ? 'wake' : undefined),
    }
  }

  function pickAction(): Pick<Hero, 'primary' | 'secondary'> {
    if (dayOpen) return { primary: 'day' }
    // «Лёг» also logs the night dose, so after bedtime one tap does both.
    if (!night && now >= tonight.bed) return { primary: 'bed', secondary: 'night' }
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
