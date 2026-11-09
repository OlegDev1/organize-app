# Progress

## Done
- Answers recorded in REQUIREMENTS.md.
- Svelte 5 + TS + Vite scaffold, PWA shell (manifest, icons, sw.js stamped at build).
- Core time math in `src/lib/`: plan (steps, graces, university cap), cycles, doses and warnings, home hero, phone alarms, Mac series, stats. Asserts: `npm test`.
- Screens: Сейчас (hero countdown + one action + timeline), Сон (tonight, phone alarms, plan, поблажка, stats), Дозы (two dose cards, stats, history), Заметки (auto date, copy all), Будильник (Mac series, own alarms, checklist), Настройки (names, sleep, university, alarms, theme, export/import, hidden restart).
- Mac alarm engine: Web Audio sounds (5), Wake Lock, full-screen overlay; verified with a fake clock (`tests/alarm.mjs`).
- Screenshots script: `tests/screens.mjs` (needs `vite preview` on :4173).

## Next
- Wait for his design pick (D–H shown); swap the palette in `src/app.css` (+ theme-color in App.svelte, manifest, icons).
- His fixes after testing on the phone.

## Decisions
- A "cycle" = the night's evening date D; it runs from 3 h before the planned wake on D to 3 h before the wake on D+1. Doses and sleeps store their cycle when logged.
- University cap: wake ≤ ready-by − getting ready − the largest positive alarm offset.
- Day dose allowed from actual night dose + 8 h (planned one if not logged).
- Palette D (paper + forest green), Inter; light by day, dark 20:00–08:00.
