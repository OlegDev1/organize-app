# Analysis

Written 2026-11-10 from `CLAUDE.md`, `README.md`, `REQUIREMENTS.md`, `PROGRESS.md`, the attached `USER.md` and a read of `src/lib/` and the Android plugin.
Analysis only: no code was changed. Branch: `analysis`.

**Status for the next agent**
- [x] 1. Ten improvements
- [ ] 2. Design: adaptive doses and sleep
- [ ] 3. Questions for the user

Complexity: **S** = under an hour, **M** = a few hours, **L** = a day or more (native work can only be built by CI).

## 1. Ten improvements

| # | Feature | Benefit | Cx | Touches |
|---|---|---|---|---|
| 1 | **Firm bedtime stop.** At bedtime the phone rings as a full-screen alarm (like the wake-up), with «Лёг» and one short snooze, instead of a soft notification. | Bedtime is the point where stopping is hardest; a notification is easy to ignore. | M | `schedule.ts` (bed event `remind` → `alarm` + group), `AlarmActivity` (action buttons), `EventReceiver` |
| 2 | **Day-dose deadline.** While the day dose is open, show "take by HH:MM to keep tonight's bedtime" (= bedtime − `doseBefore` − 8 h) with a countdown. | Turns "any time after 12:00" into a real deadline; a late day dose is what pushes the whole evening. | S | `today.ts` (hero + row), `Doses.svelte` |
| 3 | **Log without opening the app.** Notification buttons (and later a home-screen widget) log the dose or bedtime natively; JS picks them up through `takeEvents`, as «Я встал» already does. | Today every button opens the WebView first. One tap from the lock screen, works even when the app is dead. | M–L | `Notifier`, `EventReceiver`, `Store`, `native.svelte.ts`, `actions.ts`; widget = new native code |
| 4 | **Leave-home countdown.** On university days the live card and hero count down to "leave at HH:MM" (ready-by + travel margin), not only "be ready". | The last-minute rush is about leaving, not about being ready. | S–M | `model.ts` (one setting), `plan.ts` (`uni.leave`), `today.ts`, `schedule.ts` |
| 5 | **"Took it earlier" correction.** After logging, the toast offers −5 / −15 / −30 / −60 min. | A late tap makes the 8 h gap wrong by the same amount. Keeps one-tap logging; no time picker. | S | `actions.ts`, `Toast.svelte` |
| 6 | **Morning repair of missed logs.** If last night has no night dose or no bedtime, ask once after waking: "Night dose? Taken at bedtime / Not taken". | The app never has to guess. Today an unlogged night dose is silently assumed taken at the planned time. | S–M | `today.ts`, `Now.svelte`, `actions.ts` |
| 7 | **Automatic backup.** A daily JSON copy to phone storage, plus "restore last backup". | All data lives in WebView storage. While APKs are signed with a throwaway key, an update means reinstall = everything lost. | M | Capacitor Filesystem (or a small method in `RezhimPlugin`), `Settings.svelte` |
| 8 | **Alarm health check on the home screen.** A red banner if tonight's alarm may not ring: missing permission, battery optimisation on, alarm volume 0. Otherwise a quiet "Next alarm 08:45 ✓". | He trusts the alarm with being on time; failures should be visible before sleep, not after. The check exists but is hidden on the alarm screen. | S–M | `RezhimPlugin.status` (battery, volume, next alarm), `Now.svelte` |
| 9 | **Days to target + weekly review.** "At this pace: 00:00 on Nov 16", nights on plan this week, average night→day gap, bedtime trend. Also added to the doctor report. | Shows the cost of a late night in days, and gives progress a visible shape. | S | `stats.ts`, `Sleep.svelte`, `report.ts` |
| 10 | **Wake-up proof.** «Я встал» needs a small task (hold 10 s, or scan a QR code placed away from the bed). Optional. | Stops dismissing the alarm half-asleep and sleeping on. | M | `AlarmActivity` (+ camera for QR), `Settings.svelte` |

Also worth doing while touching the code (not features):
- `goToBed` uses `activeCycle`, whose boundary is 3 h before the planned wake. A bedtime later than that is logged to the **next** night. Section 2 fixes it.
- `doseOf` takes the earliest dose of a cycle, `dayDoseRule` the latest of the previous cycle. The 8 h rule should look at the last dose by time, not by cycle (section 2).
- The docs disagree with each other and with `USER.md` (language, PWA vs native). See the questions.
