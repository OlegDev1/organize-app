# Progress

**Work branch: `adaptive`** (from `main` on 2026-11-10). Resume here. Merge into `main` only when the checks at the bottom pass.
Design and reasons: `docs/ANALYSIS.md`. User's answers: `REQUIREMENTS.md` → "Answers (2026-11-10)".

## Plan for this branch
- [x] 0. Docs: answers recorded, `CLAUDE.md` fixed (English chat, phone only, work branch).
- [x] 1. `plan.ts`: adaptive plan derived from real bedtimes; remove «поблажка»; asserts.
- [x] 2. `today.ts` / `actions.ts`: 8 h dose floor for both doses, "next dose not before", bedtime waits for the dose, late day dose = red, «Лёг» also logs the night dose, bedtime assigned to the right night.
- [x] 3. `schedule.ts`: events from the adaptive plan, dose notifications (switch), bedtime reminder every 20 min until «Лёг», guard: no dose event before the floor.
- [x] 4. Screens: Sleep (plan list, cost in days), Settings (new fields), texts.
- [ ] 5. Remove the Mac alarm (screen, engine, sounds test, settings).
- [x] 6. After waking without «Лёг»: ask when he went to bed (also counts as the night dose).
- [x] 7. Checks passed on 2026-11-10 (`npm test`, `npm run check` 0 errors, build, screenshots, no console errors) and merged into `main`. The Java change (buttons on reminder notifications, `Notifier.remind`) was not compiled locally: check the Android CI run.

## Where I stopped (2026-11-10 05:45, user's limit)
- Steps 0–4, 6, 7 are done and merged. **Next: step 5** (remove the Mac alarm: `AlarmScreen.svelte` Mac parts, `alarm.svelte.ts`, `AlarmOverlay.svelte`, `sound.ts`, `seriesAt` in `series.ts` (keep `SOUNDS`), `tests/alarm.mjs`, `macOffsets` / `armed` / `wakeOverride` / `alarmsAck` in `model.ts`, the Mac field in Settings, the web-only `PhoneAlarms` ack in `Now.svelte`, Mac shots in `tests/screens.mjs`). Keep own alarms and the permission check.
- Then update `README.md` "Core concepts" (Plan, Doses, Mac) to match `plan.ts` / `today.ts`.
- Not tested on a real phone. Things to watch there: reminder buttons, the 20-min bedtime reminder sound, the number of scheduled alarms (asserted < 400).

## How it works now (short)
- `plan.ts`: planned bedtime per night is walked forward from `planStart`. A real bedtime later than plan + `bedTolerance` (15) restarts the walk from it: `fastStep` (120) per night down to `fastUntil` (02:00), `holdNights` (2) there, then `slowStep` (30) to `targetBed`. Early nights don't speed it up. Wake = real (else planned) bedtime + 9 h, university cap.
- `today.ts`: `doseFloor` = last dose + 8 h (`MIN_GAP`, a constant, not a setting). `nightFor()` = plan night with the floor applied (night dose pushed, bedtime waits). `dayDoseWindow()` = from / deadline / lateAt. `activeCycle()` stays on last night while he is up with nothing logged; `bedNight()` picks the night for «Лёг» and the night dose. `hero.alert` = red screen (up after bedtime, day dose overdue).
- `actions.ts`: «Лёг» logs the bedtime and the night dose; `notAsleep` undoes it for 30 min; `setBedtime` backfills after waking.
- `schedule.ts`: dose reminders (setting `doseNotify`), bedtime reminder every `bedNagMin` (20) for 6 h for the two nearest nights, final guard that moves any `dose` event to the floor.

## Not started (ideas, in order of value)
- Day-dose deadline in the hero ("take by HH:MM to keep tonight's bedtime"): partly covered by step 2.
- Log from the notification without opening the app; automatic backup; alarm health banner on the home screen; "took it earlier" buttons; leave-home countdown. See `docs/ANALYSIS.md` section 1.

## Decisions
- See "Answers (2026-11-10)". Earlier decisions (cycle, university cap, palette, Android event list, signing) still hold; the old progress is in git history.

## Open questions for the user
- None. Latest answers: `REQUIREMENTS.md` answers 19–21.

## Still to build from his answers (after step 5)
- Weekend allowance (answer 19): nights before free days may be up to 1–2 h later than plan without restarting it (a setting, default 60 min).
- Wake-up check-in (answer 20): a gentle reminder if «Встал» is not tapped 11 h after «Лёг».
- "Took it earlier" buttons after logging a dose, only if it stays small (answer 15).
- The improvements he accepted in `docs/ANALYSIS.md` section 1: log from the notification without opening the app (3), leave-home countdown (4), automatic backup (7), alarm health banner on the home screen (8), days to target + weekly review (9). Not the wake-up proof (10).
- Anything else that helps him start and stop on time (see the attached `USER.md` → "What this means for the app"); the agent decides.

## Before this branch (done earlier)
- Svelte 5 + TS + Vite app, Capacitor Android shell with native alarms, live notification, reboot rescheduling; screens Now / Sleep / Doses / Notes / Alarm / Settings; doctor report; CI builds the APK. Not yet tested on a real phone. Signing secrets may still be missing (then the APK can't update an installed app).
