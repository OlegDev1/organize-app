/** Wall clock that ticks on each whole second. */
export const clock = $state({ now: Date.now() })

const tick = () => (clock.now = Date.now())

setTimeout(() => {
  tick()
  setInterval(tick, 1000)
}, 1000 - (Date.now() % 1000))

document.addEventListener('visibilitychange', tick)
