// Alarm sounds, synthesized with Web Audio: no files, each one clearly different.

let ctx: AudioContext | null = null
let out: GainNode | null = null
let timer: ReturnType<typeof setInterval> | undefined
let current = -1
let nextBar = 0

function context(): AudioContext {
  ctx ??= new AudioContext()
  return ctx
}

/** Must run inside a tap: browsers keep audio locked until then. */
export async function unlockAudio(): Promise<boolean> {
  const c = context()
  if (c.state !== 'running') await c.resume().catch(() => undefined)
  return c.state === 'running'
}

export const audioReady = (): boolean => ctx?.state === 'running'

interface Tone {
  type: OscillatorType
  freq: number
  at: number
  dur: number
  vol: number
  to?: number
  /** Bell-like fade instead of a flat note. */
  ring?: boolean
}

function tone(c: AudioContext, dest: AudioNode, t: Tone) {
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = t.type
  o.frequency.setValueAtTime(t.freq, t.at)
  if (t.to) o.frequency.exponentialRampToValueAtTime(t.to, t.at + t.dur)
  g.gain.setValueAtTime(0.0001, t.at)
  g.gain.exponentialRampToValueAtTime(t.vol, t.at + 0.012)
  if (t.ring) g.gain.exponentialRampToValueAtTime(0.0001, t.at + t.dur)
  else {
    g.gain.setValueAtTime(t.vol, t.at + t.dur - 0.03)
    g.gain.exponentialRampToValueAtTime(0.0001, t.at + t.dur)
  }
  o.connect(g).connect(dest)
  o.start(t.at)
  o.stop(t.at + t.dur + 0.05)
}

/** Each pattern schedules one bar at `t` and returns its length in seconds. */
const patterns: ((c: AudioContext, d: AudioNode, t: number) => number)[] = [
  // Колокольчики
  (c, d, t) => {
    ;[1047, 1319, 1568, 2093].forEach((freq, i) => {
      tone(c, d, { type: 'sine', freq, at: t + i * 0.16, dur: 1.1, vol: 0.4, ring: true })
      tone(c, d, { type: 'triangle', freq: freq * 2, at: t + i * 0.16, dur: 0.4, vol: 0.06, ring: true })
    })
    return 1.6
  },
  // Бип-бип
  (c, d, t) => {
    for (let i = 0; i < 4; i++) tone(c, d, { type: 'square', freq: 1046, at: t + i * 0.17, dur: 0.09, vol: 0.16 })
    return 1.2
  },
  // Сирена
  (c, d, t) => {
    tone(c, d, { type: 'sawtooth', freq: 520, to: 1250, at: t, dur: 0.75, vol: 0.14 })
    tone(c, d, { type: 'sawtooth', freq: 1250, to: 520, at: t + 0.75, dur: 0.75, vol: 0.14 })
    return 1.5
  },
  // Гонг
  (c, d, t) => {
    ;[
      [174, 0.5],
      [349, 0.25],
      [523, 0.16],
      [880, 0.08],
    ].forEach(([freq, vol]) => tone(c, d, { type: 'sine', freq, at: t, dur: 2.6, vol, ring: true }))
    return 2.4
  },
  // Тревога
  (c, d, t) => {
    for (let i = 0; i < 4; i++)
      tone(c, d, { type: 'square', freq: i % 2 ? 660 : 880, at: t + i * 0.24, dur: 0.22, vol: 0.15 })
    return 1.1
  },
]

function schedule() {
  if (!ctx || !out || current < 0) return
  while (nextBar < ctx.currentTime + 1.5) nextBar += patterns[current](ctx, out, nextBar)
}

/** Plays a sound in a loop, getting louder over 45 s. Same sound again = keep playing. */
export function play(sound: number) {
  if (sound === current) return
  stop()
  const c = context()
  current = sound
  out = c.createGain()
  out.connect(c.destination)
  out.gain.setValueAtTime(0.3, c.currentTime)
  out.gain.linearRampToValueAtTime(1, c.currentTime + 45)
  nextBar = c.currentTime + 0.05
  schedule()
  timer = setInterval(schedule, 250)
}

export function stop() {
  clearInterval(timer)
  current = -1
  // Notes already scheduled go to the old node: disconnecting it silences them at once.
  out?.disconnect()
  out = null
}

/** A short preview (3 s). */
export function preview(sound: number) {
  play(sound)
  setTimeout(() => {
    if (current === sound) stop()
  }, 3000)
}
