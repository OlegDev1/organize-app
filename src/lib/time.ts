import { addDays, differenceInCalendarDays, format } from 'date-fns'
import { ru } from 'date-fns/locale'

export const MIN = 60_000
export const HOUR = 60 * MIN

/** A calendar date in local time, 'yyyy-MM-dd'. */
export type DateKey = string

export const keyOf = (t: Date | number): DateKey => format(t, 'yyyy-MM-dd')

export function parseKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const shiftKey = (key: DateKey, days: number): DateKey => keyOf(addDays(parseKey(key), days))

/** Whole days from a to b (b − a). */
export const daysBetween = (a: DateKey, b: DateKey): number =>
  differenceInCalendarDays(parseKey(b), parseKey(a))

/** Wall-clock time: `minutes` after local midnight of `key` (may exceed 24 h; DST-safe). */
export function at(key: DateKey, minutes: number): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 0, minutes)
}

/** Minutes after local midnight of `key` for a moment (wall clock, may exceed 1440). */
export function minutesFrom(key: DateKey, t: number): number {
  const base = parseKey(key)
  const d = new Date(t)
  const days = differenceInCalendarDays(d, base)
  return days * 1440 + d.getHours() * 60 + d.getMinutes()
}

const pad = (n: number) => String(n).padStart(2, '0')

export const hm = (t: Date | number): string => format(t, 'HH:mm')

/** 1500 → '01:00' (minutes of day, wrapped). */
export function clockOf(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
}

/** '2:14:37'. Negative values count the same way (caller shows the sign). */
export function countdown(ms: number): string {
  const s = Math.floor(Math.abs(ms) / 1000)
  return `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`
}

/** '7 ч 20 мин', '45 мин', '9 ч'. */
export function duration(ms: number): string {
  const total = Math.round(Math.abs(ms) / MIN)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (!h) return `${m} мин`
  return m ? `${h} ч ${m} мин` : `${h} ч`
}

/** 'пн, 9 ноября' */
export const dayLabel = (t: Date | number): string => format(t, 'EEEEEE, d MMMM', { locale: ru })

/** '9 нояб.' */
export const shortDay = (t: Date | number): string => format(t, 'd MMM', { locale: ru })

export const weekdayShort = (t: Date | number): string => format(t, 'EEEEEE', { locale: ru })

/** Offsets like −15 → '−15', 10 → '+10', 0 → '0'. */
export const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0')

/** Parses '−15, -5, 0, +10' into numbers; null if anything is not a number. */
export function parseOffsets(text: string): number[] | null {
  const parts = text
    .replace(/−/g, '-')
    .split(/[,\s]+/)
    .filter(Boolean)
  const nums = parts.map(Number)
  if (!nums.length || nums.some((n) => !Number.isInteger(n) || Math.abs(n) > 180)) return null
  return [...new Set(nums)].sort((a, b) => a - b)
}

/** 'HH:MM' → minutes of day, or null. */
export function parseClock(text: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  return h < 24 && min < 60 ? h * 60 + min : null
}
