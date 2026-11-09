// Android app (Capacitor): keeps the native alarms and the live notification in step with the plan.
// On the web (Mac) none of this runs.
import { Capacitor, registerPlugin, SystemBars, SystemBarsStyle, type PluginListenerHandle } from '@capacitor/core'
import { goToBed, takeDose, wakeUp, wakeUpAt } from './actions.ts'
import { db, getPlan } from './db.svelte.ts'
import type { Data } from './model.ts'
import { buildEvents, type NativeAction, type NativeEvent } from './schedule.ts'
import { go } from './ui.svelte.ts'

export const isNative = Capacitor.isNativePlatform()

export interface NativeStatus {
  notifications: boolean
  exact: boolean
  fullScreen: boolean
  promoted: boolean
  sdk: number
}

type Setting = 'notifications' | 'exact' | 'fullScreen'

interface RezhimPlugin {
  schedule(o: { events: NativeEvent[] }): Promise<void>
  takeEvents(): Promise<{ events: { type: string; at: number; night: string }[] }>
  status(): Promise<NativeStatus>
  requestNotifications(): Promise<void>
  openSettings(o: { which: Setting }): Promise<void>
  testAlarm(o: { seconds: number }): Promise<void>
  addListener(event: 'action', fn: (d: { action: NativeAction }) => void): Promise<PluginListenerHandle>
}

const Rezhim = registerPlugin<RezhimPlugin>('Rezhim')

export const native = $state({ status: null as NativeStatus | null })

export async function refreshStatus() {
  native.status = await Rezhim.status()
}

export const openSettings = (which: Setting) => Rezhim.openSettings({ which })

export const testAlarm = () => Rezhim.testAlarm({ seconds: 10 })

export function setSystemBars(dark: boolean) {
  if (isNative) void SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light })
}

let syncTimer: ReturnType<typeof setTimeout> | undefined

/** Sends the next 7 days of alarms, reminders and live-card phases (debounced). */
function sync() {
  clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    const data = $state.snapshot(db) as Data
    void Rezhim.schedule({ events: buildEvents(getPlan(), data, Date.now()) })
  }, 400)
}

/** «Я встал» pressed on the native alarm while the app was closed: log the wake-up. */
async function takeEvents() {
  const { events } = await Rezhim.takeEvents()
  for (const e of events) if (e.type === 'woke') wakeUpAt(e.at, e.night)
}

function runAction(action: NativeAction) {
  go('now')
  if (action === 'day' || action === 'night') void takeDose(action)
  else if (action === 'bed') goToBed()
  else wakeUp()
}

export function initNative() {
  if (!isNative) return
  void Rezhim.requestNotifications().then(refreshStatus)
  void Rezhim.addListener('action', ({ action }) => runAction(action))
  void takeEvents()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    void takeEvents()
    void refreshStatus()
    sync()
  })
  $effect.root(() => {
    $effect(() => {
      JSON.stringify(db) // any change in the data
      sync()
    })
  })
  // The window of 7 days moves on even if nothing changes.
  setInterval(sync, 30 * 60_000)
}
