import { MIN } from './time.ts'

export const SOUNDS = ['Колокольчики', 'Бип-бип', 'Сирена', 'Гонг', 'Тревога'] as const

export interface RingState {
  ringing: boolean
  /** Index of the alarm in the series (−1 before the first). */
  step: number
  sound: number
  /** When the next ring starts (null while ringing or after the end). */
  next: number | null
  over: boolean
}

/**
 * Wake-up series: an alarm at `base + offset` for each offset. Each rings `ringMin`, then stays
 * silent until the next one. After the last one, ring/pause repeats until stopped or `capMin`.
 * Every ring gets the next sound, so consecutive rings never sound the same.
 */
export function seriesAt(
  base: number,
  offsets: number[],
  ringMin: number,
  pauseMin: number,
  t: number,
  capMin = 180,
): RingState {
  const starts = [...offsets].sort((a, b) => a - b).map((o) => base + o * MIN)
  const ring = ringMin * MIN
  const period = ring + pauseMin * MIN
  const last = starts.length - 1
  if (t < starts[0]) return { ringing: false, step: -1, sound: 0, next: starts[0], over: false }
  if (t >= starts[last] + capMin * MIN) return { ringing: false, step: last, sound: 0, next: null, over: true }

  let k = 0
  while (k < last && starts[k + 1] <= t) k++
  const e = t - starts[k]
  if (k < last) {
    const ringing = e < ring
    return { ringing, step: k, sound: k % SOUNDS.length, next: ringing ? null : starts[k + 1], over: false }
  }
  const cycle = Math.floor(e / period)
  const ringing = e % period < ring
  return {
    ringing,
    step: k,
    sound: (k + cycle) % SOUNDS.length,
    next: ringing ? null : starts[k] + (cycle + 1) * period,
    over: false,
  }
}
