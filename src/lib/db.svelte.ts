import { defaultSettings, emptyData, type Data } from './model.ts'
import { makePlan, type Plan } from './plan.ts'

const KEY = 'rezhim-v4'

function isData(x: unknown): x is Partial<Data> & { v: 4 } {
  return typeof x === 'object' && x !== null && (x as { v?: unknown }).v === 4
}

/** Fills fields added in later versions with defaults. */
export function normalize(x: Partial<Data>): Data {
  return { ...emptyData(), ...x, settings: { ...defaultSettings(), ...x.settings } }
}

export function parseData(text: string): Data | null {
  try {
    const parsed: unknown = JSON.parse(text)
    return isData(parsed) ? normalize(parsed) : null
  } catch {
    return null
  }
}

function load(): Data {
  try {
    return parseData(localStorage.getItem(KEY) ?? '') ?? emptyData()
  } catch {
    return emptyData()
  }
}

export const db: Data = $state(load())

$effect.root(() => {
  $effect(() => {
    localStorage.setItem(KEY, JSON.stringify(db))
  })
})

const plan: Plan = $derived(makePlan($state.snapshot(db.settings), $state.snapshot(db.graces)))

export const getPlan = (): Plan => plan

export const uid = (): string => crypto.randomUUID()
