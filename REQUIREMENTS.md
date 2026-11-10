# Rezhim: what the user needs

Written on 2026-11-09 from the user's own words.
- This is a list of needs and rules, not a design.
- How to build it, which screens, what goes where, the order of work: you decide.
- The previous version was deleted: it was confusing, ugly, had the wrong logic and ignored his requests.
- Start from zero. There is no old data to migrate.

## Why
- He wants to:
  - get his sleep schedule back;
  - take his two daily doses on time and never twice;
  - wake up on time;
  - keep notes for his doctor.
- He can't start things until they are urgent (see USER.md). The app should make things feel urgent early:
  - one clear next action;
  - a live countdown with seconds;
  - big buttons;
  - nothing extra.

## Devices
- Android phone (main): logs doses and notes, sets the phone's alarms.
- MacBook with Chrome: rings the morning alarms.
- The two are not synced, but the Mac still needs to know the right wake time.

## Sleep
- Now:
  - he went to bed at 07:00 this morning (Nov 9);
  - tonight he wants to go to bed at 04:00.
- Bedtime moves earlier step by step until the target, then stays there. The step and the target are open point 1.
- His bedtimes are after midnight, as late as 07:00.
- He wants to see clearly when to go to bed and how much time is left.
- The plan must be strict.
  - He fears that easy adjustments become an excuse («поблажка») and that he will stop following the plan.
  - But he will sometimes break it, and the app must handle that (open point 2).
- «Быть готовым к»: on university days he must be ready by 12:10. He wants to know when to wake up and when to start getting ready.

## Meds
- Two doses: day and night. He types the medication names in the app; they stay on the device.
- Night dose: before sleep. Today he said 1 h before bedtime, so tonight at 03:00.
- Day dose:
  - usually 12:00–14:00;
  - his rule: at least 8 h after the night dose, ideally 8–9 h.
- Never twice. Warn him if a dose is too early or already taken.
- One tap logs the current time. No manual time entry.
- He wants:
  - to see at a glance how much time is left until the next dose;
  - a history by day (day and night dose times), with pretty, clear statistics.

## Alarms
- **Phone:**
  - he sets normal repeating phone alarms himself, 3–4 in the morning;
  - the app tells him which times to set, and when to change them while the plan moves.
- **Mac:**
  - in the evening he opens the Mac, turns on the anti-sleep app, opens the site and starts the alarm;
  - in the morning it rings from the Chrome tab.
- **Wake-up series:**
  - several alarms around the wake time (e.g. −30, −20, −10, 0, +10, +15 min);
  - each rings about 4 min, then 1 min of silence;
  - different sounds, so he really wakes up;
  - «Я встал» stops them all.
- **Custom alarms:** he also wants to set his own.
- **Chrome:** Memory Saver is set to Optimal. See the limits in CLAUDE.md.

## Doctor notes
- Quick notes, with the date and time added automatically.
- He can see all of them and copy them all as text.

## Statistics
- He wants statistics on sleep and doses (what exactly: open point 5).

## Look and feel
- Looks matter a lot. The old version was ugly and hard to understand.
- He wants it:
  - beautiful and calm;
  - clear in 2 seconds and readable at night;
  - smooth and fast.
- Big phone first. The Mac (alarm) view must look good too.
- He'd like to see a few design references to pick a direction.

## Open points (ask him)
1. **Step and target.**
   - Today he said:
     - 1 h earlier per night: 04:00 → 03:00 → 02:00 → 01:00;
     - target bedtime 01:00, night dose 00:00.
   - His earlier notes said:
     - 30 min per night;
     - target: sleep 00:00, wake 08:00, night dose 23:00, day dose 12:00;
     - dose times move 30 min per day, never abruptly.
   - Which one?
2. **Breaking the plan.**
   - An earlier idea:
     - a late night doesn't move the plan: he wakes at the planned time anyway;
     - plus 1 «поблажка» per 7 days:
       - "repeat today's times";
       - or "rebuild from my real bedtime";
     - each needs a one-tap reason;
     - a hard-to-reach emergency restart, after which there is no «поблажка» for 14 days.
   - Today he said the old logic was wrong. Keep this idea, make it simpler, or drop it?
3. **Everyday tasks.** His earlier notes wanted help with everyday tasks too (a "what to do now" flow). Today he didn't pick tasks. Add them or not?
4. **Wake time.**
   - Bedtime + 8 h, or from «Быть готовым к» minus the getting-ready time?
   - How long does getting ready take?
   - Which days have university?
5. **Statistics.** Which ones?
6. **Reminders** for doses and bedtime: phone alarms, or only the countdown in the app?
7. **Wind-down:** a reminder before bed (e.g. 30 min: teeth, phone away)?
8. **Look:** dark theme? Any apps he likes the look of?

## Answers
Given by voice on 2026-11-09. Items marked "default" were unclear or left open; the default was used and told to him.

