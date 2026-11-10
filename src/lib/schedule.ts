// What the Android app hands to the native side: real alarms, reminders and the live
// sleep notification, computed from the plan for the next days. Pure: no Capacitor here.
import type { CustomAlarm, Data } from './model.ts'
import type { Plan } from './plan.ts'
import { SOUNDS } from './series.ts'
import { at, hm, keyOf, MIN, shiftKey } from './time.ts'
import { activeCycle, dayDoseWindow, doseFloor, doseOf, nightFor, openSleep } from './today.ts'

export type NativeAction = 'day' | 'night' | 'bed' | 'wake'

export interface NativeEvent {
  at: number
  /** alarm: rings (full screen); remind: one notification with sound; live: the ongoing sleep card; clear: hides it. */
  kind: 'alarm' | 'remind' | 'live' | 'clear'
  title: string
  text: string
  /** live: chronometer target (counts down before it, up after it). */
  target?: number
  /** alarm: sound index, ring length, and the group «Я встал» stops at once. */
  sound?: number
  ringMs?: number
  group?: string
  actions?: NativeAction[]
  /** Suggests taking a dose: never placed before the last dose + 8 h. */
  dose?: boolean
}

const LOOP_AFTER_LAST_MIN = 60
const NAG_HOURS = 6

/** Wake-up series for one night: each offset rings, then the ring/pause cycle repeats for an hour. */
function series(base: number, offsets: number[], ringMin: number, pauseMin: number, group: string, title: string, text: string): NativeEvent[] {
  const sorted = [...offsets].sort((a, b) => a - b)
  const out: NativeEvent[] = sorted.map((o, i) => ({
    at: base + o * MIN,
    kind: 'alarm',
    title,
    text,
    sound: i % SOUNDS.length,
    ringMs: ringMin * MIN,
    group,
  }))
  const last = base + sorted[sorted.length - 1] * MIN
  const period = (ringMin + pauseMin) * MIN
  for (let c = 1; c * period <= LOOP_AFTER_LAST_MIN * MIN; c++)
    out.push({ at: last + c * period, kind: 'alarm', title, text, sound: (sorted.length - 1 + c) % SOUNDS.length, ringMs: ringMin * MIN, group })
  return out
}

function ownAlarms(a: CustomAlarm, data: Data, now: number, days: number): NativeEvent[] {
  if (!a.on) return []
  const dates = a.daily ? Array.from({ length: days + 1 }, (_, i) => shiftKey(keyOf(now), i)) : [a.date]
  const s = data.settings
  return dates.flatMap((date) => {
    const t = at(date, a.min).getTime()
    if (t <= now || a.done === t) return []
    return series(t, [0], s.ringMin, s.pauseMin, `own-${a.id}-${date}`, a.label || 'Будильник', hm(t)).slice(0, 3)
  })
}

