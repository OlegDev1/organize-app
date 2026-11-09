import { db, getPlan } from './db.svelte.ts'
import type { CustomAlarm } from './model.ts'
import { seriesAt } from './series.ts'
import { audioReady, play, stop, unlockAudio } from './sound.ts'
import { at, keyOf, shiftKey, type DateKey } from './time.ts'
import { activeCycle } from './today.ts'

export interface Active {
  kind: 'series' | 'custom'
  id?: string
  label: string
  ringing: boolean
  sound: number
  /** Next ring while silent. */
  next: number | null
}

export const alarm = $state({
  active: null as Active | null,
  audio: false,
  wakeLock: false,
})

/** The wake-up the Mac should ring for: tonight's plan, or his one-off change. */
export function macWake(now: number): { night: DateKey; planned: number; wake: number; manual: boolean } {
  const plan = getPlan()
  const night = activeCycle(plan, db, now)
  const planned = plan.night(night).wake
  const o = db.wakeOverride
  const manual = o?.night === night
  return { night, planned, wake: manual && o ? o.at : planned, manual }
}

/** Last occurrence at or before now (daily) or the set date (once). */
export function occurrence(a: CustomAlarm, now: number): number {
  if (!a.daily) return at(a.date, a.min).getTime()
  const today = at(keyOf(now), a.min).getTime()
  return today <= now ? today : at(shiftKey(keyOf(now), -1), a.min).getTime()
}

export function nextOccurrence(a: CustomAlarm, now: number): number {
  if (!a.daily) return at(a.date, a.min).getTime()
  const today = at(keyOf(now), a.min).getTime()
  return today > now ? today : at(shiftKey(keyOf(now), 1), a.min).getTime()
}

let playing = false

function tick() {
  const now = Date.now()
  const s = db.settings
  let active: Active | null = null

  if (db.armed) {
    const st = seriesAt(db.armed.wake, s.macOffsets, s.ringMin, s.pauseMin, now)
    if (st.over) db.armed = null
    else if (st.step >= 0)
      active = { kind: 'series', label: 'Подъём', ringing: st.ringing, sound: st.sound, next: st.next }
  }

  if (!active?.ringing) {
    for (const a of db.alarms) {
      if (!a.on) continue
      const occ = occurrence(a, now)
      if (occ > now || a.done === occ) continue
      const st = seriesAt(occ, [0], s.ringMin, s.pauseMin, now, 60)
      if (st.over) {
        a.done = occ
        if (!a.daily) a.on = false
        continue
      }
      active = { kind: 'custom', id: a.id, label: a.label || 'Будильник', ringing: st.ringing, sound: st.sound, next: st.next }
      break
    }
  }

  alarm.active = active
  alarm.audio = audioReady()
  if (active?.ringing) {
    play(active.sound)
    playing = true
  } else if (playing) {
    stop()
    playing = false
  }
  void keepAwake(db.armed != null || active != null)
}

let lock: WakeLockSentinel | null = null
let requesting = false

async function keepAwake(want: boolean) {
  if (want && !lock && !requesting && document.visibilityState === 'visible' && 'wakeLock' in navigator) {
    requesting = true
    try {
      lock = await navigator.wakeLock.request('screen')
      alarm.wakeLock = true
      lock.addEventListener('release', () => {
        lock = null
        alarm.wakeLock = false
      })
    } catch {
      alarm.wakeLock = false
    } finally {
      requesting = false
    }
  }
  if (!want && lock) {
    await lock.release()
    lock = null
    alarm.wakeLock = false
  }
}

setInterval(tick, 500)
document.addEventListener('visibilitychange', tick)

/** Starts the wake-up series. Call from a tap (unlocks audio). */
export async function arm() {
  await unlockAudio()
  db.armed = { wake: macWake(Date.now()).wake }
  tick()
}

export function disarm() {
  db.armed = null
  tick()
}

/** «Я встал» / «Стоп»: stops what is ringing now. */
export function dismiss() {
  const a = alarm.active
  if (a?.kind === 'series') db.armed = null
  if (a?.kind === 'custom') {
    const c = db.alarms.find((x) => x.id === a.id)
    if (c) {
      c.done = occurrence(c, Date.now())
      if (!c.daily) c.on = false
    }
  }
  tick()
}

export async function enableSound() {
  alarm.audio = await unlockAudio()
}
