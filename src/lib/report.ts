// Text report for the doctor: summary of sleep and doses for a period, day by day, plus the notes.
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { Data } from './model.ts'
import type { Plan } from './plan.ts'
import { clockOf, duration, hm, minutesFrom, parseKey, shiftKey, type DateKey } from './time.ts'
import { doseOf, MIN_GAP } from './today.ts'

const RATING = { 1: 'плохо', 2: 'нормально', 3: 'хорошо' } as const

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

export function buildReport(plan: Plan, data: Data, today: DateKey, days = 14): string {
  const s = data.settings
  const keys = Array.from({ length: days }, (_, i) => shiftKey(today, i - days + 1))
  const nights = keys.map((k) => shiftKey(k, -1))
  const day = (k: DateKey) => format(parseKey(k), 'd MMMM', { locale: ru })
  const lines: string[] = [`Режим: отчёт за ${day(keys[0])} – ${day(today)} ${parseKey(today).getFullYear()}`, '']

  // Doses.
  const dayDoses = keys.flatMap((k) => doseOf(data, k, 'day') ?? [])
  const nightDoses = nights.flatMap((k) => doseOf(data, k, 'night') ?? [])
  const gaps = keys.flatMap((k) => {
    const d = doseOf(data, k, 'day')
    const n = doseOf(data, shiftKey(k, -1), 'night')
    return d && n ? [d.at - n.at] : []
  })
  const named = (title: string, name: string) => (name ? `${title} (${name})` : title)
  lines.push('Лекарства')
  lines.push(
    `${named('Дневная доза', s.dayName)}: ${dayDoses.length} из ${days} дней` +
      (dayDoses.length ? `, в среднем в ${clockOf(avg(dayDoses.map((d) => minutesFrom(d.cycle, d.at))))}` : ''),
  )
  lines.push(
    `${named('Ночная доза', s.nightName)}: ${nightDoses.length} из ${days}` +
      (nightDoses.length ? `, в среднем в ${clockOf(avg(nightDoses.map((d) => minutesFrom(d.cycle, d.at))))}` : ''),
  )
  if (gaps.length) {
    const short = gaps.filter((g) => g < MIN_GAP).length
    lines.push(`Между ночной и дневной: в среднем ${duration(avg(gaps))}; меньше 8 ч — ${short} раз`)
  }
  lines.push('')

  // Sleep.
  const sleeps = nights.flatMap((k) => data.sleeps.find((x) => x.night === k) ?? [])
  const beds = sleeps.flatMap((x) => (x.bed != null ? [minutesFrom(x.night, x.bed)] : []))
  const slept = sleeps.flatMap((x) => (x.bed != null && x.wake != null ? [x.wake - x.bed] : []))
  const ratings = sleeps.flatMap((x) => (x.rating ? [x.rating] : []))
  lines.push('Сон')
  lines.push(`Отмечено ночей: ${beds.length} из ${days}`)
  if (beds.length) lines.push(`Отбой в среднем в ${clockOf(avg(beds))}` + (slept.length ? `, сон в среднем ${duration(avg(slept))}` : ''))
  if (ratings.length)
    lines.push(`Самочувствие утром: хорошо ${ratings.filter((r) => r === 3).length}, нормально ${ratings.filter((r) => r === 2).length}, плохо ${ratings.filter((r) => r === 1).length}`)
  lines.push(`План: отбой сегодня в ${hm(plan.night(today).bed)}, цель ${clockOf(s.targetBed)}`)
  lines.push('')

  // Day by day, newest first.
  lines.push('По дням')
  for (const k of [...keys].reverse()) {
    const sl = data.sleeps.find((x) => x.night === shiftKey(k, -1))
    const d = doseOf(data, k, 'day')
    const n = doseOf(data, k, 'night')
    const parts: string[] = []
    if (sl?.bed != null || sl?.wake != null) {
      let sleep = `сон ${sl.bed != null ? hm(sl.bed) : '?'}–${sl.wake != null ? hm(sl.wake) : '?'}`
      if (sl.bed != null && sl.wake != null) sleep += ` (${duration(sl.wake - sl.bed)})`
      if (sl.rating) sleep += `, ${RATING[sl.rating]}`
      parts.push(sleep)
    }
    parts.push(`дневная ${d ? hm(d.at) : '—'}`, `ночная ${n ? hm(n.at) : '—'}`)
    lines.push(`${format(parseKey(k), 'EEEEEE d.MM', { locale: ru })}: ${parts.join('; ')}`)
  }

  // Notes of the period.
  const from = parseKey(keys[0]).getTime()
  const notes = data.notes.filter((x) => x.at >= from).sort((a, b) => a.at - b.at)
  if (notes.length) {
    lines.push('', 'Заметки')
    for (const x of notes) lines.push(`${format(x.at, 'd.MM HH:mm')} — ${x.text}`)
  }
  return lines.join('\n')
}

export const REPORT_DAYS = [7, 14, 30] as const