export function buildEvents(plan: Plan, data: Data, now: number, days = 7): NativeEvent[] {
  const s = data.settings
  const events: NativeEvent[] = []
  const cycle = activeCycle(plan, data, now)
  const asleep = openSleep(data, now)

  for (let i = -1; i < days; i++) {
    const key = shiftKey(cycle, i)
    const n = nightFor(plan, data, key)
    const sleep = data.sleeps.find((x) => x.night === key)
    const inBed = sleep?.bed != null
    const nightTaken = doseOf(data, key, 'night')

    // Morning after this night.
    if (sleep?.wake == null)
      events.push(...series(n.wake, s.phoneOffsets, s.ringMin, s.pauseMin, `wake-${key}`, 'Подъём', `Встать в ${hm(n.wake)}`))
    if (n.uni) {
      events.push({ at: n.uni.getReady, kind: 'remind', title: 'Собираться', text: `Быть готовым к ${hm(n.uni.readyBy)}` })
      events.push({
        at: n.uni.leave,
        kind: 'alarm',
        title: `Через ${s.leaveBefore} мин выходить`,
        text: `Быть готовым к ${hm(n.uni.readyBy)}`,
        sound: 1,
        ringMs: MIN,
        group: `leave-${key}`,
      })
    }

    // Day dose: one notification when it becomes allowed, three when it is long overdue.
    if (s.doseNotify && !inBed && !nightTaken && !doseOf(data, key, 'day')) {
      const w = dayDoseWindow(plan, data, key)
      if (w.from < n.nightDose) {
        events.push({ at: w.from, kind: 'remind', title: 'Можно дневную дозу', text: `Лучше до ${hm(w.deadline)}`, actions: ['day'], dose: true })
        for (let k = 0; k < 3; k++) {
          const t = w.lateAt + k * 20 * MIN
          if (t < n.nightDose)
            events.push({ at: t, kind: 'remind', title: 'Дневная доза не отмечена', text: 'Прими и отметь. От неё зависят ночная и отбой', actions: ['day'], dose: true })
        }
      }
    }

    // Evening: reminders and the live card, unless he is already in bed.
    if (!inBed) {
      if (s.doseNotify && !nightTaken)
        events.push({ at: n.nightDose, kind: 'remind', title: 'Пора: ночная доза', text: `Отбой в ${hm(n.bed)}`, actions: ['night'], dose: true })
      events.push({ at: n.windDown, kind: 'remind', title: 'Готовься ко сну', text: `Отбой в ${hm(n.bed)}` })
      events.push({ at: n.bed, kind: 'remind', title: 'Отбой', text: `Ложись и нажми «Лёг». Подъём в ${hm(n.wake)}`, actions: ['bed'] })
      // Still up: come back every 20 min until «Лёг» (closable, a sound, no ringing). Only the nearest nights, to keep the list short.
      if (i <= 1 && s.bedNagMin > 0)
        for (let t = n.bed + s.bedNagMin * MIN; t <= Math.min(n.bed + NAG_HOURS * 60 * MIN, n.wake - 30 * MIN); t += s.bedNagMin * MIN)
          events.push({ at: t, kind: 'remind', title: 'Пора спать', text: `Отбой был в ${hm(n.bed)}. Ляг и нажми «Лёг»`, actions: ['bed'] })
      events.push({
        at: n.bed - 2 * 60 * MIN,
        kind: 'live',
        title: `Отбой в ${hm(n.bed)}`,
        text: nightTaken ? `Ночная доза принята в ${hm(nightTaken.at)}` : `Ночная доза в ${hm(n.nightDose)}`,
        target: n.bed,
      })
      events.push(
        nightTaken
          ? { at: n.nightDose, kind: 'live', title: `Отбой в ${hm(n.bed)}`, text: `Ночная доза принята в ${hm(nightTaken.at)}`, target: n.bed, actions: ['bed'] }
          : { at: n.nightDose, kind: 'live', title: 'Пора: ночная доза', text: `Отбой в ${hm(n.bed)}`, target: n.bed, actions: ['night'], dose: true },
      )
      events.push({
        at: n.windDown,
        kind: 'live',
        title: 'Готовься ко сну',
        text: `Отбой в ${hm(n.bed)}`,
        target: n.bed,
        actions: nightTaken ? ['bed'] : ['night', 'bed'],
        dose: !nightTaken,
      })
      events.push({ at: n.bed, kind: 'live', title: `Отбой был в ${hm(n.bed)}`, text: `Ложись. Подъём в ${hm(n.wake)}`, target: n.bed, actions: ['bed'] })
    } else if (asleep?.night === key) {
      events.push({ at: Math.min(now, asleep.bed ?? now), kind: 'live', title: 'Сон', text: `Подъём в ${hm(n.wake)}`, target: n.wake, actions: ['wake'] })
    }

    // After the wake-up: university mornings keep a card until «быть готовым», others clear it.
    if (n.uni) {
      events.push({ at: n.wake, kind: 'live', title: `Быть готовым к ${hm(n.uni.readyBy)}`, text: `Собираться в ${hm(n.uni.getReady)}`, target: n.uni.readyBy })
      events.push({ at: n.uni.readyBy, kind: 'clear', title: '', text: '' })
    } else events.push({ at: n.wake, kind: 'clear', title: '', text: '' })
  }

  for (const a of data.alarms) events.push(...ownAlarms(a, data, now, days))

  // Safety net for the hard rule: whatever the logic above did, no dose is suggested before the last dose + 8 h.
  const floor = doseFloor(data)
  if (floor != null) for (const e of events) if (e.dose && e.at < floor) e.at = floor

  // Past events matter only for the live card (the latest one is shown now); drop the rest.
  return events
    .filter((e) => e.at > now || e.kind === 'live' || e.kind === 'clear')
    .filter((e) => e.at > now - 24 * 60 * MIN)
    .sort((a, b) => a.at - b.at)
}
