# Rezhim

A personal app for one person: get the sleep schedule back step by step, take two daily doses on time and never twice, wake up on time, keep notes for the doctor. UI in Russian, everything else in English.

- **Phone (main):** Android app (Capacitor) with real alarms and a live notification. The same app runs as a PWA too.
- **Mac:** the website rings the morning alarm from a Chrome tab.
- **Web:** https://olegdev1.github.io/organize-app/
- **APK:** https://github.com/OlegDev1/organize-app/releases/download/android/rezhim.apk

## Read first

| File | What |
|---|---|
| `CLAUDE.md` | Rules for working here: stack, style, privacy, checks. |
| `REQUIREMENTS.md` | What the user needs, plus his answers. The source of truth for logic. |
| `PROGRESS.md` | Done / next / decisions. Resume from it. |
| `USER.md` | Private context. The user attaches it in chat. Never commit it. |

## Run

```sh
npm ci
npm run dev              # http://localhost:5173
npm test                 # time-math asserts (TZ=Europe/Madrid)
npm run check            # svelte-check + tsc, must be 0 errors
npm run build            # dist/, also stamps dist/sw.js

# One-off checks (need `npx vite preview --port 4173` running):
TZ=Europe/Madrid node tests/screens.mjs /tmp/shots   # screenshots at 360 px and desktop
TZ=Europe/Madrid node tests/alarm.mjs                # Mac alarm series with a fake clock
```

Headless Chrome is `/usr/bin/google-chrome` (`playwright-core`, no browser download).

## Deploy

- **Web:** a push to `main` → `.github/workflows/pages.yml` → GitHub Pages. Pushes that change only `*.md` or `docs/**` don't deploy.
- **Android:** the same push → `.github/workflows/android.yml` → builds the APK and replaces the `android` release.
  - The Android SDK and Maven are not reachable from the agent sandbox, so CI is the only build. Read its logs with `gh run view <id> --log-failed`.
  - Signing: the `ANDROID_KEYSTORE_B64` and `ANDROID_KEYSTORE_PASSWORD` secrets (alias `rezhim`).
    - Without them the APK is signed with a throwaway debug key and can't update an installed app.
    - Never commit a keystore.
  - `versionCode` = CI run number.

## Layout

```
src/
  lib/                pure logic (no Svelte, testable with node)
    time.ts           date keys, wall-clock math (DST-safe), formatting
    model.ts          data types + defaults (Settings, Dose, Sleep, Note, CustomAlarm)
    plan.ts           the sleep plan: bedtime per night, wake (university cap), «поблажка», cycles
    today.ts          home screen: active day, hero (countdown + one action), timeline, dose rules, phone alarm list
    stats.ts          sleep and dose statistics
    series.ts         Mac wake-up series timing (ring/pause/loop)
    schedule.ts       events for the Android app (alarms, reminders, live card phases)
    report.ts         text report for the doctor
    actions.ts        user actions that change data (dose, bed, wake, notes, grace), with confirm + undo
  lib/*.svelte.ts     reactive state (runes)
    db.svelte.ts      the whole data object, persisted to localStorage `rezhim-v4`; getPlan()
    clock.svelte.ts   ticking `clock.now`
    ui.svelte.ts      tab, toast, confirm sheet
    alarm.svelte.ts   Mac alarm engine (Web Audio via sound.ts, Wake Lock)
    native.svelte.ts  Capacitor bridge: sync schedule, notification actions, wake from native alarm
  screens/            Now, Sleep, Doses, Notes, AlarmScreen, Settings
  components/         Hero, Timeline, PhoneAlarms, charts, Sheet, Toast, AlarmOverlay
android/app/src/main/java/io/github/olegdev1/rezhim/
  RezhimPlugin        JS bridge: schedule, status, openSettings, testAlarm, takeEvents, "action" events
  Scheduler, Store    AlarmManager scheduling (setAlarmClock for alarms), SharedPreferences
  EventReceiver       fires events; «Я встал» (dismiss group)
  BootReceiver        reschedules after reboot / time change
  AlarmService        foreground service: alarm-stream sound, louder over time, vibration
  AlarmActivity       full-screen alarm over the lock screen
  Notifier            channels, live card (chronometer; promoted on Android 16), reminders
```

## Core concepts

- **Night key D:** the evening date. Bedtime is stored as minutes after midnight of D (04:00 next day = 1680). The planned wake is on D+1.
- **Cycle (the day he lives):**
  - Runs from 3 h before the planned wake of night D−1 to 3 h before the wake of night D.
  - `activeCycle` also starts the next day at once after «Встал».
  - Doses and sleeps store their cycle (night key) when logged.
- **Plan:**
  - Starts at `planStart` / `startBed`.
  - Moves 60 min per night while later than `fastUntil` (01:00), then 30 min, until `targetBed` (00:00).
  - Each «поблажка» repeats the previous night (once per 7 days).
  - A late night doesn't move the plan.
- **Wake:**
  - Bedtime + `sleepMin` (9 h).
  - On university mornings, capped at ready-by − getting ready − the largest positive alarm offset. That way the last alarm still rings before getting ready.
- **Doses:**
  - Day dose: not before `dayDoseEarliest` (12:00) and ≥ 8 h after the actual night dose. Night dose: 1 h before bed.
  - Too early or already taken → the app asks once more. One tap = now; no manual time entry.
- **Hero:** one countdown and one primary action, picked by `computeToday` (asleep → morning → university getting ready → day dose wait → bedtime → late).
- **Android events** (`schedule.ts` → `Rezhim.schedule`):
  - Kinds: `alarm`, `remind`, `live`, `clear`.
  - Alarms share a `group` (`wake-<night>`). «Я встал» cancels the group and tells the web app (logged as the wake-up).
  - The JS side re-sends 7 days of events on every data change, on resume and every 30 min.
- **Mac alarm:** works only while the tab is alive and audio is unlocked by a tap. A reload is never forced while an alarm is armed.

## Common changes

- **Colours / theme:**
  - CSS variables at the top of `src/app.css`, light and `[data-theme='dark']`.
  - Also update theme-color in `App.svelte`, `index.html`, `public/manifest.webmanifest`, icons, and `ACCENT` in `Notifier.java`.
- **Plan rules:** `plan.ts` + defaults in `model.ts`. Add asserts in `tests/time.test.ts`.
- **What the phone rings / notifies:** `schedule.ts` only; the native side just executes events.
- **New setting:**
  - Add it to `Settings` + `defaultSettings()`. `normalize()` fills it in for old data.
  - Edit it in `screens/Settings.svelte`.
- **PWA release:** nothing to do. The build stamps a new cache name into `sw.js`, which removes old caches (incl. `rezhim-v3-*`).

## Gotchas

- The repo is public. Medication names and health data stay on the device only.
- Phone and Mac are not synced. Both compute the same plan from the same defaults. Data moves only through export/import (Settings → Данные).
- The web and Android app also have separate storage.
- Svelte 5 runes only. Shared state lives in `*.svelte.ts`. Imports use `.ts` extensions, so node can run `src/lib` directly.
