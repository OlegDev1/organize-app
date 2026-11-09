import { db, getPlan, uid } from './db.svelte.ts'
import type { DoseKind } from './model.ts'
import { activeCycle, doseWarning, nightJustEnded, openSleep } from './today.ts'
import { hm } from './time.ts'
import { ask, buzz, toast } from './ui.svelte.ts'

const doseName = (kind: DoseKind) => (kind === 'day' ? 'Дневная доза' : 'Ночная доза')

function removeById<T extends { id: string }>(list: T[], id: string) {
  const i = list.findIndex((x) => x.id === id)
  if (i >= 0) list.splice(i, 1)
}

/** One tap logs the current time. Too early or already taken: asks once more. */
export async function takeDose(kind: DoseKind) {
  const warning = doseWarning(getPlan(), db, kind, Date.now())
  if (
    warning &&
    !(await ask({ title: 'Точно отметить?', text: warning, ok: 'Всё равно отметить', cancel: 'Не отмечать', danger: true }))
  )
    return
  const now = Date.now()
  const dose = { id: uid(), kind, at: now, cycle: activeCycle(getPlan(), db, now) }
  db.doses.push(dose)
  buzz()
  toast(`${doseName(kind)} · ${hm(now)}`, () => removeById(db.doses, dose.id))
}

export async function deleteDose(id: string) {
  const d = db.doses.find((x) => x.id === id)
  if (!d) return
  if (await ask({ title: 'Удалить отметку?', text: `${doseName(d.kind)} в ${hm(d.at)}.`, ok: 'Удалить', cancel: 'Оставить', danger: true }))
    removeById(db.doses, id)
}

export function goToBed() {
  const now = Date.now()
  if (openSleep(db, now)) return
  const night = activeCycle(getPlan(), db, now)
  const existing = db.sleeps.find((x) => x.night === night)
  if (existing) {
    // Tapped «Встал» by mistake earlier tonight, or logs again: keep one record per night.
    const before = { bed: existing.bed, wake: existing.wake }
    existing.bed = now
    existing.wake = undefined
    toast(`Отбой · ${hm(now)}`, () => Object.assign(existing, before))
  } else {
    const s = { id: uid(), night, bed: now }
    db.sleeps.push(s)
    toast(`Отбой · ${hm(now)}. Спокойной ночи`, () => removeById(db.sleeps, s.id))
  }
  buzz()
}

export function wakeUp() {
  const now = Date.now()
  const open = openSleep(db, now)
  buzz()
  if (open) {
    open.wake = now
    toast(`Подъём · ${hm(now)}`, () => (open.wake = undefined))
    return
  }
  const night = nightJustEnded(getPlan(), now)
  const existing = db.sleeps.find((x) => x.night === night)
  if (existing?.wake != null) return toast(`Подъём уже отмечен в ${hm(existing.wake)}`)
  if (existing) {
    existing.wake = now
    toast(`Подъём · ${hm(now)}`, () => (existing.wake = undefined))
    return
  }
  const s = { id: uid(), night, wake: now }
  db.sleeps.push(s)
  toast(`Подъём · ${hm(now)}`, () => removeById(db.sleeps, s.id))
}

/** Wake-up logged by the native alarm («Я встал» on the alarm screen). */
export function wakeUpAt(at: number, night: string) {
  const s = db.sleeps.find((x) => x.night === night)
  if (s?.wake != null) return
  if (s) s.wake = at
  else db.sleeps.push({ id: uid(), night, wake: at })
  toast(`Подъём отмечен · ${hm(at)}`)
}

export function rateSleep(id: string, rating: 1 | 2 | 3) {
  const s = db.sleeps.find((x) => x.id === id)
  if (s) s.rating = rating
  buzz()
}

export async function useGrace(night: string) {
  const ok = await ask({
    title: 'Взять поблажку?',
    text: 'Сегодня повторяются вчерашние времена, план сдвигается на день. Следующая поблажка — через 7 дней.',
    ok: 'Взять поблажку',
    cancel: 'Держать план',
  })
  if (ok && !db.graces.includes(night)) db.graces.push(night)
}

export function addNote(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  db.notes.push({ id: uid(), at: Date.now(), text: t })
  buzz()
  return true
}

export async function deleteNote(id: string) {
  if (await ask({ title: 'Удалить заметку?', text: 'Её нельзя будет вернуть.', ok: 'Удалить', cancel: 'Оставить', danger: true }))
    removeById(db.notes, id)
}

export { removeById }
