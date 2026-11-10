import { db, getPlan, uid } from './db.svelte.ts'
import type { Dose, DoseKind } from './model.ts'
import { activeCycle, bedNight, doseFloor, doseOf, doseWarning, MIN_GAP, nightJustEnded, openSleep } from './today.ts'
import { duration, hm } from './time.ts'
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
  const plan = getPlan()
  // A night dose belongs to the night he is about to sleep, also when that is already "tomorrow" by the clock.
  const cycle = kind === 'night' ? bedNight(plan, db, now) : activeCycle(plan, db, now)
  const dose: Dose = { id: uid(), kind, at: now, cycle }
  db.doses.push(dose)
  buzz()
  toast(`${doseName(kind)} · ${hm(now)}. Следующая не раньше ${hm(now + MIN_GAP)}`, () => removeById(db.doses, dose.id))
}

export async function deleteDose(id: string) {
  const d = db.doses.find((x) => x.id === id)
  if (!d) return
  if (await ask({ title: 'Удалить отметку?', text: `${doseName(d.kind)} в ${hm(d.at)}.`, ok: 'Удалить', cancel: 'Оставить', danger: true }))
    removeById(db.doses, id)
}

/** «Лёг»: the real bedtime. He takes the night dose right before sleep, so it is logged too if it wasn't. */
export async function goToBed() {
  if (openSleep(db, Date.now())) return
  const night = bedNight(getPlan(), db, Date.now())
  let withDose = !doseOf(db, night, 'night')
  const floor = doseFloor(db)
  if (withDose && floor != null && Date.now() < floor)
    withDose = await ask({
      title: 'Ночная доза',
      text: `С прошлой дозы прошло ${duration(Date.now() - (floor - MIN_GAP))}. По твоему правилу ночную можно с ${hm(floor)}. Отметить её сейчас?`,
      ok: 'Отметить ночную',
      cancel: 'Только отбой',
      danger: true,
    })

  const now = Date.now()
  const dose: Dose | undefined = withDose ? { id: uid(), kind: 'night', at: now, cycle: night } : undefined
  if (dose) db.doses.push(dose)
  const existing = db.sleeps.find((x) => x.night === night)
  let undo: () => void
  if (existing) {
    // Tapped «Встал» by mistake earlier tonight, or got up and lies down again: one record per night.
    const before = { bed: existing.bed, wake: existing.wake }
    existing.bed = now
    existing.wake = undefined
    undo = () => Object.assign(existing, before)
  } else {
    const s = { id: uid(), night, bed: now }
    db.sleeps.push(s)
    undo = () => removeById(db.sleeps, s.id)
  }
  buzz()
  toast(`Отбой · ${hm(now)}${dose ? ' · ночная отмечена' : ''}. Подъём в ${hm(getPlan().night(night).wake)}`, () => {
    undo()
    if (dose) removeById(db.doses, dose.id)
  })
}

/** He got up again shortly after «Лёг»: forget that bedtime. The dose logged with it stays (delete it in «Дозы» if needed). */
export function notAsleep() {
  const open = openSleep(db, Date.now())
  if (!open) return
  const copy = { ...open }
  removeById(db.sleeps, open.id)
  toast('Отбой отменён', () => db.sleeps.push(copy))
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
