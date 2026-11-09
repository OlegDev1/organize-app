import '@fontsource-variable/inter'
import './app.css'
import { mount } from 'svelte'
import App from './App.svelte'
import { db } from './lib/db.svelte.ts'
import { initNative, isNative } from './lib/native.svelte.ts'

mount(App, { target: document.getElementById('app')! })
initNative()

// The Android app ships its files inside the APK: no service worker there.
if (import.meta.env.PROD && !isNative && 'serviceWorker' in navigator) {
  // Old versions may have used another worker file: drop them, and their caches.
  navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const r of regs) {
      const url = (r.active ?? r.waiting ?? r.installing)?.scriptURL ?? ''
      if (!url.endsWith('/sw.js')) r.unregister()
    }
  })
  caches.keys().then((keys) => keys.filter((k) => k.startsWith('rezhim-v3')).forEach((k) => caches.delete(k)))

  const hadController = !!navigator.serviceWorker.controller
  navigator.serviceWorker.register('./sw.js')
  // A new release took over: reload once to show it, but never while an alarm waits
  // (a reload locks the audio until the next tap).
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !db.armed && !db.alarms.some((a) => a.on)) location.reload()
  })
}
