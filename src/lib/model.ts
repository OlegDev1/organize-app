import type { DateKey } from './time.ts'

export type DoseKind = 'day' | 'night'

/** `cycle` = the night (evening date) whose day this dose belongs to. */
export interface Dose {
  id: string
  kind: DoseKind
  at: number
  cycle: DateKey
}

/** One night of sleep. Either side may be missing if he forgot to tap. */
export interface Sleep {
  id: string
  night: DateKey
  bed?: number
  wake?: number
  /** Morning answer to «Как спал?»: 1 bad, 2 ok, 3 good. */
  rating?: 1 | 2 | 3
}

export interface Note {
  id: string
  at: number
  text: string
}

/** A Mac alarm he sets himself. `date` is used only when not daily. */
export interface CustomAlarm {
  id: string
  min: number
  label: string
  daily: boolean
  on: boolean
  date: DateKey
  /** The occurrence (ms) he already stopped. */
  done?: number
}

export type Theme = 'auto' | 'light' | 'dark'

export interface Settings {
  dayName: string
  nightName: string
  /** First night of the plan (evening date). */
  planStart: DateKey
  /** Bedtimes are minutes after midnight of the evening date: 04:00 next day = 1680. */
  startBed: number
  targetBed: number
  /** Step per night while bedtime is later than `fastUntil`; then `holdNights` nights there; then `slowStep`. */
  fastStep: number
  fastUntil: number
  holdNights: number
  slowStep: number
  /** A real bedtime up to this many minutes late still counts as on plan. */
  bedTolerance: number
  sleepMin: number
  doseBefore: number
  /** The day dose is never before this time (minutes of day). */
  dayDoseEarliest: number
  /** Minutes after the day dose became allowed when the app starts to insist. */
  doseLateMin: number
  /** Notifications when a dose becomes allowed or is overdue. */
  doseNotify: boolean
  /** While he is up after bedtime, remind every this many minutes. */
  bedNagMin: number
  windDownBefore: number
  /** «Быть готовым к», minutes of day, by weekday (0 = Sunday); null = no university. */
  readyBy: (number | null)[]
  prepMin: number
  leaveBefore: number
  phoneOffsets: number[]
  macOffsets: number[]
  ringMin: number
  pauseMin: number
  theme: Theme
}

export interface Data {
  v: 4
  settings: Settings
  doses: Dose[]
  sleeps: Sleep[]
  notes: Note[]
  alarms: CustomAlarm[]
  /** Mac wake-up series, when started. */
  armed: { wake: number } | null
  /** A one-off manual wake time for one night (Mac). */
  wakeOverride: { night: DateKey; at: number } | null
  /** Night for which he confirmed the phone alarms. */
  alarmsAck: DateKey | null
}

export const defaultSettings = (): Settings => ({
  dayName: '',
  nightName: '',
  planStart: '2026-11-09',
  startBed: 28 * 60,
  targetBed: 24 * 60,
  fastStep: 120,
  fastUntil: 26 * 60,
  holdNights: 2,
  slowStep: 30,
  bedTolerance: 15,
  sleepMin: 9 * 60,
  doseBefore: 60,
  dayDoseEarliest: 12 * 60,
  doseLateMin: 5 * 60,
  doseNotify: true,
  bedNagMin: 20,
  windDownBefore: 30,
  readyBy: [null, 730, 730, 730, 730, 730, null],
  prepMin: 40,
  leaveBefore: 10,
  phoneOffsets: [-15, -5, 0, 10, 15],
  macOffsets: [-20, -10, 0, 10, 15],
  ringMin: 5,
  pauseMin: 5,
  theme: 'auto',
})

export const emptyData = (): Data => ({
  v: 4,
  settings: defaultSettings(),
  doses: [],
  sleeps: [],
  notes: [],
  alarms: [],
  armed: null,
  wakeOverride: null,
  alarmsAck: null,
})
