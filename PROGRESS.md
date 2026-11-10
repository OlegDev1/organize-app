# Progress

**Work branch: `adaptive`** (from `main` on 2026-11-10). Resume here. Merge into `main` only when the checks at the bottom pass.
Design and reasons: `docs/ANALYSIS.md`. User's answers: `REQUIREMENTS.md` → "Answers (2026-11-10)".

## Plan for this branch
- [x] 0. Docs: answers recorded, `CLAUDE.md` fixed (English chat, phone only, work branch).
- [ ] 1. `plan.ts`: adaptive plan derived from real bedtimes; remove «поблажка»; asserts.
- [ ] 2. `today.ts` / `actions.ts`: 8 h dose floor for both doses, "next dose not before", bedtime waits for the dose, late day dose = red, «Лёг» also logs the night dose, bedtime assigned to the right night.
- [ ] 3. `schedule.ts`: events from the adaptive plan, dose notifications (switch), bedtime reminder every 20 min until «Лёг», guard: no dose event before the floor.
- [ ] 4. Screens: Sleep (plan list, cost in days), Settings (new fields), texts.
- [ ] 5. Remove the Mac alarm (screen, engine, sounds test, settings).
- [ ] 6. After waking without «Лёг»: ask when he went to bed (also counts as the night dose).
- [ ] 7. Checks: `npm test`, `npm run check`, `npm run build`, screenshots once. Then merge into `main`.

## Not started (ideas, in order of value)
- Day-dose deadline in the hero ("take by HH:MM to keep tonight's bedtime"): partly covered by step 2.
- Log from the notification without opening the app; automatic backup; alarm health banner on the home screen; "took it earlier" buttons; leave-home countdown. See `docs/ANALYSIS.md` section 1.

## Decisions
- See "Answers (2026-11-10)". Earlier decisions (cycle, university cap, palette, Android event list, signing) still hold; the old progress is in git history.

## Open questions for the user
1. Weekends: should nights before free days be allowed 1 h later? What did "wake up within 11 h" mean?

## Before this branch (done earlier)
- Svelte 5 + TS + Vite app, Capacitor Android shell with native alarms, live notification, reboot rescheduling; screens Now / Sleep / Doses / Notes / Alarm / Settings; doctor report; CI builds the APK. Not yet tested on a real phone. Signing secrets may still be missing (then the APK can't update an installed app).
