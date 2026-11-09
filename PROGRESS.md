# Progress

## Done
- Answers recorded in REQUIREMENTS.md.
- Svelte 5 + TS + Vite scaffold, PWA shell (manifest, icons, sw.js stamped at build).
- Core time math in `src/lib/`: plan (steps, graces, university cap), cycles, doses and warnings, home hero, phone alarms, Mac series, stats. Asserts: `npm test`.

## Next
- Screens: Сейчас, Сон, Дозы, Заметки, Будильник, Настройки.
- Mac alarm engine (Web Audio, Wake Lock), checks, deploy.

## Decisions
- A "cycle" = the night's evening date D; it runs from 3 h before the planned wake on D to 3 h before the wake on D+1. Doses and sleeps store their cycle when logged.
- University cap: wake ≤ ready-by − getting ready − the largest positive alarm offset.
- Day dose allowed from actual night dose + 8 h (planned one if not logged).
- Palette D (paper + forest green), Inter; light by day, dark 20:00–08:00.
