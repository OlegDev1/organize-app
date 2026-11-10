# Analysis

Written 2026-11-10 from `CLAUDE.md`, `README.md`, `REQUIREMENTS.md`, `PROGRESS.md`, the attached `USER.md` and a read of `src/lib/` and the Android plugin.
Analysis only: no code was changed. Branch: `analysis`.

**Status for the next agent**
- [x] 1. Ten improvements
- [x] 2. Design: adaptive doses and sleep
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

## 2. Design: adaptive doses and sleep (no code yet)

Defaults marked **(Q n)** wait for the user's answer in section 3. Don't build those parts before he answers.

### What exists today
- Day dose: allowed from max(12:00, night dose + 8 h) (`dayDoseRule`). The night dose has no such rule: it is fixed at bedtime − 1 h.
- «Ложусь» (`goToBed`) only logs. The plan is strict: a late night changes nothing ("wake-up stays at …").
- Android gets a 7-day list of events with absolute times from `schedule.ts`; native only executes it.

### Rules
1. **Dose floor.** `floor = time of the last logged dose (any kind) + 8 h`. Elapsed time in epoch ms, not clock time and not tied to a cycle.
2. **Nothing about a dose before the floor:** no hero action, chip, timeline time, live card phase or notification.
3. Day dose from = max(12:00, floor). Night dose from = max(bedtime − `doseBefore`, floor).
4. After any dose is logged: "Next dose not before HH:MM" plus the time left.
5. **Went to bed** = the real bedtime of that night. `effective bed = real if logged and later than plan + tolerance, else planned`.
6. Next night: `planned bed = max(00:00, effective bed of the previous night − step)`. Wake = effective bed + 9 h, university cap unchanged.

### Data
- **No new stored state for the plan.** It is derived from `sleeps`: `makePlan(settings, graces, sleeps)`. So undo, export/import and reboot need nothing special, and past nights keep their history.
- `Settings`: `minGapMin` (480; replaces the `MIN_GAP` constant), `bedTolerance` (15). Step reuses `fastStep` / `fastUntil` / `slowStep`.
- `NativeEvent`: optional `dose: true` marker, used by the final guard (below).

### Logic and files
| File | Change |
|---|---|
| `plan.ts` | `bedMinutes(index)` (closed form) → walk forward night by night from `planStart`, using rules 5–6. `Night` gets `plannedBed` next to `bed` (effective); `nightDose`, `windDown`, `wake`, `cycleOf` follow the effective bed. |
| `today.ts` | New `doseFloor(data)` and `nightDoseFrom()`. `dayDoseRule`, `doseWarning`, `pickAction`, the rows and the hero use them. New hero state "Night dose not before HH:MM". New `bedNight()`: a bedtime belongs to the night whose planned bedtime is nearest and still has no finished sleep (fixes the 3-h boundary bug). The "late" hero stops saying the wake-up is unchanged. |
| `actions.ts` | `takeDose`: toast with the next "not before". `goToBed`: uses `bedNight()`; if the night dose is not logged and the floor has passed, asks "Night dose?" once. |
| `schedule.ts` | Night-dose live phases start at `nightDoseFrom`. Wake series, wind-down and bedtime events come from the effective plan. Add a dose notification at "not before" **(Q 12)**. Last step `guardDoses()`: any event marked `dose` earlier than the floor is moved to the floor. |
| `db.svelte.ts`, `model.ts` | The derived plan also depends on `db.sleeps`; two settings. |
| `Hero`, `Now`, `Doses`, `Sleep`, `Settings` | New texts; the plan list shows planned vs real and "00:00 on <date>"; settings for tolerance and step. |
| Android | Nothing for the main flow. `BootReceiver`: on a time zone change, also post "Time zone changed, open the app". |
| `tests/time.test.ts` | Asserts for rules 1–6, plus one invariant: for random logs, `buildEvents` has no dose event earlier than last dose + 8 h. |

### Edge cases
| Case | Handling |
|---|---|
| Late day dose | The floor moves; night dose from = floor. Before the tap, once the deadline (bedtime − 1 h − 8 h) has passed, the button already says "night dose moves to HH:MM". |
| Missed day dose | No log → the floor still comes from the last night dose, so the night dose stays on plan. The app does not decide whether a very late day dose should be skipped **(Q 10)**. |
| Night dose not logged | The floor is unknown. Default: assume the planned time, as today, and ask once in the morning "taken at bedtime / not taken" **(Q 11)**. |
| Night dose would land after bedtime | The dose is never moved earlier. Default: tonight's bedtime and wind-down are shown at the dose time (dose, then bed), and the hero says why **(Q 8)**. The real bedtime still comes from the button. |
| Dose really taken inside 8 h | Suggesting is forbidden; logging the truth is not. Default: strong confirm, then log; the floor counts from it **(Q 9)**. |
| Crossing midnight | Nights are keyed by the evening date and bedtimes are minutes after its midnight (may exceed 1440), so 23:00 dose / 00:00 bed is one night. The planned bed is clamped to ≥ 00:00. The floor uses epoch time and ignores dates. |
| Undo | Removing the record recomputes everything (derived plan) and re-syncs Android within 0.4 s. Add "Not asleep" to the asleep hero for 30 min. Pressing "Went to bed" again later overwrites the bedtime (already so). |
| Phone restart | Data is in `localStorage`; events are in `SharedPreferences` and `BootReceiver` re-arms them. The floor is already inside the event times, so it holds while the app is closed. |
| Time zone / DST | The 8 h gap is elapsed time: always correct. Plan times are wall-clock and are recomputed at the next JS sync; until then native alarms keep the old absolute times, hence the notification above **(Q 16)**. |
| Step back to 00:00 | Default: the existing 60 min per night down to 01:00, then 30 min. From 07:00 that is 8 nights. Dose times move with bedtime, ≤ 60 min per day **(Q 5)**. Up to 15 min late counts as on plan **(Q 7)**. An early night does not speed the plan up **(Q 6)**. |
| «Поблажка» | Redundant once the real bedtime moves the plan. Default: remove it; show the cost instead ("+2 days to 00:00") **(Q 4)**. |
| All-nighter, daytime sleep | `bedNight()` assigns it to the nearest planned night. Whether a 14:00 bedtime is "last night" or a nap is open **(Q 15)**. |
| Mac | It has no data from the phone, so its plan-based wake time is wrong after any late night **(Q 3)**. |

### What would make it more adaptive
- **Day-dose deadline** (improvement 2): the 8 h rule turned into "take by HH:MM".
- **Learn his delay.** If he lies down a median of N min after the bedtime alarm, start the wind-down N min earlier.
- **Adaptive step.** Three nights on plan → offer a bigger step. Two misses in a row → hold the bedtime for a night instead of failing again.
- **Use the real wake-up.** After a very late wake-up, warn early that tonight's bedtime is at risk and move the wind-down earlier.
- **Weekday awareness.** Before a university morning, the countdown shows the sleep he will actually get ("in bed now = 6 h 40 min of sleep").
- **Sleep rating feedback.** Several "bad" mornings in a row → suggest holding the step and add a line to the doctor report.
