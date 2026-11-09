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
(Write his answers here.)