1. **Step and target:** 1 h per night until 01:00, then 30 min per night until 00:00, then it stays. Tonight 04:00 → 03:00 → 02:00 → 01:00 → 00:30 → 00:00.
2. **Doses vs step:** "not that critical". The night dose is 1 h before bedtime and moves with it. The day dose is allowed once ≥ 8 h have passed since the actual night dose.
3. **Sleep length:** 9 h (8.5–9).
4. **Wake time:** bedtime + 9 h. On university days, wake-up is capped so he is never late: latest wake = «Быть готовым к» − 40 min getting ready − the last positive alarm offset (15 min), so even the last alarm rings before getting ready starts. Being on time beats sleeping enough.
5. **University:** «Быть готовым к» is almost always 12:10. Getting ready takes 40 min. Days were not named: default Mon–Fri, editable in settings.
6. **Conflict:** being on time wins (he must never be late).
7. **Breaking the plan:** unsure. Default: strict. A late night doesn't move the plan. Plus 1 «поблажка» per 7 days: "repeat yesterday's times", no reason asked. A plan restart is hidden in settings.
8. **Day dose time:** no fixed time. Allowed from night dose + 8 h.
9. **Night dose "too early":** he didn't understand the question. Default: warn if > 30 min before the planned time, or if it is already taken.
10. **Logging:** one button per dose (day, night).
11. **Mac series:** −20, −10, 0, +10, +15 min. Each rings 5 min, then 5 min of silence. After the last one, the 5/5 cycle repeats until «Я встал». Different sounds.
12. **Phone alarms (morning):** 5 of them: −15, −5, 0, +10, +15.
13. **Mac wake time:** no link. The Mac computes the same plan itself (same defaults). It also allows a one-off manual change.
14. **Custom alarms:** on the Mac. On the phone he also wants an alarm before leaving home ("just in case"): on university days the app suggests «собираться» and «выходить через 10 мин».
15. **Look:** likes D (light by day, dark at night; calm paper + forest green, Inter). Asked for more D-like variants: shown D–H, pick pending.
16. **Statistics:** default set: bedtime (plan vs actual), sleep length, dose times, night→day gap, streak of nights on plan. He agreed to tap «Ложусь» and «Встал» on the phone.
17. **Reminders:** none for doses (the countdown is enough). Bedtime: yes, as a phone alarm the app tells him to set.
18. **Wind-down:** a reminder about 30 min before bedtime (a phone alarm, plus a «Готовься ко сну» state in the app). No checklist.
19. **Everyday tasks:** no. Focus on doing the core well.

## Later requests (2026-11-09, 14:53)
- **Day dose:** he takes it at 12:00 or later. If < 8 h passed since the logged night dose, the dose moves to the nearest time 8 h after it.
- **README:** a short guide so another agent understands the project and how to work with it fast.
- **Alarms follow the plan:** when the wake time moves (e.g. 1 h earlier), the main alarm and all the ± alarms move with it.
- **Android app (Capacitor):** real alarms that work like the phone's clock, and a special sleep notification that stays on screen, inspired by the Dynamic Island.
- **Own ideas welcome:** add useful features. Added: doctor report (7/14/30 days), «Как спал?» after waking, «Я встал» on the alarm marks the wake-up, buttons on the live notification (Принял ночную / Ложусь / Я встал).

## Answers (2026-11-10): adaptive doses and sleep
Given by voice to the questions in `docs/ANALYSIS.md`. "Decided" = he was unsure or said "you decide".

1. **Language:** UI in Russian. Everything else (chat, code, docs) in English.
2. **Platform:** keep Capacitor. Phone only.
3. **Mac alarm:** not needed. Remove it.
4. **Plan vs real bedtime:** unsure. He needs a reason to go to bed on time, but the app must stay usable after a late night. Decided: «Лёг» is the real bedtime and a late night moves the plan (it restarts from the real bedtime); the screen shows what it costs in days, without punishing. «Поблажка» is removed (redundant).
5. **Step:** as fast as possible to about 02:00 (up to 120 min per night), stay there "a couple of days", then slower to 00:00. He asked for a separate module that computes the schedule from his preferences. Decided: 120 min per night down to 02:00, 2 nights at 02:00, then 30 min per night; all in settings.
6. **Early night:** does not speed the plan up. Never plan earlier than 00:00.
7. **Tolerance:** 15 min late still counts as on plan.
8. **Wake-up:** real bedtime + 9 h, the university cap still wins. Nothing bad happens if he doesn't tap «Встал». The weekend idea ("an hour later, up within 11 h") was unclear: open.
9. **Bedtime in the daytime (e.g. 14:00):** a (very late) bedtime, not a nap.
10. **Night dose would land after bedtime:** bedtime waits for the dose.
11. **Dose taken before 8 h passed:** warn strongly, then log.
12. **Day dose late:** if it is still not taken about 5 h after it became allowed: a few notifications, then a red screen until he takes it.
13. **Night dose not logged:** he takes it right before sleep, so «Лёг» also counts as the night dose. If he forgot «Лёг», after waking he says when he went to bed, and that counts as the dose too.
14. **Dose notifications:** yes, with a switch in settings.
15. **"Took it earlier" buttons:** only if it stays small. Not built yet.
16. **Time zones:** he doesn't travel. Nothing special.
17. **Improvements:** all fine except the wake-up proof (no camera permission; skip for now). He also wants other things that help him start and stop on time; the agent decides.
18. **Bedtime screen:** it must be closable (he may not be at home). Until he taps «Лёг» it comes back every 20 min with a notification sound. It does not ring like an alarm.
