# Progress

## Done
- Answers recorded in REQUIREMENTS.md.
- Svelte 5 + TS + Vite scaffold, PWA shell (manifest, icons, sw.js stamped at build).
- Core time math in `src/lib/`: plan (steps, graces, university cap), cycles, doses and warnings, home hero, phone alarms, Mac series, stats. Asserts: `npm test`.
- Screens: Сейчас (hero countdown + one action + timeline), Сон (tonight, phone alarms, plan, поблажка, stats), Дозы (two dose cards, stats, history), Заметки (auto date, copy all), Будильник (Mac series, own alarms, checklist), Настройки (names, sleep, university, alarms, theme, export/import, hidden restart).
- Mac alarm engine: Web Audio sounds (5), Wake Lock, full-screen overlay; verified with a fake clock (`tests/alarm.mjs`).
- Screenshots script: `tests/screens.mjs` (needs `vite preview` on :4173).

- Day dose: not before 12:00 and ≥ 8 h after the actual night dose (`dayDoseRule`).
- Android app (Capacitor 8, `android/`): native plugin `RezhimPlugin` with exact alarms (`setAlarmClock`), alarm service + full-screen alarm, reminders, live sleep notification (chronometer, promoted on Android 16), notification actions, reboot rescheduling. JS side: `schedule.ts` + `native.svelte.ts`. CI builds the APK into the `android` release.
- Doctor report (Notes), «Как спал?» card, README.md for agents.

## Next
- He adds the signing secrets (`ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORD`), then re-run the Android workflow. Until then APKs use a throwaway key.
- Wait for his design pick (D–H shown); swap the palette (see README → Common changes).
- His fixes after testing the APK on the phone (not tested on a real device yet).

## Decisions
- A "cycle" = the night's evening date D; it runs from 3 h before the planned wake on D to 3 h before the wake on D+1. Doses and sleeps store their cycle when logged.
- University cap: wake ≤ ready-by − getting ready − the largest positive alarm offset.
- Day dose allowed from actual night dose + 8 h (planned one if not logged).
- Palette D (paper + forest green), Inter; light by day, dark 20:00–08:00.
- Android: one 7-day event list from JS replaces everything on each change; native only executes. Alarm groups per night; «Я встал» dismisses the group and reports the wake-up back.
- Signing key is never committed (public repo); it comes from GitHub secrets.
