export type Tab = 'now' | 'sleep' | 'doses' | 'notes' | 'alarm'

const TAB_KEY = 'rezhim-v4-tab'
const tabs: Tab[] = ['now', 'sleep', 'doses', 'notes', 'alarm']

function initialTab(): Tab {
  const saved = localStorage.getItem(TAB_KEY)
  if (saved && (tabs as string[]).includes(saved)) return saved as Tab
  // The Mac is opened to ring the alarm; the phone to see what's next.
  return matchMedia('(min-width: 900px)').matches ? 'alarm' : 'now'
}

interface Toast {
  id: number
  text: string
  undo?: () => void
}

interface Ask {
  title: string
  text: string
  ok: string
  cancel: string
  danger?: boolean
  resolve: (ok: boolean) => void
}

export const ui = $state({
  tab: initialTab(),
  settings: false,
  toast: null as Toast | null,
  ask: null as Ask | null,
})

export function go(tab: Tab) {
  ui.tab = tab
  ui.settings = false
  localStorage.setItem(TAB_KEY, tab)
  scrollTo({ top: 0 })
}

let toastTimer: ReturnType<typeof setTimeout> | undefined

export function toast(text: string, undo?: () => void) {
  clearTimeout(toastTimer)
  ui.toast = { id: Date.now(), text, undo }
  toastTimer = setTimeout(() => (ui.toast = null), undo ? 7000 : 3000)
}

export function ask(opts: Omit<Ask, 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => {
    ui.ask = { ...opts, resolve }
  })
}

export function answer(ok: boolean) {
  ui.ask?.resolve(ok)
  ui.ask = null
}

export const buzz = () => navigator.vibrate?.(12)
